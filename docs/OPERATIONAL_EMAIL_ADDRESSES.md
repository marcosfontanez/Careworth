# PulseVerse — operational email addresses

Use this checklist when provisioning inboxes (Google Workspace, DNS MX, forwarding, etc.).  
Product-facing defaults are wired in `web/src/lib/site-constants.ts` and overridable via `NEXT_PUBLIC_*` in `web/.env.example`.

## Product / public (mailtos, legal, support flows)

| Address | Role |
|--------|------|
| `support@pulseverse.app` | User support (default `NEXT_PUBLIC_SUPPORT_EMAIL`) |
| `privacy@pulseverse.app` | Privacy / DSR (default `NEXT_PUBLIC_PRIVACY_EMAIL`) |
| `security@pulseverse.app` | Responsible disclosure / `security.txt` (default `NEXT_PUBLIC_SECURITY_EMAIL`) |
| `safety@pulseverse.app` | Child-safety / CSAE compliance (default `NEXT_PUBLIC_CHILD_SAFETY_EMAIL`; see `/child-safety`) |

## Store & platform

| Address | Role |
|--------|------|
| **`googleplayreview@pulseverse.app`** | **Google Play Console** — review team contact, policy mail, appeals, or dedicated Play inbox (create and monitor this inbox). |

## Notes

- **App Store Connect / Apple** often uses your Apple ID / team agent email; add those separately if you keep a written inventory.
- Add any **noreply@**, **billing@**, or **partnerships@** aliases here when you introduce them so this file stays the single list.
