# Export worker — QA checklist

Run against a deployed base URL with the app’s **`EXPO_PUBLIC_VIDEO_EXPORT_URL`** set.

## API

1. **Health:** `GET /health` → `{ "ok": true }`
2. **Auth:** `POST /v1/video-export` without `Authorization` → `401`
3. **Rate limit:** exceed **`EXPORT_RATE_LIMIT_PER_HOUR`** from one user → `429`
4. **Happy path:** valid JWT + public/signed `sourceVideoUrl` → `{ "jobId" }`, then poll until `completed` + `outputUrl`
5. **Isolation:** User A’s `jobId` with User B’s token → `403`

## Video

6. Output plays in QuickTime / Photos; resolution ~1080×1920; end card audio present after main clip.
7. **Anonymous** `endCard` (generic “PulseVerse member”, no handle) matches what the app sends — no extra PII on screen.
8. **Watermark:** with `burnWatermark: true`, logo appears bottom-left on main segment when `pulseverse-logo.png` is bundled.

## App integration

9. Long-press **Download** on a video: overlay progress → **Saved** → file in gallery.
10. **Cancel** during progress: modal closes; **`media_export_fail`** `reason: user_cancelled` (if analytics wired).
11. **Error** path: **Save original** still works; analytics `post_media_download_raw` + `source: export_error_fallback`.
12. Success auto-dismiss (≈5s) or **Done** / **Share clip** immediately.

## Analytics DB

13. `analytics_events.event_name` is **text** — no migration needed for `media_export_*` / `post_media_download_raw`.

## Repo

14. **`pulseverse-endcard.mp4`** stays in git (~2.5 MB). Use **Git LFS** only if the master grows much larger.
