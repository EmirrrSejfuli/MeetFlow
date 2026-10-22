import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';

import { GeminiService } from '../gemini/gemini.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { TimeSlot } from '../slots/entities/time-slot.entity';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

const CONFIRMATION_TTL_MS = 10 * 60 * 1000;

export interface BookingConfirmation {
  confirmationMessage: string;
  confirmationSource: 'gemini' | 'fallback';
}

export type BookingWithConfirmation = Booking & BookingConfirmation & {
  confirmationToken: string;
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  // Ephemeral per-process secret: no extra environment variable is required for the demo.
  private readonly confirmationKey = randomBytes(32);
  // Reuse the same Gemini result for repeated requests to avoid repeated API charges.
  private readonly confirmationCache = new Map<string, Promise<BookingConfirmation>>();

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(TimeSlot)
    private readonly slotsRepository: Repository<TimeSlot>,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly geminiService: GeminiService,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingWithConfirmation> {
    const guestName = dto.guestName.trim();
    const guestEmail = dto.guestEmail.trim().toLowerCase();
    if (!guestName) throw new BadRequestException('Guest name is required');

    const slot = await this.slotsRepository.findOneBy({ id: dto.slotId });
    if (!slot) throw new NotFoundException('Time slot not found');
    if (slot.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot book a past time slot');
    }

    // When Calendar is not configured this returns false; when configured and
    // unavailable it fails closed, so we do not accidentally double-book.
    const isBusy = await this.googleCalendarService.isHostBusy(
      slot.startsAt,
      slot.durationMinutes,
    );
    if (isBusy) {
      throw new ConflictException('The host is busy in Google Calendar at this time.');
    }

    const booking = this.bookingsRepository.create({ slotId: slot.id, guestName, guestEmail });
    let saved: Booking;
    try {
      saved = await this.bookingsRepository.save(booking);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const databaseError = error.driverError as { code?: string; constraint?: string };
        if (databaseError.code === '23505' && databaseError.constraint === 'UQ_bookings_slot_id') {
          throw new ConflictException('This time slot has already been booked');
        }
      }
      throw error;
    }

    return {
      ...saved,
      confirmationMessage: this.buildFallbackMessage(guestName, slot),
      confirmationSource: 'fallback',
      confirmationToken: this.issueConfirmationToken(saved.id),
    };
  }

  async generateConfirmation(bookingId: string, token: string): Promise<BookingConfirmation> {
    this.verifyConfirmationToken(bookingId, token);

    const previous = this.confirmationCache.get(bookingId);
    if (previous) return previous;

    const result = this.generateConfirmationOnce(bookingId);
    this.confirmationCache.set(bookingId, result);
    setTimeout(() => this.confirmationCache.delete(bookingId), CONFIRMATION_TTL_MS).unref();
    return result;
  }

  private async generateConfirmationOnce(bookingId: string): Promise<BookingConfirmation> {
    const booking = await this.bookingsRepository.findOneBy({ id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');

    const slot = await this.slotsRepository.findOneBy({ id: booking.slotId });
    if (!slot) throw new NotFoundException('Time slot not found');

    const fallbackMessage = this.buildFallbackMessage(booking.guestName, slot);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const confirmationMessage = await Promise.race([
        this.geminiService.generateBookingConfirmation({
          guestName: booking.guestName,
          startsAt: slot.startsAt,
          durationMinutes: slot.durationMinutes,
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Gemini confirmation timed out')), 35000);
        }),
      ]);
      return { confirmationMessage, confirmationSource: 'gemini' };
    } catch {
      this.logger.warn('Gemini confirmation unavailable. Using fallback message.');
      return { confirmationMessage: fallbackMessage, confirmationSource: 'fallback' };
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  private issueConfirmationToken(bookingId: string): string {
    const expiresAt = Date.now() + CONFIRMATION_TTL_MS;
    const signature = this.sign(bookingId, String(expiresAt));
    return `${expiresAt}.${signature}`;
  }

  private sign(bookingId: string, expiresAt: string): string {
    return createHmac('sha256', this.confirmationKey)
      .update(`${bookingId}.${expiresAt}`)
      .digest('hex');
  }

  private verifyConfirmationToken(bookingId: string, token: string): void {
    if (typeof token !== 'string') throw new ForbiddenException('Invalid confirmation token.');
    const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
    if (!match) throw new ForbiddenException('Invalid confirmation token.');

    const expiresAt = Number(match[1]);
    if (expiresAt <= Date.now() || expiresAt > Date.now() + CONFIRMATION_TTL_MS) {
      throw new ForbiddenException('Confirmation token has expired.');
    }
    const received = Buffer.from(match[2], 'hex');
    const expected = Buffer.from(this.sign(bookingId, match[1]), 'hex');
    if (!timingSafeEqual(received, expected)) {
      throw new ForbiddenException('Invalid confirmation token.');
    }
  }

  private buildFallbackMessage(guestName: string, slot: TimeSlot): string {
    const localDateTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Skopje',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(slot.startsAt);
    return (
      `Hello ${guestName}, your MeetFlow booking is confirmed for ${localDateTime} ` +
      `(Europe/Skopje). The meeting duration is ${slot.durationMinutes} minutes.`
    );
  }
}
