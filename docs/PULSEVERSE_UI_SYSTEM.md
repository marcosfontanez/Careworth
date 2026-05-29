# PulseVerse UI System

**Purpose:** Lightweight guardrails so new work uses the shared PulseVerse design system instead of one-off styles.

**Canonical implementation**

| Layer | Path |
|-------|------|
| Tokens | `lib/theme/pulseTheme.ts` |
| Primitives | `components/ui/pulse/*` |
| Barrel import | `@/components/ui/pulse` |
| Brand vision (broader) | `docs/UI_VISION.md` |

Legacy `@/theme` (`theme/colors.ts`, etc.) still exists for unmigrated screens. **New Live and shared UI should use `pulseTheme` + pulse components.**

---

## Design identity

- **Premium healthcare-social** — dark, cinematic, restrained neon glass (not gamer-heavy).
- **Deep navy canvas** with **elevated glass surfaces** and **teal / purple / pink pulse accents**.
- **Gold** = premium / gift / featured only where hierarchy needs it.
- **Red live / danger** = live status and destructive actions only.
- **Video-first** on Live viewer; **dashboard** on Host Studio; **media workspace** on Clip Studio.
- **No** flat black slabs, random gradients, profile-as-live-preview, or image-baked text.

---

## Color tokens

Import from `@/lib/theme/pulseTheme` or `@/components/ui/pulse`:

| Token | Value | Use |
|-------|-------|-----|
| `pulseColors.background` | `#07111F` | Screen base |
| `pulseColors.surface` | `#0D1B2E` | Cards, panels |
| `pulseColors.glass` | `rgba(15, 28, 48, 0.82)` | Overlays, inputs, dock |
| `pulseColors.teal` | `#19D3C5` | Primary accent, CTAs |
| `pulseColors.purple` | `#8B5CF6` | Premium / Q&A / featured |
| `pulseColors.pink` | `#FF4FD8` | Pulse accent (sparingly) |
| `pulseColors.live` | `#FF3B5C` | LIVE badge, live status |
| `pulseColors.gift` | `#F6C453` | Gifts, premium chips |
| `pulseColors.success` | `#2EE59D` | Healthy / approved |
| `pulseColors.warning` | `#F59E0B` | Caution |
| `pulseColors.danger` | `#F87171` | Errors, reject, block |
| `pulseColors.text` | `#F8FAFC` | Primary text |
| `pulseColors.mutedText` | `#93A4B8` | Meta, captions |
| `pulseColors.border` | `rgba(255,255,255,0.08)` | Default rim |

Gradients: `pulseGradients.screen`, `primaryCta`, `gift`, `live`, `premium`.

**Rule:** Do not paste brand hex values into screen files. Add a token in `pulseTheme.ts` if a new semantic color is needed.

---

## Spacing & radius

Use **`pulseSpacing`** (`xxs` → `5xl`) and **`pulseRadius`** (`sm` → `full`, plus semantic `card`, `chip`, `button`, `sheet`).

| Pattern | Token |
|---------|-------|
| Screen horizontal padding | `pulseSpacing.lg` – `xl` |
| Card padding | `pulseSpacing.lg` |
| Section gap | `pulseSpacing.md` – `lg` |
| Card corners | `pulseRadius.card` (22) |
| Buttons / pills | `pulseRadius.button` or `full` |
| Bottom sheet top | `pulseRadius.sheet` (28) |
| Chips | `pulseRadius.chip` / `full` |

Avoid magic numbers like `padding: 14` unless layout-specific (e.g. thumbnail width).

---

## Typography

Spread **`pulseTypography`** styles; do not invent parallel scales.

| Style | Role |
|-------|------|
| `screenTitle` | Full-screen titles |
| `sectionTitle` | Sheet / panel headers |
| `cardTitle` | Card headings |
| `body` / `bodySmall` | Paragraphs |
| `caption` | Meta, counts |
| `label` | Uppercase section kicker |
| `button` | Label on filled buttons |
| `stat` | Metrics (Clip Studio recap) |

Hierarchy: title → section → card title → muted meta. Never let meta compete with titles.

---

## Buttons

Use **`PulseButton`** or **`PulseIconButton`**.

| Variant | When |
|---------|------|
| `primary` | Main CTA (Go Live, Save, Generate) |
| `secondary` | Alternate confirm, toolbar actions |
| `ghost` | Tertiary / low emphasis |
| `danger` | End stream, reject, delete |
| `gift` | Gift send, Sparks commerce |

Support `loading`, `disabled`, `fullWidth`, `leftIcon` / `rightIcon`. Do not hand-roll gradient buttons on Live surfaces.

---

## Cards

Use **`PulseCard`** or **`PulseGlassCard`**.

| Variant | When |
|---------|------|
| `default` | Standard panel content |
| `glass` | Sheets, stream info, clip rows |
| `elevated` | Emphasis within dashboards |
| `danger` | Safety / destructive context |
| `gift` | Gift or premium highlight |

Prefer `padded={true}` (default). Use `PulseSectionHeader` above card groups instead of ad-hoc title rows.

---

## Bottom sheets

Use **`PulseBottomSheet`** (Live code may import via `LiveBottomSheet` alias).

Shared behavior: dark glass surface, top radius `pulseRadius.sheet`, handle, title + close, safe-area padding, optional `scrollable`.

All viewer/host interaction sheets (chat, gift, poll, Q&A, clip, stream info) must use this component — not custom `Modal` shells.

---

## Live-specific UI rules

**Viewer Live (video-first)**

- Minimal HUD: `PulseChip` (LIVE), viewer count, back + audio `PulseIconButton`.
- Bottom dock: glass input + icon actions; no giant overlays on video.
- Sheets for chat, gifts, polls, Q&A, clip moment, stream info.
- Empty/error: `PulseEmptyState` / `PulseErrorState` on `PulseScreen`.

**Host Live Studio (creator dashboard)**

- Status row: `PulseChip` (timer, viewers, mic, scene).
- Tabs: `LiveManagerTabs` styling (pulse gradient active pill) or `PulseTabs` where icons not needed.
- Panels: `PulseGlassCard` + `PulseSectionHeader` via `StreamManagerPanelShell`.
- Quick actions: `QuickActionGrid` (studio-specific layout; tokens from `pulseTheme`).
- Health: `PulseCard` + `PulseChip` per metric.

**Happening Now**

- Hero: `FeaturedLiveCard` + `LivePill`; branded placeholder, not profile-as-preview.
- Empty: `PulseEmptyState` + primary CTA.

---

## Clip Studio UI rules

- Canvas: `pulseGradients.screen` on `PulseScreen` or root gradient.
- Steps: `PulseTabs` (Markers / Editor / Clips).
- Header: `PulseIconButton` (close, library).
- Primary action: `PulseButton` `variant="primary"` (Generate clip).
- Clip rows: `PulseCard variant="glass"`.
- Empty / migration gates: `PulseEmptyState`.
- Loading: `PulseLoadingSkeleton`.
- Post-live recap: `LivePostStreamSummary` (`PulseGlassCard`).

Keep editor density (presets, trim inputs) local, but colors/spacing/radius from `pulseTheme`.

---

## Correct usage examples

```tsx
import {
  PulseBottomSheet,
  PulseButton,
  PulseCard,
  PulseChip,
  PulseEmptyState,
  pulseColors,
  pulseSpacing,
} from '@/components/ui/pulse';

<PulseCard variant="glass">
  <PulseChip label="LIVE" tone="live" icon="radio-outline" />
</PulseCard>

<PulseButton label="Go Live" variant="primary" leftIcon="videocam-outline" onPress={onGoLive} />

<PulseBottomSheet visible={open} onClose={onClose} title="Live poll" scrollable>
  {/* content */}
</PulseBottomSheet>

<PulseEmptyState
  icon="cut-outline"
  title="No clips yet"
  message="Generated clips appear here as drafts."
  actionLabel="Open Clip Studio"
  onAction={onOpenStudio}
/>
```

Live sheets (backward compatible):

```tsx
import { LiveBottomSheet } from '@/components/live/LiveBottomSheet';
// Same API as PulseBottomSheet — prefer @/components/ui/pulse for new code.
```

---

## Do not use

- Raw brand hex in `app/`, `components/` screen files (`#19D3C5`, `#07111F`, etc.).
- New one-off bottom sheet modals on Live surfaces.
- Flat `backgroundColor: '#060E1A'` cards without glass/rim tokens.
- Legacy `colors.primary.teal` (`#14B8A6`) on **new** Live or pulse-migrated UI — it diverges from `pulseColors.teal`.
- Giant HUD strips, profile/Pulse score bars over live video.
- Random full-screen gradients per screen.
- Image-baked text; keep native `Text` and vector icons.
- Duplicating `PulseButton` / `PulseCard` styling with copy-pasted `StyleSheet` blocks.

**OK exceptions (document in PR if touched):**

- User-generated palettes (avatar builder, brand kit, circle accents).
- Third-party / chart colors.
- Token definition file `lib/theme/pulseTheme.ts`.
- Legacy `@/theme` until that screen is migrated.

---

## Migration checklist (new feature)

1. Can an existing **`components/ui/pulse`** primitive be used?
2. If not, can **`pulseTheme` tokens** cover spacing/color/radius/type?
3. Only then add **local layout** styles (widths, flex, media aspect ratios).
4. For new semantic colors, extend **`pulseTheme.ts`** — not inline hex.

---

## Related docs

- `docs/UI_VISION.md` — full brand & layout vision
- `.cursor/rules/pulseverse-design-system.mdc` — agent rule (always on)
