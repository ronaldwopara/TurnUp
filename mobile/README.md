# TurnUp Mobile (Expo)

React Native client for TurnUp. It uses the existing Next.js app as the backend API while the web app continues to run unchanged at the repo root.

## Setup

1. Copy `mobile/.env.example` to `mobile/.env`.
2. Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the same value as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the web `.env.local`.
3. Set `EXPO_PUBLIC_API_URL`:
   - Simulator/emulator: `http://localhost:3000`
   - Physical device: `http://<your-computer-lan-ip>:3000`
4. Install dependencies:

```bash
cd mobile
npm install
```

5. Start the web backend (separate terminal):

```bash
npm run dev
```

6. Start the mobile app:

```bash
npm run dev:mobile
# or: cd mobile && npm start
```

## Screens

- **Browse** — trending catalog + community flyers from `GET /api/flyers`
- **Camera** — native capture/upload → `POST /api/ingest/image`, link ingest → `POST /api/ingest/link`
- **Profile** — stash + insights from `GET /api/profile`, includes API smoke test when signed in

## Clerk

Use the same Clerk application as the web client. Add Expo redirect URLs in the Clerk dashboard (scheme: `turnup://`).
