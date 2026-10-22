import { Body, Controller, Get, Post } from '@nestjs/common';

import { CreateSlotDto } from './dto/create-slot.dto';
import { TimeSlot } from './entities/time-slot.entity';
import { AvailableSlot, SlotsService } from './slots.service';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  create(@Body() dto: CreateSlotDto): Promise<TimeSlot> {
    return this.slotsService.create(dto);
  }

  @Get()
  findAvailable(): Promise<AvailableSlot[]> {
    return this.slotsService.findAvailable();
  }
}
