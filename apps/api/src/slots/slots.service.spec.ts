import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { SlotsService } from './slots.service';
import { TimeSlot } from './entities/time-slot.entity';

describe('SlotsService', () => {
  const query = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn(),
  };
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const calendar = { isConnected: jest.fn(), getBusyPeriods: jest.fn() };
  let service: SlotsService;

  const validDto = () => ({
    startsAt: new Date(Date.now() + 3_600_000).toISOString(),
    durationMinutes: 30,
  });
  const futureSlot = (): TimeSlot => ({
    id: 'slot-1',
    startsAt: new Date(Date.now() + 3_600_000),
    durationMinutes: 30,
  }) as TimeSlot;

  beforeEach(() => {
    jest.resetAllMocks();
    query.where.mockReturnValue(query);
    query.andWhere.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    repository.createQueryBuilder.mockReturnValue(query);
    calendar.isConnected.mockReturnValue(false);
    calendar.getBusyPeriods.mockResolvedValue([]);
    service = new SlotsService(
      repository as unknown as Repository<TimeSlot>,
      calendar as unknown as GoogleCalendarService,
    );
  });

  it('should create a valid future slot', async () => {
    const dto = validDto();
    const slot = futureSlot();
    repository.create.mockReturnValue(slot);
    repository.save.mockResolvedValue(slot);
    expect(await service.create(dto)).toBe(slot);
    expect(repository.create).toHaveBeenCalledWith({
      startsAt: new Date(dto.startsAt), durationMinutes: 30,
    });
    expect(repository.save).toHaveBeenCalledWith(slot);
  });

  it('should reject a slot in the past', async () => {
    await expect(service.create({ startsAt: '2020-01-01T10:00:00.000Z', durationMinutes: 30 }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should reject an invalid date', async () => {
    await expect(service.create({ startsAt: 'invalid-date', durationMinutes: 30 }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should return 409 for overlapping slots', async () => {
    repository.create.mockReturnValue({} as TimeSlot);
    const error = Object.assign(new Error('Exclusion constraint violation'), {
      code: '23P01', constraint: 'EX_time_slots_no_overlap',
    });
    repository.save.mockRejectedValue(new QueryFailedError('INSERT INTO time_slots ...', [], error));
    await expect(service.create(validDto())).rejects.toBeInstanceOf(ConflictException);
  });

  it('should list locally available slots when Calendar is not configured', async () => {
    const slot = futureSlot();
    query.getMany.mockResolvedValue([slot]);
    expect(await service.findAvailable()).toEqual([{ ...slot, available: true }]);
    expect(calendar.getBusyPeriods).not.toHaveBeenCalled();
  });

  it('should mark a Google Calendar conflict as unavailable', async () => {
    const slot = futureSlot();
    query.getMany.mockResolvedValue([slot]);
    calendar.isConnected.mockReturnValue(true);
    calendar.getBusyPeriods.mockResolvedValue([{
      start: slot.startsAt,
      end: new Date(slot.startsAt.getTime() + 15 * 60_000),
    }]);
    expect(await service.findAvailable()).toEqual([{
      ...slot, available: false, unavailableReason: 'google-calendar',
    }]);
    expect(calendar.getBusyPeriods).toHaveBeenCalledTimes(1);
  });

  it('should mark slots unverified when the connected Calendar fails', async () => {
    const slot = futureSlot();
    query.getMany.mockResolvedValue([slot]);
    calendar.isConnected.mockReturnValue(true);
    calendar.getBusyPeriods.mockRejectedValue(new Error('Calendar error'));
    expect(await service.findAvailable()).toEqual([{
      ...slot, available: false, unavailableReason: 'calendar-unavailable',
    }]);
  });
});
