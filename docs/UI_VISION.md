# PulseVerse — UI, layout, and visual vision

**Purpose:** Single reference for how the app should **look**, **feel**, and **be laid out**. When new layout/UI prompts arrive, append them here (dated) so designers, engineers, and AI assistants can realign without re-reading long threads.

**How to use**

1. Add a new dated section under [Vision log](#vision-log) for each batch of direction you contribute.
2. If something **overrides** earlier guidance, note that explicitly (“Supersedes …”).
3. Link to mockups or Figma when available (`file://` or repo paths under `assets/`).

---

## PulseVerse Visual System (mandatory — all screens)

**Single source for how every PulseVerse screen should look.** Cursor/agents: **`.cursor/rules/pulseverse-design-system.mdc`** (always on). Implement via **`theme/`** + **reusable components** — not one-off styles.

### Brand feel

- **Premium**, **futuristic**, **polished**, **cinematic**
- **Luxury dark UI**; **healthcare-social** but **elevated**, not sterile
- **Neon glass**, but **restrained** and **expensive** — not novelty signage

### Overall look

- **Deep navy / near-black** base; **layered** surfaces (never flat black)
- **Subtle cyan / teal / electric blue** glow; **occasional premium gold** for featured / legendary / verified
- **Clean typography**, **large breathing room**, **premium contrast hierarchy**
- **Rounded surfaces**, **soft glassmorphism**, **vivid but controlled** light accents

### Background

- **Base:** dark **navy–black gradient** (rich, dimensional)
- **Texture:** subtle **vertical** or **radial** treatment where appropriate
- **Motion (optional):** faint **moving streaks / particles only if** used — slow, subtle; **never noisy**
- **Never:** flat black; busy or cheap noise

### Card style (major cards)

- **Fill:** approximately `rgba(12,18,32,0.82)` → `rgba(18,26,44,0.92)` (layered feel)
- **Glass:** **backdrop blur** when the stack supports it (web/native)
- **Radius:** **20–28px** (align with theme `borderRadius` tokens)
- **Border:** **~1px**, cyan-blue **low-opacity** edge
- **Depth:** **soft shadow** underneath; **faint outer cyan glow** **only** where hierarchy demands
- **Interior:** softly **illuminated** — gradient/veil — not a flat slab

### Glass / neon treatment

- **Subtle** glassmorphism — not frosted overload
- **Glow is selective and premium**; **avoid** thick bright outlines on **every** element
- **Strongest glow:** primary **CTAs**, **featured** cards, **active tabs**, **premium icons**
- **Secondary UI:** **much softer** glow (or none)

### Button system

| Role | Treatment |
|------|-----------|
| **Primary** | Strong **cyan → electric-blue** gradient; **high-contrast white** text; **pill** or **rounded rect**; soft **glow halo**; **inner highlight**; press/hover **slightly darker**, glow **tightens** |
| **Secondary** | **Dark glass**; **subtle** border; **cyan or white** text; **minimal** glow |
| **Danger / warning / low emphasis** | **Subdued** — not loud |

### Typography hierarchy

- **Bold, clean, premium** titles — clear **steps**:
  - **Screen title:** large, bold
  - **Section title:** medium-large, semibold
  - **Card title:** medium, bold
  - **Metadata:** smaller, **muted**
- **No cramped** stacks; supporting copy must **not compete** with main titles

### Spacing

- **Generous** padding; **editorial** vertical rhythm; **consistent scale**
- Cards **not** packed **edge-to-edge**
- **Avoid** crowded chip rows and **tiny** margins

### Chips / badges

- **Compact** premium **capsules**; low height, clean padding
- **Restrained** colors; **rarity** badges may stand out **most**
- Supporting chips **must not** overpower the card

### Icons

- **Outlined** or **soft filled** — **consistent** family
- **Premium glow** for **active** only
- **No** cartoonish or mixed styles

### Featured hero cards

Must feel **special** vs standard cards:

- **Stronger** lighting; **richer** background gradient
- **Spotlight** behind featured object (or equivalent depth)
- **Clear CTA**; **stronger** badge row
- **Elegant depth** — **flagship / premium drop** energy

### Bottom navigation

- **Darker glass** bar
- **Subtle glow** on **active** tab
- **Premium center action** (if applicable)
- Icons **precise** and **modern**

### Do not

- Generic **flat** dark cards
- **Overuse** bright outlines, **blur**, or **equal glow** on everything
- **Cram** content into small spaces
- **Gaming-style** neon overload; **childish** gradients

### Goal

Every screen should read as a **premium luxury social** app with **cinematic neon-glass** polish.

### Motion (global)

Slow, subtle, readable; respect **reduced motion**; pause animation when off-screen where practical.

---

## Pulse Shop (captured from direction to date)

### Shop entry card (Creator hub)

- **Role:** Clear “destination” to Pulse Shop — must not feel flat or easy to overlook.
- **Structure (mockup-aligned):** “FEATURED” **gold** kicker pill (dark fill), **serif** “Pulse Shop” (**Pulse** white, **Shop** lavender), **sans** subtitle *Premium borders, rewards and creator extras.*
- **Highlights row:** Icons + labels (e.g. shield / gift / diamond) with **thin vertical dividers** — not chunky gradient “chip” pills.
- **Left visual:** Shop bag art on a **soft cyan circular glow** and **thin cyan ring** — **no** layered “water podium” on this card (podium is **featured-border only**). **No** yellow under-glow blob under the bag.
- **CTA:** **“Explore the Shop”** pill, blue→cyan gradient, **bottom-right** of the text column; enough **padding** so the pill is not clipped by the card’s rounded mask.
- **Frame:** Optional small **rim jewels** (corner/midpoint glints) on the card content — keep tasteful.

### Featured border hero (Pulse Shop — Borders tab)

- **Role:** Spotlight the monthly/featured frame like a **premium drop**.
- **Pedestal:** **Water podium** treatment — **concentric horizontal ripples**, soft pool glow, faint **vertical pulse rays** behind art — **full ellipses**, not half-moon clips. Integrated with navy; avoid a obvious **square matte plate** behind transparent ring PNGs.
- **Implementation notes:** `BorderPreviewPlate` uses `frame="podium"` here; **boxed** gradient stage remains for dense grids/tiles.

### Animated backgrounds (shop surfaces)

- **Layered:** animated field → glass / veil → foreground UI.
- **Variants:** e.g. `shopButton`, `featuredHero`, `fullPageSubtle`; support intensity and motion pause / reduced motion.

---

## Vision log

<!-- Append below newest-first or oldest-first — pick one convention and stick to it. Recommended: **newest at top**. -->

### Template (copy for each update)

```markdown
### YYYY-MM-DD — Short title

**Source:** User prompt / Figma / …

**Summary:**
- …

**Decisions:**
- …

**Screens / components affected:**
- …
```

### 2026-05-05 — PulseVerse Visual System (full canonical spec)

**Source:** User direction — mandatory visual design system for all screens.

**Summary:**

- Replaced short design checklist with full **PulseVerse Visual System**: brand feel, background, card rgba/blur/radius/border/shadow rules, glass/neon discipline, primary/secondary/danger buttons, typography hierarchy, spacing, chips/badges, icons, featured heroes, bottom nav, explicit **do not** + **goal**.
- Cursor rule **`.cursor/rules/pulseverse-design-system.mdc`** updated to match (digest + pointer to this doc).

---

### 2026-05-05 — Premium design system (canonical UI rules)

**Source:** User direction — mandatory style rules for all UI.

**Summary:**

- Initial codification; **superseded** by **PulseVerse Visual System** section above for detail. Rule file remains the agent hook.

---

### 2026-05-05 — Pulse Shop premium pass + mockup alignment

**Source:** Iteration in-product (Creator hub card + Pulse Shop featured hero).

**Summary:**

- Introduced reusable **animated backgrounds**, **premium card** shell, **shop entry card**, **featured hero** wrapper; hardened deep links and caption URL handling separately.
- Shop card iterated to match marketing mockup: FEATURED kicker, feature row with separators, Explore CTA, cyan glow + ring on bag; **removed** waterfall podium and yellow glow from shop card; podium **only** on featured border preview.

**Screens / components affected:**

- `components/shop/premium/*`, `components/shop/border/BorderPreviewPlate.tsx`, `components/shop/border/WaterPodiumBackdrop.tsx`, `components/shop/premium/ShopEntryCard.tsx`, `components/shop/PulseShopScreen.tsx`, `app/(tabs)/create.tsx`

---

*Add your next series of prompts below this line.*
