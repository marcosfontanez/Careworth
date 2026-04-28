# CareWorth web (Next.js)

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

Apply migrations in `../supabase/migrations` (including `064_web_marketing_leads_and_admin_rls.sql`) so marketing tables and admin RLS policies exist.

## Structure

| Area | Path |
|------|------|
| Public routes | `src/app/(marketing)/*` |
| Admin routes | `src/app/(admin)/admin/*` |
| Supabase (server) | `src/lib/supabase/*` |
| Admin queries | `src/lib/admin/queries.ts` |
| Design tokens | `src/lib/design-tokens.ts` |
