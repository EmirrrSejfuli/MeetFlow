import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  BookingsService,
  type BookingConfirmation,
  type BookingWithConfirmation,
} from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto): Promise<BookingWithConfirmation> {
    return this.bookingsService.create(dto);
  }

  @Post(':bookingId/confirmation')
  generateConfirmation(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body('token') token: string,
  ): Promise<BookingConfirmation> {
    return this.bookingsService.generateConfirmation(bookingId, token);
  }
}
