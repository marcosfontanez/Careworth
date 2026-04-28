# PulseVerse video export worker

Node + FFmpeg service: **`POST /v1/video-export`** enqueues a job, **`GET /v1/video-export/jobs/:id`** returns status and a signed **`outputUrl`** when complete.

Full API notes: [`../services/export/FFMPEG_EXPORT.md`](../services/export/FFMPEG_EXPORT.md).

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | Default `8080` |
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Uploads to `exports` bucket |
| `SUPABASE_JWT_SECRET` | yes | Verifies `Authorization: Bearer` (same as Supabase API JWT secret) |
| `EXPORT_RATE_LIMIT_PER_HOUR` | no | Default `20` per user |
| `EXPORT_SIGNED_URL_SECS` | no | Default `3600` |
| `BUNDLED_DIR` | no | Override path to `pulseverse-endcard.mp4` + logo (default `./bundled` next to `dist/`) |

## Database

Apply migration **`036_exports_storage_bucket.sql`** so bucket `exports` exists (private).

## Local dev

From **repo root**:

```bash
cd export-worker
npm install
npm run sync-assets   # optional: copies assets into ./bundled for local runs
cp .env.example .env  # fill in
npm run dev
```

Requires **FFmpeg** and **DejaVu** fonts on PATH (Linux/macOS; Windows use WSL or Docker).

## Docker

From **repo root**:

```bash
docker build -f Dockerfile.export-worker -t pulseverse-export .
docker run --rm -p 8080:8080 --env-file export-worker/.env pulseverse-export
```

## Fly.io

1. `fly apps create pulseverse-export` (or change `app` in `fly.export-worker.toml`)
2. `fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=...`
3. From repo root: `fly deploy -c fly.export-worker.toml`

## Mobile app

Set **`EXPO_PUBLIC_VIDEO_EXPORT_URL`** to `https://<your-fly-app>.fly.dev` (no trailing slash).

## Logs & limits

- Jobs and FFmpeg errors log to stdout (`[export] <jobId> <postId> <message>`).
- In-memory job store; restart clears state. For production scale, swap in Redis + workers.

## Testing checklist

See [`TESTING.md`](./TESTING.md).
