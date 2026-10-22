import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.freebusy';

export interface BusyPeriod {
  start: Date;
  end: Date;
}

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly configService: ConfigService) {}

  private createOAuthClient() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException('Google OAuth credentials are not configured.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // No refresh token means Calendar integration was not configured.
  // When configured, an API failure must NOT be treated as free time.
  isConnected(): boolean {
    return Boolean(this.configService.get<string>('GOOGLE_REFRESH_TOKEN')?.trim());
  }

  generateAuthorizationUrl(state: string): string {
    return this.createOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [CALENDAR_SCOPE],
      state,
    });
  }

  async exchangeCode(code: string) {
    const { tokens } = await this.createOAuthClient().getToken(code);
    return tokens;
  }

  // One FreeBusy request covers the entire list of future slots.
  async getBusyPeriods(start: Date, end: Date): Promise<BusyPeriod[]> {
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN')?.trim();
    if (!refreshToken) return [];

    try {
      const oauthClient = this.createOAuthClient();
      oauthClient.setCredentials({ refresh_token: refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oauthClient });
      const result = await calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const primary = result.data.calendars?.primary;
      if (!primary || primary.errors?.length) {
        throw new Error('Google Calendar returned no valid availability.');
      }

      return (primary.busy ?? []).map((period) => {
        if (!period.start || !period.end) {
          throw new Error('Incomplete calendar busy period.');
        }
        const interval = { start: new Date(period.start), end: new Date(period.end) };
        if (Number.isNaN(interval.start.getTime()) || Number.isNaN(interval.end.getTime())) {
          throw new Error('Invalid calendar busy period.');
        }
        return interval;
      });
    } catch {
      throw new ServiceUnavailableException('Google Calendar availability could not be verified.');
    }
  }

  async isHostBusy(startsAt: Date, durationMinutes: number): Promise<boolean> {
    if (!this.isConnected()) return false;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    const periods = await this.getBusyPeriods(startsAt, endsAt);
    return periods.some(({ start, end }) => start < endsAt && end > startsAt);
  }
}
