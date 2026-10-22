import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';

describe('GoogleCalendarService', () => {
  it('skips Calendar checks when no refresh token is configured', async () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new GoogleCalendarService(config);
    expect(service.isConnected()).toBe(false);
    expect(await service.getBusyPeriods(new Date(), new Date(Date.now() + 60_000))).toEqual([]);
    expect(await service.isHostBusy(new Date(), 30)).toBe(false);
  });
});
