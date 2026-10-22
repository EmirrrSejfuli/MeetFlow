import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { TimeSlot } from './entities/time-slot.entity';

export type AvailableSlot = TimeSlot & {
  available: boolean;
  unavailableReason?: 'google-calendar' | 'calendar-unavailable';
};

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(TimeSlot)
    private readonly slotsRepository: Repository<TimeSlot>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(dto: CreateSlotDto): Promise<TimeSlot> {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('The start time must be a valid future date');
    }

    const slot = this.slotsRepository.create({ startsAt, durationMinutes: dto.durationMinutes });
    try {
      return await this.slotsRepository.save(slot);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const databaseError = error.driverError as { code?: string; constraint?: string };
        if (databaseError.code === '23P01' && databaseError.constraint === 'EX_time_slots_no_overlap') {
          throw new ConflictException('The selected time overlaps with an existing slot.');
        }
      }
      throw error;
    }
  }

  // Booked slots are hidden; Google Calendar conflicts are shown as unavailable.
  async findAvailable(): Promise<AvailableSlot[]> {
    const slots = await this.slotsRepository
      .createQueryBuilder('slot')
      .where('slot.starts_at > :now', { now: new Date() })
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM bookings booking WHERE booking.slot_id = slot.id
      )`)
      .orderBy('slot.starts_at', 'ASC')
      .getMany();

    if (!slots.length || !this.googleCalendarService.isConnected()) {
      return slots.map((slot) => ({ ...slot, available: true }));
    }

    const firstStart = slots[0].startsAt;
    const finalEnd = new Date(Math.max(...slots.map(
      (slot) => slot.startsAt.getTime() + slot.durationMinutes * 60_000,
    )));

    try {
      const busy = await this.googleCalendarService.getBusyPeriods(firstStart, finalEnd);
      return slots.map((slot) => {
        const end = new Date(slot.startsAt.getTime() + slot.durationMinutes * 60_000);
        const calendarBusy = busy.some((period) => period.start < end && period.end > slot.startsAt);
        return calendarBusy
          ? { ...slot, available: false, unavailableReason: 'google-calendar' as const }
          : { ...slot, available: true };
      });
    } catch {
      // Never label an unverified time as available.
      return slots.map((slot) => ({
        ...slot,
        available: false,
        unavailableReason: 'calendar-unavailable' as const,
      }));
    }
  }
}
