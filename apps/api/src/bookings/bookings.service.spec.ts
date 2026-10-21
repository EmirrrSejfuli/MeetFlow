
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';

import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { TimeSlot } from '../slots/entities/time-slot.entity';

describe('BookingsService', () => {
  const bookingsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const slotsRepository = {
    findOneBy: jest.fn(),
  };

  let service: BookingsService;

  const slotId = '11111111-1111-4111-8111-111111111111';

  const createValidDto = () => ({
    slotId,
    guestName: '  Test Guest  ',
    guestEmail: '  TEST@EXAMPLE.COM  ',
  });

  const createFutureSlot = () =>
    ({
      id: slotId,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
      durationMinutes: 30,
    }) as TimeSlot;

  beforeEach(() => {
    jest.resetAllMocks();

    service = new BookingsService(
      bookingsRepository as unknown as Repository<Booking>,
      slotsRepository as unknown as Repository<TimeSlot>,
    );
  });

  it('should create a booking successfully', async () => {
    const dto = createValidDto();
    const slot = createFutureSlot();

    const booking = {
      id: 'booking-1',
      slotId: slot.id,
      guestName: 'Test Guest',
      guestEmail: 'test@example.com',
    } as Booking;

    slotsRepository.findOneBy.mockResolvedValue(slot);
    bookingsRepository.create.mockReturnValue(booking);
    bookingsRepository.save.mockResolvedValue(booking);

    const result = await service.create(dto);

    expect(result).toBe(booking);

    expect(slotsRepository.findOneBy).toHaveBeenCalledWith({
      id: slotId,
    });

    expect(bookingsRepository.create).toHaveBeenCalledWith({
      slotId,
      guestName: 'Test Guest',
      guestEmail: 'test@example.com',
    });

    expect(bookingsRepository.save).toHaveBeenCalledWith(
      booking,
    );
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
    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject a booking when the slot does not exist', async () => {
    const dto = createValidDto();

    slotsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create(dto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject a booking for a past slot', async () => {
    const dto = createValidDto();


const pastSlot = createFutureSlot();

pastSlot.startsAt = new Date(
  Date.now() - 60 * 60 * 1000,
);


    slotsRepository.findOneBy.mockResolvedValue(pastSlot);

    await expect(
      service.create(dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bookingsRepository.save).not.toHaveBeenCalled();
  });

  it('should return 409 when the slot is already booked', async () => {
    const dto = createValidDto();

    slotsRepository.findOneBy.mockResolvedValue(
      createFutureSlot(),
    );

    bookingsRepository.create.mockReturnValue({} as Booking);

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
      service.create(dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should not hide unexpected database errors', async () => {
    const dto = createValidDto();

    slotsRepository.findOneBy.mockResolvedValue(
      createFutureSlot(),
    );

    bookingsRepository.create.mockReturnValue({} as Booking);

    const databaseError = new Error(
      'Unexpected database failure',
    );

    bookingsRepository.save.mockRejectedValue(databaseError);

    await expect(
      service.create(dto),
    ).rejects.toBe(databaseError);
  });
});
