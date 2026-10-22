import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
    create: jest.fn(), save: jest.fn(), findOneBy: jest.fn(),
  };
  const slotsRepository = { findOneBy: jest.fn() };
  const googleCalendarService = { isHostBusy: jest.fn() };
  const geminiService = { generateBookingConfirmation: jest.fn() };
  let service: BookingsService;

  const slotId = '11111111-1111-4111-8111-111111111111';
  const bookingId = '22222222-2222-4222-8222-222222222222';
  const aiConfirmation = 'Hello Test Guest, your meeting is confirmed.';
  const validDto = () => ({ slotId, guestName: '  Test Guest  ', guestEmail: '  TEST@EXAMPLE.COM  ' });
  const futureSlot = (): TimeSlot => ({
    id: slotId, startsAt: new Date(Date.now() + 3_600_000), durationMinutes: 30,
  }) as TimeSlot;
  const savedBooking = (): Booking => ({
    id: bookingId, slotId, guestName: 'Test Guest', guestEmail: 'test@example.com',
  }) as Booking;

  beforeEach(() => {
    jest.resetAllMocks();
    googleCalendarService.isHostBusy.mockResolvedValue(false);
    geminiService.generateBookingConfirmation.mockResolvedValue(aiConfirmation);
    service = new BookingsService(
      bookingsRepository as unknown as Repository<Booking>,
      slotsRepository as unknown as Repository<TimeSlot>,
      googleCalendarService as unknown as GoogleCalendarService,
      geminiService as unknown as GeminiService,
    );
  });

  function mockSuccessfulBooking() {
    const slot = futureSlot();
    const booking = savedBooking();
    slotsRepository.findOneBy.mockResolvedValue(slot);
    bookingsRepository.create.mockReturnValue(booking);
    bookingsRepository.save.mockResolvedValue(booking);
    bookingsRepository.findOneBy.mockResolvedValue(booking);
    return { slot, booking };
  }

  it('creates a booking immediately without waiting for Gemini', async () => {
    const { slot, booking } = mockSuccessfulBooking();
    const result = await service.create(validDto());
    expect(slotsRepository.findOneBy).toHaveBeenCalledWith({ id: slotId });
    expect(googleCalendarService.isHostBusy).toHaveBeenCalledWith(slot.startsAt, 30);
    expect(bookingsRepository.create).toHaveBeenCalledWith({
      slotId, guestName: 'Test Guest', guestEmail: 'test@example.com',
    });
    expect(bookingsRepository.save).toHaveBeenCalledWith(booking);
    expect(result.confirmationSource).toBe('fallback');
    expect(result.confirmationMessage).toContain('Test Guest');
    expect(result.confirmationMessage).toContain('30 minutes');
    expect(result.confirmationToken).toMatch(/^\d{13}\.[a-f0-9]{64}$/);
    expect(geminiService.generateBookingConfirmation).not.toHaveBeenCalled();
  });

  it('rejects an empty guest name', async () => {
    await expect(service.create({ ...validDto(), guestName: '   ' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(slotsRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent slot', async () => {
    slotsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.create(validDto())).rejects.toBeInstanceOf(NotFoundException);
    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a past slot', async () => {
    const slot = futureSlot();
    slot.startsAt = new Date(Date.now() - 3_600_000);
    slotsRepository.findOneBy.mockResolvedValue(slot);
    await expect(service.create(validDto())).rejects.toBeInstanceOf(BadRequestException);
    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate booking', async () => {
    slotsRepository.findOneBy.mockResolvedValue(futureSlot());
    bookingsRepository.create.mockReturnValue({} as Booking);
    const error = Object.assign(new Error('Duplicate booking'), {
      code: '23505', constraint: 'UQ_bookings_slot_id',
    });
    bookingsRepository.save.mockRejectedValue(new QueryFailedError('INSERT', [], error));
    await expect(service.create(validDto())).rejects.toBeInstanceOf(ConflictException);
    expect(geminiService.generateBookingConfirmation).not.toHaveBeenCalled();
  });

  it('does not hide unexpected database errors', async () => {
    slotsRepository.findOneBy.mockResolvedValue(futureSlot());
    bookingsRepository.create.mockReturnValue({} as Booking);
    const error = new Error('Unexpected database failure');
    bookingsRepository.save.mockRejectedValue(error);
    await expect(service.create(validDto())).rejects.toBe(error);
  });

  it('rejects a Google Calendar conflict', async () => {
    slotsRepository.findOneBy.mockResolvedValue(futureSlot());
    googleCalendarService.isHostBusy.mockResolvedValue(true);
    await expect(service.create(validDto())).rejects.toBeInstanceOf(ConflictException);
    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('fails closed when a connected Google Calendar is unavailable', async () => {
    slotsRepository.findOneBy.mockResolvedValue(futureSlot());
    const error = new Error('Google Calendar unavailable');
    googleCalendarService.isHostBusy.mockRejectedValue(error);
    await expect(service.create(validDto())).rejects.toBe(error);
    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('generates a personalized confirmation with a valid token', async () => {
    const { slot } = mockSuccessfulBooking();
    const { confirmationToken } = await service.create(validDto());
    const result = await service.generateConfirmation(bookingId, confirmationToken);
    expect(bookingsRepository.findOneBy).toHaveBeenCalledWith({ id: bookingId });
    expect(geminiService.generateBookingConfirmation).toHaveBeenCalledWith({
      guestName: 'Test Guest', startsAt: slot.startsAt, durationMinutes: 30,
    });
    expect(result).toEqual({ confirmationMessage: aiConfirmation, confirmationSource: 'gemini' });
    expect(bookingsRepository.save).toHaveBeenCalledTimes(1);
  });

  it('uses the fallback when Gemini fails', async () => {
    mockSuccessfulBooking();
    const { confirmationToken } = await service.create(validDto());
    geminiService.generateBookingConfirmation.mockRejectedValue(new Error('Gemini error'));
    const result = await service.generateConfirmation(bookingId, confirmationToken);
    expect(result.confirmationSource).toBe('fallback');
    expect(result.confirmationMessage).toContain('Europe/Skopje');
    expect(result.confirmationMessage).toContain('30 minutes');
  });

  it('rejects a confirmation without a matching token', async () => {
    mockSuccessfulBooking();
    const { confirmationToken } = await service.create(validDto());
    await expect(service.generateConfirmation(bookingId, 'fake-token'))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.generateConfirmation(slotId, confirmationToken))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(geminiService.generateBookingConfirmation).not.toHaveBeenCalled();
  });

  it('only calls Gemini once for repeated requests to the same booking', async () => {
    mockSuccessfulBooking();
    const { confirmationToken } = await service.create(validDto());
    const first = await service.generateConfirmation(bookingId, confirmationToken);
    const second = await service.generateConfirmation(bookingId, confirmationToken);
    expect(second).toEqual(first);
    expect(geminiService.generateBookingConfirmation).toHaveBeenCalledTimes(1);
  });

  it('rejects a confirmation for a nonexistent booking', async () => {
    mockSuccessfulBooking();
    const { confirmationToken } = await service.create(validDto());
    bookingsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.generateConfirmation(bookingId, confirmationToken))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a confirmation if the slot is missing', async () => {
    mockSuccessfulBooking();
    const { confirmationToken } = await service.create(validDto());
    slotsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.generateConfirmation(bookingId, confirmationToken))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
