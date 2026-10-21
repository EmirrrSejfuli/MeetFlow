# MeetFlow

A simple meeting scheduler built with **React + TypeScript**, **NestJS**, and **PostgreSQL**. One host publishes available time slots; guests book a slot with their name and email.

## Implemented features

- Create and list future time slots in the `Europe/Skopje` time zone.
- Book available slots; PostgreSQL prevents duplicate bookings and overlapping host slots.
- Check the host's **Google Calendar** for busy periods before booking (OAuth 2.0 / FreeBusy).
- Confirm reservations immediately, then optionally generate a personalized **Gemini AI** message in a separate request. Standard confirmation works if AI is unavailable.

## Requirements

- Node.js 24 and npm
- Docker with Docker Compose
- Google Cloud OAuth credentials and a Gemini API key for the two optional integrations

## Run locally

1. Copy `.env.example` to `.env` in the project root and fill in your **private** credentials. Never commit `.env`.
2. Start PostgreSQL from the project root:
   ```powershell
   docker compose up -d
   ```
3. In one terminal, install and start the API:
   ```powershell
   cd apps/api
   npm.cmd ci
   npx.cmd typeorm-ts-node-esm migration:run -d src/database/data-source.ts
   npm.cmd run start:dev
   ```
4. In another terminal, start the frontend:
   ```powershell
   cd apps/web
   npm.cmd ci
   npm.cmd run dev
   ```
5. Open http://localhost:5173 (API: http://localhost:3000).

The Google Calendar connection is configured **locally only** by visiting `http://localhost:3000/google-calendar/connect` after filling in the OAuth client credentials. The OAuth redirect URI must match `GOOGLE_REDIRECT_URI`. Add the returned refresh token to the private `.env` file and restart the API. The connected Google account should be the host's account.

## Checks

Run `npm.cmd run test -- --runInBand`, `npm.cmd run build`, and `npm.cmd run lint` inside `apps/api`. Run `npm.cmd run build` and `npm.cmd run lint` inside `apps/web`.

## Scope and security notes

This is a **single-host coding challenge**, not a multi-user production service. Host slot creation and AI confirmation endpoints do not have user authentication. The API currently uses a localhost database address and allows CORS from localhost; these settings need adaptation before deploying to a remote host. Protect the Gemini endpoint from public abuse before exposing it online. Google OAuth setup is intentionally restricted to local development. Use rotated secrets if any token was accidentally disclosed.
