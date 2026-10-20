
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { TimeSlot } from '../slots/entities/time-slot.entity';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,

    @InjectRepository(TimeSlot)
    private readonly slotsRepository: Repository<TimeSlot>,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    const guestName = dto.guestName.trim();
    const guestEmail = dto.guestEmail.trim().toLowerCase();

    if (!guestName) {
      throw new BadRequestException('Guest name is required');
    }

    const slot = await this.slotsRepository.findOneBy({
      id: dto.slotId,
    });

    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }

    if (slot.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Cannot book a past time slot',
      );
    }

    const booking = this.bookingsRepository.create({
      slotId: slot.id,
      guestName,
      guestEmail,
    });

    try {
      return await this.bookingsRepository.save(booking);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const databaseError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (
          databaseError.code === '23505' &&
          databaseError.constraint === 'UQ_bookings_slot_id'
        ) {
          throw new ConflictException(
            'This time slot has already been booked',
          );
        }
      }

      throw error;
    }
  }
}
