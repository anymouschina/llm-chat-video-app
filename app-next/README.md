# Personal Sora Station (Next.js + Prisma + Postgres)

MVP for private image-to-video and text-to-video workflows. API calls to model services are reserved; integrate later via n8n.

## Quick Start
- Start Postgres (optional via Docker):
  ```bash
  cd app-next
  docker compose up -d
  ```
- Copy env and set `DATABASE_URL` (and optional `N8N_WEBHOOK_URL`):
  ```bash
  cp .env.example .env
  ```
- Install deps and init DB:
  ```bash
  npm install
  npm run prisma:generate
  npm run prisma:migrate
  ```
- Run dev server:
  ```bash
  npm run dev
  ```
- Open: http://localhost:3000

## API Endpoints
- `POST /api/tasks` Create task (type: `IMAGE_TO_VIDEO` | `TEXT_TO_VIDEO`).
  - Body: `{ type, prompt?, params?, imageDataUrl? }`
  - If `N8N_T2V_WEBHOOK_URL`/`N8N_I2V_WEBHOOK_URL` is set, a webhook is triggered with `{ taskId, prompt, params, callbackUrl }` (and image later).
  - Response: `{ id, accepted }` where `accepted=true` means provider acknowledged and status set to `RUNNING`.
- `GET /api/tasks` List recent tasks.
- `GET /api/tasks/:id` Get task status.
- `POST /api/tasks/:id/callback` For n8n to update `{ status, videoUrl?, error? }`.

## Pages
- `/zh/image-to-video` Upload image, set params, create task.
- `/zh/text-to-video` Text prompt to create task.
- `/history` Polls and displays tasks; plays video via `<video>` when ready.

Notes
- No auth, billing, or risk-control. Private use only.
- For text-to-video, the app now calls the n8n webhook (if provided) and expects n8n to call back with a `videoUrl`.
- Image upload and OSS storage are reserved. Endpoint `/api/uploads` returns 501 until wired.
- Configure public base URL with `PUBLIC_BASE_URL` if behind a proxy; otherwise it infers from request headers when building callbacks.
