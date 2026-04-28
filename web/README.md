# PulseVerse web platform

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI primitives). Public marketing site and protected admin console share one codebase.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Admin (mock auth)

1. Open `/admin/login`.
2. Enter any non-empty email and password.
3. Session cookie `pv_admin_session` unlocks `/admin/*` (see `src/middleware.ts`).

## Structure (high level)

| Area | Path |
|------|------|
| Public routes | `src/app/(marketing)/*` |
| Admin routes | `src/app/(admin)/admin/*` — shell in `(console)` |
| Design tokens | `src/lib/design-tokens.ts`, `src/app/globals.css` |
| Mock data | `src/mock/data.ts` |
| Marketing components | `src/components/marketing/*` |
| Admin components | `src/components/admin/*` |

## TODO / integrations

- Replace mock auth with Supabase (or your IdP) + `role_admin` checks.
- Wire admin tables to your API / Supabase with the same RLS as the mobile app.
- Add real analytics warehouse for Insights tabs.
- Silence monorepo Turbopack root warning: set `turbopack.root` in `next.config.ts` if the repo keeps two lockfiles.
