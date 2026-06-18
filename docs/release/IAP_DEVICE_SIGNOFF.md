# IAP / Shop — Phase 10.5 Device Signoff

Record TestFlight or dev-build sandbox smoke before cutting `release/rc-onboarding-circles-pulse-2026`.

**Status:** NOT COMPLETE — device smoke must be run on a build with `com.pulseverse.app` (not Expo Go).

| Field | Result |
|-------|--------|
| **Date/time** | _pending_ |
| **Tester** | _pending_ |
| **Build type** | TestFlight / dev build — _pending_ |
| **Sandbox account signed in** | yes / no — _pending_ |

## Checklist

| # | Test | Result |
|---|------|--------|
| 1 | Shop opens (no crash, no password on open, no spinner loop) | PASS / FAIL — _pending_ |
| 2 | Products load (Sparks, borders, prices, StoreKit diagnostics) | PASS / FAIL — _pending_ |
| 3 | Cancel purchase (sheet once, clean return, button unlocks) | PASS / FAIL — _pending_ |
| 4 | Successful sandbox purchase / fulfillment | PASS / FAIL — _pending_ |
| 5 | Restore purchases (Settings) | PASS / FAIL — _pending_ |
| 6 | Reopen Shop (no auto password prompt) | PASS / FAIL — _pending_ |
| 7 | Regression (Feed, Circles, My Pulse, Settings; no sponsored cards) | PASS / FAIL — _pending_ |

## If any FAIL — paste here

```
StoreKit diagnostics:
(paste block from Shop → staff banner → copy)

[IAP] logs:
(paste Metro / Xcode lines)

SKU tapped:
(build type + sandbox signed in)
```

## Signoff

- [ ] All seven checks PASS
- [ ] Signed: __________________ Date: __________
