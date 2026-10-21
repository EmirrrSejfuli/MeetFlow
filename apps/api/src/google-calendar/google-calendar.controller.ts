
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

import { GoogleCalendarService } from './google-calendar.service';

const STATE_COOKIE = 'meetflow_google_state';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  private ensureLocalSetup(request: Request): void {
    const address = request.socket.remoteAddress;

    const isLocal = [
      '127.0.0.1',
      '::1',
      '::ffff:127.0.0.1',
    ].includes(address ?? '');

    if (process.env.NODE_ENV === 'production' || !isLocal) {
      throw new ForbiddenException(
        'Google Calendar setup is only available locally.',
      );
    }
  }

  @Get('connect')
  connect(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    this.ensureLocalSetup(request);

    const state = randomBytes(32).toString('hex');

    response.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/google-calendar',
      maxAge: 10 * 60 * 1000,
    });

    const url =
      this.googleCalendarService.generateAuthorizationUrl(state);

    return response.redirect(url);
  }

  @Get('callback')
  async callback(
    @Req() request: Request,
    @Res() response: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    this.ensureLocalSetup(request);

    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) =>
        part.startsWith(`${STATE_COOKIE}=`),
      );

    const savedState = cookie?.slice(
      STATE_COOKIE.length + 1,
    );

    response.clearCookie(STATE_COOKIE, {
      path: '/google-calendar',
    });

    if (!code || !state || !savedState) {
      throw new BadRequestException(
        'Missing OAuth authorization information.',
      );
    }

    const received = Buffer.from(state);
    const expected = Buffer.from(savedState);

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new BadRequestException(
        'Invalid OAuth state.',
      );
    }

    const tokens =
      await this.googleCalendarService.exchangeCode(code);

    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Google did not provide a refresh token.',
      );
    }

    response.setHeader('Cache-Control', 'no-store');

    return response.type('text/plain').send(
      'Google Calendar authorization succeeded.\n\n' +
      'For local setup only, copy this refresh token into ' +
      'your private MeetFlow/.env file:\n\n' +
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n\n` +
      'Keep this token private. Never commit it to Git.',
    );
  }
}
