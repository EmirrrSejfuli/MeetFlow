
import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.create(dto);
  }
}
