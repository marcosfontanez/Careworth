# PulseVerse web (Next.js)

Public marketing site and Supabase-authenticated admin console in one App Router project.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in values from the Supabase dashboard (Settings → API).

| Variable | Where used |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + admin data reads |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + admin data reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Contact form + newsletter (server only) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO (`metadataBase`, sitemap) |

On **Vercel**, add the same variables under Project → Settings → Environment Variables. After changing them, redeploy.

## Admin

1. Ensure your Supabase user has a row in `public.profiles` with **`role_admin = true`** (and has signed up via the same email in Auth).
2. Open `/admin/login` and sign in with that email and password.
3. Non-admin users are signed out and redirected with an error.

## Database

Apply migrations in `../supabase/migrations` through **189** (see `../supabase/migrations/LAUNCH_NOTES.md`).  
Migration **181** is **parked** under `../scripts/sql/parked/` — do not apply until feed QA signs off.

## Launch checklist

**Full step-by-step:** [`../docs/LAUNCH_RUNBOOK.md`](../docs/LAUNCH_RUNBOOK.md)

1. Set all variables in `.env.example` on Vercel (especially `NEXT_PUBLIC_SITE_URL`, contact emails, **`APPLE_UNIVERSAL_LINKS_APP_ID`**, **`ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS`**).
2. Apply Supabase migrations **176–189** (`npm run db:push` from repo root).
3. Deploy edge functions (`supabase/functions/README.txt`) — at minimum **pulse-shop-fulfillment** if IAP matters; **livekit-token** if Live is on.
4. Add **Auth redirect URLs** for your production domain in Supabase.
5. Have **counsel review** Privacy Policy and Terms before public marketing push.
6. Confirm at least one `profiles.role_admin` account can sign in at `/admin/login`.
7. **Deploy:** push to `main` if connected to Vercel, or `npx vercel deploy --prod` from `web/`.
8. **Mobile:** set EAS production secrets (Supabase URL/key, optional LiveKit, Sentry) and run a new `eas build`.

| Area | Path |
|------|------|
| Public routes | `src/app/(marketing)/*` |
| Admin routes | `src/app/(admin)/admin/*` |
| Supabase (server) | `src/lib/supabase/*` |
| Admin queries | `src/lib/admin/queries.ts` |
| Design tokens | `src/lib/design-tokens.ts` |
