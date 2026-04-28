# Branded video export (FFmpeg worker)

The app calls a **separate HTTPS service** when `EXPO_PUBLIC_VIDEO_EXPORT_URL` is set (base URL, no trailing slash). The client posts to:

`POST {EXPO_PUBLIC_VIDEO_EXPORT_URL}/v1/video-export`

## Request

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer <Supabase access_token>` — verify with Supabase JWT secret / JWKS before doing expensive work.

Body (`VideoExportJobRequestBody`):

| Field | Description |
| --- | --- |
| `sourceVideoUrl` | URL the worker can `GET` (signed storage URL from the client is OK). |
| `endCard` | Creator metadata for drawtext overlays. Already **sanitized** for anonymous posts (generic “PulseVerse member”, no handle). |
| `anonymousExport` | `true` when the post is anonymous — worker must not substitute real names from `postId`. |
| `postId` | For logging / abuse review only. |
| `burnWatermark` | When true, burn the same corner PulseVerse mark as in-app (`VideoBrandWatermark` layout). |

## Response

### Synchronous (worker finishes inside the HTTP request)

`200` JSON:

```json
{ "outputUrl": "https://your-cdn-or-storage/exports/....mp4" }
```

### Asynchronous (recommended for premium UX under load)

`200` JSON:

```json
{ "jobId": "uuid-or-opaque-id" }
```

The app polls:

`GET {EXPO_PUBLIC_VIDEO_EXPORT_URL}/v1/video-export/jobs/{jobId}`

Headers: same `Authorization: Bearer <access_token>`.

Poll response (`VideoExportJobStatusBody`):

| status | Meaning |
| --- | --- |
| `queued` | Waiting for a worker |
| `processing` | FFmpeg running |
| `completed` | Done — include `outputUrl` |
| `failed` | Include `error` (human-readable) |

Optional field: `progress` (number `0`–`1`) for a determinate progress bar in the app.

Example completed payload:

```json
{ "status": "completed", "outputUrl": "https://..." }
```

`outputUrl` must be fetchable by the **mobile app** (short-lived signed URL is ideal). Time out long jobs server-side; the client stops polling after ~120s.

## Suggested FFmpeg outline

1. Download `sourceVideoUrl` to a temp file.
2. Copy bundled end-card master `pulseverse-endcard.mp4` (same asset as `assets/video/pulseverse-endcard.mp4`) into the worker image or fetch from fixed storage.
3. **End-card segment:** overlay text from `endCard` to match `PulseVerseVideoEndCard` / `getEndCardCreatorLines` (primary @handle or name, secondary role line, small “PulseVerse” line). Use `drawtext` with a bundled font (e.g. Inter Bold), escape special characters, or render PNG subtitles.
4. **Watermark:** when `burnWatermark` is true, overlay the PulseVerse logo PNG **bottom-center** (`overlay=(W-w)/2:H-h-110`), scaled small (~88px) and ~70% alpha (`format=rgba,colorchannelmixer=aa=0.7`), to match the in-app `VideoBrandWatermark` placement.
5. Concat: `[0:v][0:a]` main + `[1:v][1:a]` end card — normalize resolution (scale/pad to 1080×1920), align audio sample rate, then `concat` demuxer or `concat` filter.
6. Upload result to object storage; return signed `outputUrl`.

Exact `ffmpeg` flags depend on codecs; keep **H.264 + AAC** for broad social compatibility.

## Repo / asset delivery

`pulseverse-endcard.mp4` (~2.5 MB) is fine to keep in git for the mobile app. For the worker, either bake it into the Docker image or sync from the same object storage bucket. Use **Git LFS** only if you replace it with a much larger master later.

## Product QA checklist (devices)

- iOS + Android: exported file plays; end-card **audio** audible; loop segment not needed in export (one play-through).
- Anonymous post: exported file shows **no** real name or @handle.
- Feed: watermark readable on notch / island devices; duet / PiP layout not covered by watermark; tab-embedded feed uses a higher watermark (`topPercent` ~0.16).

## Deploy (reference implementation)

See **`export-worker/README.md`** (Docker, Fly.io, env vars) and **`fly.export-worker.toml`** at the repo root. Apply Supabase migration **`036_exports_storage_bucket.sql`** before first deploy.
