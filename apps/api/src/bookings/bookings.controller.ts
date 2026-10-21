
import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import {
  BookingsService,
  type BookingConfirmation,
  type BookingWithConfirmation,
} from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
  ) {}

  // Save the booking without waiting for Gemini AI.
  @Post()
  create(
    @Body() dto: CreateBookingDto,
  ): Promise<BookingWithConfirmation> {
    return this.bookingsService.create(dto);
  }

  // Generate a personalized confirmation separately.
  @Post(':bookingId/confirmation')
  generateConfirmation(
    @Param('bookingId', new ParseUUIDPipe())
    bookingId: string,
  ): Promise<BookingConfirmation> {
    return this.bookingsService.generateConfirmation(
      bookingId,
    );
  }
}
