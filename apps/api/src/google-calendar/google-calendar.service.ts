
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

const CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar.events.freebusy';

@Injectable()
export class GoogleCalendarService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  private createOAuthClient() {
    const clientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID');

    const clientSecret =
      this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    const redirectUri =
      this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Google OAuth credentials are not configured',
      );
    }

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );
  }

  generateAuthorizationUrl(state: string): string {
    const oauthClient = this.createOAuthClient();

    return oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [CALENDAR_SCOPE],
      state,
    });
  }

  async exchangeCode(code: string) {
    const oauthClient = this.createOAuthClient();

    const { tokens } = await oauthClient.getToken(code);

    return tokens;
  }

  // Check the host's calendar using the stored refresh token.
  async isHostBusy(
    startsAt: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    const refreshToken =
      this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    if (!refreshToken) {
      throw new ServiceUnavailableException(
        'Google Calendar is not connected.',
      );
    }

    return this.isBusy(
      refreshToken,
      startsAt,
      durationMinutes,
    );
  }

  // Query Google Calendar FreeBusy API.
  async isBusy(
    refreshToken: string,
    startsAt: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    const oauthClient = this.createOAuthClient();

    oauthClient.setCredentials({
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({
      version: 'v3',
      auth: oauthClient,
    });

    const endsAt = new Date(
      startsAt.getTime() + durationMinutes * 60_000,
    );

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startsAt.toISOString(),
        timeMax: endsAt.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const primaryCalendar = response.data.calendars?.primary;

    if (
      !primaryCalendar ||
      primaryCalendar.errors?.length
    ) {
      throw new ServiceUnavailableException(
        'Google Calendar availability could not be verified',
      );
    }

    return (primaryCalendar.busy?.length ?? 0) > 0;
  }
}
