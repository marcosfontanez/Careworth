# Creator media worker — deploy to Fly.io

Always-on server that processes **Feed clip trim**, **stitch**, and **B-roll** jobs from `public.creator_media_jobs`.

You do **not** need your laptop running once this is deployed.

---

## What you need first

| Prerequisite | Why |
|--------------|-----|
| Supabase migrations **184+**, **186**, **207+** (trim) | Worker claim RPC + trim jobs |
| **Rotated service role key** (not pasted in chat) | Worker auth |
| [Fly.io account](https://fly.io) + `flyctl` | Hosting |
| Clip/stitch feature ready to test | Optional until migrations applied |

---

## One-time setup (Marco — numbered steps)

### 1. Install Fly CLI

1. Open **https://fly.io/docs/flyctl/install/**
2. Install **flyctl** for Windows (PowerShell installer is fine).
3. Close and reopen PowerShell.
4. Run:

```powershell
fly version
```

You should see a version number.

### 2. Log in to Fly

```powershell
fly auth login
```

A browser window opens — sign in or create a Fly account.

### 3. Create the app (once)

From `C:\Users\marco\CareWorth`:

```powershell
cd C:\Users\marco\CareWorth
fly apps create pulseverse-creator-media
```

If the name is taken, pick another name and edit `app = '...'` in `fly.creator-media-worker.toml`.

### 4. Set secrets (service role — server only)

1. Open **Supabase Dashboard → Project Settings → API**.
2. Copy **Project URL** and **service_role** key (after any rotation).

```powershell
fly secrets set `
  SUPABASE_URL="https://YOUR_PROJECT.supabase.co" `
  SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" `
  -a pulseverse-creator-media
```

**No space** after `https://`. Never put this key in the Expo app.

### 5. Deploy

```powershell
cd C:\Users\marco\CareWorth
fly deploy -c fly.creator-media-worker.toml
```

First deploy takes a few minutes (Docker build + ffmpeg).

### 6. Confirm it is running

```powershell
fly status -a pulseverse-creator-media
fly logs -a pulseverse-creator-media
```

**Healthy signs:**

- `health listening on 8080`
- `[worker] no queued stitch/broll/trim jobs` (idle is OK)

Open in browser (optional): `https://pulseverse-creator-media.fly.dev/health` → should show `ok`.

---

## Test a clip from the app

1. **Stop** the worker on your laptop (Ctrl+C in local PowerShell) so only Fly processes jobs.
2. In the app, publish a **Feed clip** or **stitch** upload.
3. Watch Fly logs:

```powershell
fly logs -a pulseverse-creator-media
```

**Success:**

```text
[worker] trim succeeded ...
```

or

```text
[worker] succeeded ... stitch
```

4. In **Supabase SQL Editor**, newest post should get `media_url` and cleared `media_processing_status`.

---

## Updating after code changes

When `scripts/creator-media-worker.mjs` changes:

```powershell
cd C:\Users\marco\CareWorth
fly deploy -c fly.creator-media-worker.toml
```

---

## Cost (rough)

- **Fly.io** `shared-cpu-1x` + **1GB RAM**, always on: on the order of **~$5–10/month** (check current Fly pricing).
- Cheaper than leaving a full VPS unmanaged if you only need this one process.

---

## Local dev vs production

| Environment | Command |
|-------------|---------|
| **Local testing** | `$env:SUPABASE_URL=...; $env:SUPABASE_SERVICE_ROLE_KEY=...; npm run worker:media -- --watch` |
| **Production / beta** | Fly app `pulseverse-creator-media` (this doc) |

Run **one** worker fleet at a time per Supabase project (local **or** Fly), or jobs may race — usually Fly only in shared environments.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Invalid supabaseUrl` | Remove spaces in `SUPABASE_URL` secret; redeploy secrets |
| Jobs stay `queued` | `fly logs` — machine running? Migrations 207+ applied? |
| `claim_next_creator_media_job RPC failed` | Apply migrations **184**, **186**, **207** on Supabase |
| Health check failing | `fly logs` — worker crash on startup? Check secrets |
| Clip UI missing | App flag `feedClipping` + migrations **210+** — separate from worker |

---

## Related files

| File | Purpose |
|------|---------|
| `scripts/creator-media-worker.mjs` | Worker logic |
| `Dockerfile.creator-media-worker` | Docker image (Node + ffmpeg) |
| `fly.creator-media-worker.toml` | Fly config |
| `creator-media-worker/package.json` | Minimal deps for Docker build |
| `scripts/sql/creator-media-jobs-observability.sql` | SQL ops queries |
