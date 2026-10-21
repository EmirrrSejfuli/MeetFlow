
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';

import { GeminiService } from '../gemini/gemini.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { TimeSlot } from '../slots/entities/time-slot.entity';

import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';

describe('BookingsService', () => {
  const bookingsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  const slotsRepository = {
    findOneBy: jest.fn(),
  };

  const googleCalendarService = {
    isHostBusy: jest.fn(),
  };

  const geminiService = {
    generateBookingConfirmation: jest.fn(),
  };

  let service: BookingsService;

  const slotId = '11111111-1111-4111-8111-111111111111';
  const bookingId = '22222222-2222-4222-8222-222222222222';

  const aiConfirmation =
    'Hello Test Guest, your meeting is confirmed.';

  const createValidDto = () => ({
    slotId,
    guestName: '  Test Guest  ',
    guestEmail: '  TEST@EXAMPLE.COM  ',
  });

  const createFutureSlot = (): TimeSlot =>
    ({
      id: slotId,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
      durationMinutes: 30,
    }) as TimeSlot;

  const createSavedBooking = (): Booking =>
    ({
      id: bookingId,
      slotId,
      guestName: 'Test Guest',
      guestEmail: 'test@example.com',
    }) as Booking;

  beforeEach(() => {
    jest.resetAllMocks();

    googleCalendarService.isHostBusy.mockResolvedValue(false);

    geminiService.generateBookingConfirmation.mockResolvedValue(
      aiConfirmation,
    );

    service = new BookingsService(
      bookingsRepository as unknown as Repository<Booking>,
      slotsRepository as unknown as Repository<TimeSlot>,
      googleCalendarService as unknown as GoogleCalendarService,
      geminiService as unknown as GeminiService,
    );
  });

  describe('create()', () => {
    it('should save a booking without waiting for Gemini AI', async () => {
      const dto = createValidDto();
      const slot = createFutureSlot();
      const booking = createSavedBooking();

      slotsRepository.findOneBy.mockResolvedValue(slot);
      bookingsRepository.create.mockReturnValue(booking);
      bookingsRepository.save.mockResolvedValue(booking);

      const result = await service.create(dto);

      expect(slotsRepository.findOneBy).toHaveBeenCalledWith({
        id: slotId,
      });

      expect(googleCalendarService.isHostBusy).toHaveBeenCalledWith(
        slot.startsAt,
        slot.durationMinutes,
      );

      expect(bookingsRepository.create).toHaveBeenCalledWith({
        slotId,
        guestName: 'Test Guest',
        guestEmail: 'test@example.com',
      });

      expect(bookingsRepository.save).toHaveBeenCalledWith(
        booking,
      );

      expect(result).toEqual({
        ...booking,
        confirmationMessage: expect.stringContaining(
          'Test Guest',
        ) as string,
        confirmationSource: 'fallback',
      });

      expect(result.confirmationMessage).toContain(
        '30 minutes',
      );

      expect(
        geminiService.generateBookingConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('should reject an empty guest name', async () => {
      const dto = {
        ...createValidDto(),
        guestName: '   ',
      };

      await expect(
        service.create(dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(slotsRepository.findOneBy).not.toHaveBeenCalled();
      expect(googleCalendarService.isHostBusy).not.toHaveBeenCalled();
      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should reject a booking when the slot does not exist', async () => {
      slotsRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(createValidDto()),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(googleCalendarService.isHostBusy).not.toHaveBeenCalled();
      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should reject a booking for a past slot', async () => {
      const slot = createFutureSlot();

      slot.startsAt = new Date(
        Date.now() - 60 * 60 * 1000,
      );

      slotsRepository.findOneBy.mockResolvedValue(slot);

      await expect(
        service.create(createValidDto()),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(googleCalendarService.isHostBusy).not.toHaveBeenCalled();
      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should return 409 when the slot is already booked', async () => {
      slotsRepository.findOneBy.mockResolvedValue(
        createFutureSlot(),
      );

      bookingsRepository.create.mockReturnValue(
        {} as Booking,
      );

      const databaseError = Object.assign(
        new Error('Duplicate booking'),
        {
          code: '23505',
          constraint: 'UQ_bookings_slot_id',
        },
      );

      bookingsRepository.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT INTO bookings ...',
          [],
          databaseError,
        ),
      );

      await expect(
        service.create(createValidDto()),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(googleCalendarService.isHostBusy).toHaveBeenCalled();

      expect(
        geminiService.generateBookingConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('should not hide unexpected database errors', async () => {
      slotsRepository.findOneBy.mockResolvedValue(
        createFutureSlot(),
      );

      bookingsRepository.create.mockReturnValue(
        {} as Booking,
      );

      const databaseError = new Error(
        'Unexpected database failure',
      );

      bookingsRepository.save.mockRejectedValue(
        databaseError,
      );

      await expect(
        service.create(createValidDto()),
      ).rejects.toBe(databaseError);
    });

    it('should reject booking when Google Calendar is busy', async () => {
      const slot = createFutureSlot();

      slotsRepository.findOneBy.mockResolvedValue(slot);
      googleCalendarService.isHostBusy.mockResolvedValue(true);

      await expect(
        service.create(createValidDto()),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(googleCalendarService.isHostBusy).toHaveBeenCalledWith(
        slot.startsAt,
        slot.durationMinutes,
      );

      expect(bookingsRepository.create).not.toHaveBeenCalled();
      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should reject booking when Google Calendar is unavailable', async () => {
      const slot = createFutureSlot();

      slotsRepository.findOneBy.mockResolvedValue(slot);

      const calendarError = new Error(
        'Google Calendar unavailable',
      );

      googleCalendarService.isHostBusy.mockRejectedValue(
        calendarError,
      );

      await expect(
        service.create(createValidDto()),
      ).rejects.toBe(calendarError);

      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('generateConfirmation()', () => {
    it('should generate a personalized confirmation with Gemini', async () => {
      const booking = createSavedBooking();
      const slot = createFutureSlot();

      bookingsRepository.findOneBy.mockResolvedValue(
        booking,
      );

      slotsRepository.findOneBy.mockResolvedValue(slot);

      const result = await service.generateConfirmation(
        bookingId,
      );

      expect(bookingsRepository.findOneBy).toHaveBeenCalledWith({
        id: bookingId,
      });

      expect(slotsRepository.findOneBy).toHaveBeenCalledWith({
        id: slotId,
      });

      expect(
        geminiService.generateBookingConfirmation,
      ).toHaveBeenCalledWith({
        guestName: 'Test Guest',
        startsAt: slot.startsAt,
        durationMinutes: 30,
      });

      expect(result).toEqual({
        confirmationMessage: aiConfirmation,
        confirmationSource: 'gemini',
      });

      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should return a fallback if Gemini fails', async () => {
      const booking = createSavedBooking();
      const slot = createFutureSlot();

      bookingsRepository.findOneBy.mockResolvedValue(
        booking,
      );

      slotsRepository.findOneBy.mockResolvedValue(slot);

      geminiService.generateBookingConfirmation.mockRejectedValue(
        new Error('Gemini unavailable'),
      );

      const result = await service.generateConfirmation(
        bookingId,
      );

      expect(result.confirmationSource).toBe(
        'fallback',
      );

      expect(result.confirmationMessage).toContain(
        'Test Guest',
      );

      expect(result.confirmationMessage).toContain(
        '30 minutes',
      );

      expect(result.confirmationMessage).toContain(
        'Europe/Skopje',
      );

      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should reject confirmation for a nonexistent booking', async () => {
      bookingsRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        service.generateConfirmation(bookingId),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(slotsRepository.findOneBy).not.toHaveBeenCalled();

      expect(
        geminiService.generateBookingConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('should reject confirmation if the related slot is missing', async () => {
      bookingsRepository.findOneBy.mockResolvedValue(
        createSavedBooking(),
      );

      slotsRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        service.generateConfirmation(bookingId),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        geminiService.generateBookingConfirmation,
      ).not.toHaveBeenCalled();
    });
  });
});
