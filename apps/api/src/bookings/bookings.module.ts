
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GeminiModule } from '../gemini/gemini.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { TimeSlot } from '../slots/entities/time-slot.entity';

import { Booking } from './entities/booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, TimeSlot]),
    GoogleCalendarModule,
    GeminiModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
