
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { GeminiService } from '../gemini/gemini.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { TimeSlot } from '../slots/entities/time-slot.entity';

import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

export interface BookingConfirmation {
  confirmationMessage: string;
  confirmationSource: 'gemini' | 'fallback';
}

export type BookingWithConfirmation = Booking & BookingConfirmation;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,

    @InjectRepository(TimeSlot)
    private readonly slotsRepository: Repository<TimeSlot>,

    private readonly googleCalendarService: GoogleCalendarService,

    private readonly geminiService: GeminiService,
  ) {}

  // Save the booking without waiting for Gemini AI.
  async create(
    dto: CreateBookingDto,
  ): Promise<BookingWithConfirmation> {
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

    const isBusy = await this.googleCalendarService.isHostBusy(
      slot.startsAt,
      slot.durationMinutes,
    );

    if (isBusy) {
      throw new ConflictException(
        'The host is busy in Google Calendar at this time.',
      );
    }

    const booking = this.bookingsRepository.create({
      slotId: slot.id,
      guestName,
      guestEmail,
    });

    let savedBooking: Booking;

    try {
      savedBooking = await this.bookingsRepository.save(booking);
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

    // Return immediately with a standard confirmation.
    return {
      ...savedBooking,
      confirmationMessage: this.buildFallbackMessage(
        guestName,
        slot,
      ),
      confirmationSource: 'fallback',
    };
  }

  // Called separately after the booking has succeeded.
  async generateConfirmation(
    bookingId: string,
  ): Promise<BookingConfirmation> {
    const booking = await this.bookingsRepository.findOneBy({
      id: bookingId,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const slot = await this.slotsRepository.findOneBy({
      id: booking.slotId,
    });

    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }

    const fallbackMessage = this.buildFallbackMessage(
      booking.guestName,
      slot,
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const confirmationMessage = await Promise.race([
        this.geminiService.generateBookingConfirmation({
          guestName: booking.guestName,
          startsAt: slot.startsAt,
          durationMinutes: slot.durationMinutes,
        }),

        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Gemini confirmation timed out'));
          }, 35000);
        }),
      ]);

      return {
        confirmationMessage,
        confirmationSource: 'gemini',
      };
    } catch {
      this.logger.warn(
        'Gemini confirmation unavailable. Using fallback message.',
      );

      return {
        confirmationMessage: fallbackMessage,
        confirmationSource: 'fallback',
      };
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private buildFallbackMessage(
    guestName: string,
    slot: TimeSlot,
  ): string {
    const localDateTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Skopje',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(slot.startsAt);

    return (
      `Hello ${guestName}, your MeetFlow booking is confirmed ` +
      `for ${localDateTime} (Europe/Skopje). ` +
      `The meeting duration is ${slot.durationMinutes} minutes.`
    );
  }
}
