import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { TimeSlot } from './entities/time-slot.entity';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeSlot]), GoogleCalendarModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}
