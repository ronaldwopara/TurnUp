# TurnUp

Mobile-first campus event discovery app.

## Backend (Phase 2)

TurnUp now includes a Next.js Route Handler backend for:

- flyer image ingestion and multimodal extraction,
- social link ingestion,
- QR detection and URL enrichment,
- profile stash persistence,
- learned-fact insight regeneration.

### 1) Setup

1. Copy `.env.example` to `.env.local`.
2. Fill `TURNUP_LLM_API_KEY` (or leave blank to use fallback extraction behavior).
3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and create local SQLite DB:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

5. Start app:

```bash
npm run dev
```

### 2) API Endpoints

- `POST /api/ingest/image`
  - accepts `multipart/form-data` (`file`, optional `userId`)
  - or JSON `{ base64Image, mimeType, userId }`
- `POST /api/ingest/link`
  - accepts `{ url, userId }`
- `GET /api/profile?userId=demo-user`
- `POST /api/profile/stash`
- `POST /api/profile/insights/regenerate`

### 3) Response Shape for Profile UI

`GET /api/profile` returns:

- `profile` header metadata,
- `stashes[]` entries for docs/links/images/videos,
- `learnedFacts[]` with short insight text + confidence/type.

### 4) Quick Verification

- Run lint: `npm run lint`
- Run tests: `npm run test`
- See request samples in `docs/api-samples.http`
