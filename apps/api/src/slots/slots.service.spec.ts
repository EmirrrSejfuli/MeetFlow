
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';

import { SlotsService } from './slots.service';
import { TimeSlot } from './entities/time-slot.entity';

describe('SlotsService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  let service: SlotsService;

  const createValidDto = () => ({
    startsAt: new Date(
      Date.now() + 60 * 60 * 1000,
    ).toISOString(),
    durationMinutes: 30,
  });

  beforeEach(() => {
    jest.resetAllMocks();

    service = new SlotsService(
      repository as unknown as Repository<TimeSlot>,
    );
  });

  it('should create a valid future slot', async () => {
    const dto = createValidDto();

    const slot = {
      id: 'slot-1',
      startsAt: new Date(dto.startsAt),
      durationMinutes: dto.durationMinutes,
    } as TimeSlot;

    repository.create.mockReturnValue(slot);
    repository.save.mockResolvedValue(slot);

    const result = await service.create(dto);

    expect(result).toBe(slot);

    expect(repository.create).toHaveBeenCalledWith({
      startsAt: new Date(dto.startsAt),
      durationMinutes: 30,
    });

    expect(repository.save).toHaveBeenCalledWith(slot);
  });

  it('should reject a slot in the past', async () => {
    const dto = {
      startsAt: '2020-01-01T10:00:00.000Z',
      durationMinutes: 30,
    };

    await expect(
      service.create(dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should reject an invalid date', async () => {
    const dto = {
      startsAt: 'invalid-date',
      durationMinutes: 30,
    };

    await expect(
      service.create(dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should return 409 for overlapping slots', async () => {
    const dto = createValidDto();

    repository.create.mockReturnValue({} as TimeSlot);

    const databaseError = Object.assign(
      new Error('Exclusion constraint violation'),
      {
        code: '23P01',
        constraint: 'EX_time_slots_no_overlap',
      },
    );

    repository.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT INTO time_slots ...',
        [],
        databaseError,
      ),
    );

    await expect(
      service.create(dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
