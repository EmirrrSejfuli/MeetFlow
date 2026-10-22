# MeetFlow — Smart Scheduling

A single-host appointment scheduling challenge built with **React + TypeScript + Vite**, **NestJS**, **TypeORM**, and **PostgreSQL**. One host publishes time slots; guests book with their name and email. Google Calendar and Gemini AI are optional integrations.

**Live demo:** https://meetflow-web-xtoh.onrender.com
**Backend:** https://meetflow-api-xbsu.onrender.com
**Source code:** https://github.com/EmirrrSejfuli/MeetFlow

## Features

- Host publishes a future time slot with a date, time, and duration in the **Europe/Skopje** time zone.
- `GET /slots` lists upcoming unbooked slots. If Google Calendar is connected, a single FreeBusy request identifies conflicting intervals and the UI marks them **Unavailable**. If Google becomes unavailable, slots are marked *not verified* instead of falsely offered as free.
- Guest books a slot with a name and email (`POST /bookings`). A PostgreSQL `UNIQUE(slot_id)` constraint prevents concurrent double booking. A GiST exclusion constraint prevents overlapping host slots.
- **Optional Google Calendar:** checks the host's primary calendar before booking. If no refresh token is configured, the app works with PostgreSQL alone. If a connected calendar fails, booking is conservatively rejected rather than silently allowing a conflict.
- **Optional Gemini AI:** booking confirmation is returned immediately after database persistence. A separate call personalizes the message; if Gemini is missing or unavailable, the standard confirmation remains valid.
- The AI confirmation endpoint requires a short-lived, booking-specific token issued on successful booking. Repeated requests within one server instance reuse the first AI result, instead of creating further billable calls.

## Prerequisites

- Node.js 24 and npm
- Docker / Docker Compose for local PostgreSQL
- Optional: Google OAuth 2.0 client with Calendar FreeBusy scope; Gemini API key from Google AI Studio

## Run locally

1. Clone the repository and copy `.env.example` to `.env` in the repository root. Set `POSTGRES_PASSWORD` (and optional integration credentials). Do **not** commit `.env`.
2. Start the database from the repository root:

   ```bash
   docker compose up -d
   ```

3. Start the backend in one terminal:

   ```bash
   cd apps/api
   npm ci
   npx typeorm-ts-node-esm migration:run -d src/database/data-source.ts
   npm run start:dev
   ```

4. Start the frontend in another terminal:

   ```bash
   cd apps/web
   npm ci
   npm run dev
   ```

5. Open **http://localhost:5173**. API: **http://localhost:3000**. A new database initially returns `[]` for `GET /slots`.

> **Windows PowerShell:** use `npm.cmd` and `npx.cmd` in place of `npm` and `npx` if `.ps1` script execution is restricted.

### Optional Google Calendar setup

Enable Google Calendar API, configure OAuth consent and a Web OAuth client with redirect `http://localhost:3000/google-calendar/callback`, add your Google account as a test user if necessary. With `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`, open `http://localhost:3000/google-calendar/connect` **locally**. Copy the resulting refresh token into `.env` and restart the API. Never paste a refresh token in chat, a commit, a screenshot, or a shared ZIP. OAuth setup endpoints are deliberately forbidden in production.

**No Calendar token?** Leave `GOOGLE_REFRESH_TOKEN` empty: the complete basic booking flow still works. A configured but failing Calendar is *not* silently skipped.

### Optional Gemini AI setup

Set `GEMINI_API_KEY` in `.env`; the default model is `gemini-3.5-flash-lite`. If Gemini is not configured or an API request fails, booking stays saved and the confirmation remains the standard text. The AI request is separate from creating the booking.

## Deployment (Render)

The demo uses **Render PostgreSQL + Render Node Web Service + Render Static Site**:

| Service | Source / configuration |
| --- | --- |
| Database | Render PostgreSQL, in the same region as the API |
| API | `apps/api`, Node; build: `npm ci && npm run build`; start: `npm run start:prod` |
| Frontend | `apps/web`, Static Site; build: `npm ci && npm run build`; publish: `dist` |

API environment variables: `DATABASE_URL` (Render Internal Database URL), `FRONTEND_URL` (exact HTTPS frontend origin, **no trailing slash**), and optional Google/Gemini credentials. Frontend build variable: `VITE_API_URL` (exact HTTPS backend origin, **no `/slots` suffix**). Render migrations are configured to run when `DATABASE_URL` is set. Never put backend secrets in a `VITE_` variable.

The free Render instance can sleep during inactivity, causing a slow first request. Render's Free PostgreSQL has lifecycle limits; the demo is not a permanent production service.

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/slots` | Create host availability |
| `GET` | `/slots` | List future unbooked slots, with `available` / `unavailableReason` |
| `POST` | `/bookings` | Save booking; return standard confirmation and short-lived confirmation token |
| `POST` | `/bookings/:bookingId/confirmation` | Generate optional AI message; body: `{ "token": "..." }` |

The confirmation token is intentionally only sent to the browser that created the booking. It expires after 10 minutes; it is stored only in the browser response and signed with an ephemeral server key. If the Render instance restarts, a pending AI request can fall back to the standard confirmation. Requests for the same booking reuse one Gemini result in a single instance.

## Tests

```bash
cd apps/api
npm ci
npm run test -- --runInBand
npm run build
npm run lint
```

```bash
cd apps/web
npm ci
npm run build
npm run lint
```

## AI tools used

**ChatGPT (OpenAI)** was used as a coding assistant for implementation ideas, debugging, documentation, and test examples. **Google Gemini API** is part of the running application, generating optional booking confirmation messages. Suggestions and outputs were reviewed and validated with builds, unit tests, and manual end-to-end booking tests.

## What I would improve with more time

- Add host authentication and authorization to protect slot creation.
- Add persistent rate limits / one-time AI confirmation tokens for multiple server instances.
- Add integration and browser end-to-end tests, plus monitoring for external API downtime.
- Add email notifications and better mobile accessibility/usability checks.

## Challenge scope and security

This is a **single-host coding challenge**, not a full production booking platform. There is intentionally no host login, so the online demo should not be used for real customer data. Avoid sharing `.env`, rotate any previously disclosed keys, and do not expose Google OAuth setup publicly. Database constraints protect against duplicate bookings; Calendar FreeBusy is advisory at booking time and cannot guarantee that a calendar event will not be added concurrently by a separate service.
