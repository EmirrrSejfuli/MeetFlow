
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'The start time must be in the future',
      );
    }

    const slot = this.slotsRepository.create({
      startsAt,
      durationMinutes: dto.durationMinutes,
    });

    return this.slotsRepository.save(slot);
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
