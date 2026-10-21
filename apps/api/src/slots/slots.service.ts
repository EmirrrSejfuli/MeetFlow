
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateSlotDto } from './dto/create-slot.dto';
import { TimeSlot } from './entities/time-slot.entity';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(TimeSlot)
    private readonly slotsRepository: Repository<TimeSlot>,
  ) {}

  async create(dto: CreateSlotDto): Promise<TimeSlot> {
    const startsAt = new Date(dto.startsAt);

    if (
      Number.isNaN(startsAt.getTime()) ||
      startsAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'The start time must be a valid future date',
      );
    }

    const slot = this.slotsRepository.create({
      startsAt,
      durationMinutes: dto.durationMinutes,
    });

    try {
      return await this.slotsRepository.save(slot);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const databaseError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (
          databaseError.code === '23P01' &&
          databaseError.constraint ===
            'EX_time_slots_no_overlap'
        ) {
          throw new ConflictException(
            'The selected time overlaps with an existing slot.',
          );
        }
      }

      throw error;
    }
  }

  async findAvailable(): Promise<TimeSlot[]> {
    return this.slotsRepository
      .createQueryBuilder('slot')
      .where('slot.starts_at > :now', {
        now: new Date(),
      })
      .andWhere(`
        NOT EXISTS (
          SELECT 1
          FROM bookings booking
          WHERE booking.slot_id = slot.id
        )
      `)
      .orderBy('slot.starts_at', 'ASC')
      .getMany();
  }
}
