# PulseVerse — operational email addresses

Use this checklist when provisioning inboxes (Google Workspace, DNS MX, forwarding, etc.).  
Product-facing defaults are wired in `web/src/lib/site-constants.ts` and overridable via `NEXT_PUBLIC_*` in `web/.env.example`.

## Product / public (mailtos, legal, support flows)

| Address | Role |
|--------|------|
| `support@pulseverse.app` | User support (`NEXT_PUBLIC_SUPPORT_EMAIL` / `EXPO_PUBLIC_SUPPORT_EMAIL`) |
| `privacy@pulseverse.app` | Privacy / DSR (`NEXT_PUBLIC_PRIVACY_EMAIL` / `EXPO_PUBLIC_PRIVACY_EMAIL`) |
| `legal@pulseverse.app` | Terms questions (`NEXT_PUBLIC_LEGAL_EMAIL` / `EXPO_PUBLIC_LEGAL_EMAIL`) |
| `security@pulseverse.app` | Responsible disclosure / `security.txt` (`NEXT_PUBLIC_SECURITY_EMAIL` / `EXPO_PUBLIC_SECURITY_EMAIL`) |
| `safety@pulseverse.app` | Child-safety / CSAE (`NEXT_PUBLIC_CHILD_SAFETY_EMAIL` / `EXPO_PUBLIC_CHILD_SAFETY_EMAIL`; see `/child-safety`) |

## Store & platform

| Address | Role |
|--------|------|
| **`googleplayreview@pulseverse.app`** | **Google Play Console** — review team contact, policy mail, appeals, or dedicated Play inbox (create and monitor this inbox). |

## Routing to one inbox (solo operator)

**Option A — recommended for production:** Keep `@pulseverse.app` in the product UI; in **Google Workspace** (or your DNS host), forward each alias above to your main inbox.

**Option B — override at build time:** Set all `NEXT_PUBLIC_*` (web) and `EXPO_PUBLIC_*` (app) contact vars to the same address. Example for local dev: copy root `.env.example` → `.env.local` and `web/.env.example` → `web/.env.local` (both are gitignored).

**Vercel (production website):** Project → **Settings** → **Environment Variables** → add the five `NEXT_PUBLIC_*` keys for **Production** (use aliases or your main inbox).

**EAS (TestFlight / App Store):** Project → **Environment variables** → same five keys with `EXPO_PUBLIC_` prefix for the **production** profile, then run a new build.

Code references: `web/src/lib/site-constants.ts`, `lib/contactEmails.ts`, `constants/launch.ts`.

## Notes

- **App Store Connect / Apple** often uses your Apple ID / team agent email; add those separately if you keep a written inventory.
- Add any **noreply@**, **billing@**, or **partnerships@** aliases here when you introduce them so this file stays the single list.
