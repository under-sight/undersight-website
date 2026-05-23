# undersight — Marketing Polish Pass · Dev Notes

This document describes the changes made in `Undersight Polished.html` so a dev can apply them to the live site.

**Scope:** Home, underscore, underchat, copilot, RFI, Blog index, Blog post, Docs gate, Header + Footer.
**Bounds:** Brand DNA preserved — Paper White canvas, Graphite text, Amber Rust accent. Inter + DM Sans + a new mono. Dark mode supported.
**Files touched:** new `css/polished.css` (drop-in alongside `tokens.css`). HTML in `Undersight Polished.html` mirrors the structure of `index.html` so the SPA / Fibery hookups can be retained — only markup and class names change.

---

## Cross-cutting changes

### 1. Type scale → fluid
Previously: static `font-size: 48px` for the hero, fixed breakpoint reductions in `@media (max-width: 768px)`.
Now: a single fluid scale using `clamp()`. Hero scales 40 → 76px without breakpoints. Section heads 28 → 44.

```css
--fs-h1: clamp(40px, 5.2vw + 12px, 76px);
--fs-h2: clamp(28px, 2.6vw + 14px, 44px);
--fs-data-xl: clamp(48px, 6vw + 12px, 92px);
```

### 2. Mono number stack
Added **JetBrains Mono** (Google Fonts) for stat numerals, code blocks, and small monos. Tabular figures + zero variant on every numeric cluster (`font-feature-settings: 'tnum', 'zero'`). The current site uses generic SF Mono fallback; this hardens the look on Windows.

```html
<link href="https://fonts.googleapis.com/css2?family=…JetBrains+Mono:wght@400;500;600…">
```

### 3. Eyebrow atom (replaces inline `home-section-label`)
Every section opener now uses a single reusable `.eyebrow` atom with a 24px leading rule. More editorial than the bare uppercase label currently used.

### 4. Accent discipline kept, signal turned up
- Removed soft `background:` washes on every section.
- Accent reserved for: CTA buttons, eyebrow rules, active nav underline, key chips, "live" pulse, score-card chips, and one decorative role per hero (the corner radial wash, `--accent-tint`).
- All accent backgrounds now use `color-mix(in oklab, var(--color-accent) X%, transparent)` so they auto-tune in dark mode without re-declaring rgba values.

### 5. Dark-mode parity
Added an explicit theme toggle in the nav (sun/moon SVG) that flips `html.theme-dark`. Every new component was authored against both themes — no new dark-mode CSS branches were needed because the polish uses semantic tokens (`--ink`, `--surface`, `--line`) end to end.

### 6. Header
Old: 32px gap, no active-state indicator, dropdown is plain list.
New: sticky with `backdrop-filter` + `saturate(1.6)` for clearer chrome over content; mega-panel dropdown with icon + sub-copy per item; active link has a 2px Amber Rust underline.

```css
.site-header { background: color-mix(in oklab, var(--surface) 80%, transparent); backdrop-filter: saturate(1.6) blur(14px); }
.nav-links a.is-active::after { /* 2px amber underline */ }
.dd-panel { display: grid; grid-template-columns: 1fr 1fr; } /* mega-panel */
```

### 7. Footer
- Added a 4-col link grid (was 3) + brand column with social row.
- "All systems operational" status pill in the bottom bar (replaces the bare theme-toggle button).
- Wordmark gains the `<svg>` icon for parity with the nav.

---

## Home page

### Hero (was: centered headline + skeleton)
**Why polished:** The current hero is type-only on a flat canvas. Doesn't earn the fold.
**What changed:**
1. **Asymmetric split** 1.05/1 (copy + product visual).
2. **Headline 40→76px fluid**, with the differentiator (`without losing rigor`) in Amber Rust. Em element handles it inline.
3. **Lede shortened** — was 3 lines of body, now one tight sentence (`Agentic intake, ML-graded risk, continuous portfolio monitoring …`).
4. **Trust strip** beneath the CTA showing logo wordmarks (placeholders for real customer marks).
5. **Hero visual** is a layered product stack — score panel + chat panel + floating score chip — so the fold tells the product story without copy.
6. **Decorative backdrop**: two soft radials (amber top-right, eucalyptus bottom-left) at very low opacity. Survives dark mode because it uses `color-mix` against the accent + success tokens.

### Stats bar (was: `stats-bar--compact`, 3 small numerals)
**Why polished:** Numerals were the same weight as body. No source line, no descriptive frame.
**What changed:**
- Big mono numerals at `--fs-data-xl` (48 → 92px), tabular figures, negative tracking.
- Each stat: `label / number / desc / source` (4-line composition).
- Thin vertical rules between, heavy black rule on top, soft rule on bottom — gives the band gravity without filling it in.

### Who we serve (was: three cards with body copy)
**Why polished:** Reads as three paragraphs in boxes.
**What changed:**
- Rewritten as a **bordered editorial grid** (no rounded card corners) — feels like a magazine masthead.
- Each tile: numbered index (`01 / 03`), tag, tighter headline, two-sentence body, link-with-arrow. The numbered index gives the section a clear order.

### How it works (was: timeline w/ wordy bodies)
**Why polished:** Steps were 6+ lines of copy each.
**What changed:**
- 4-col grid with **2px Amber Rust accent stub** on top of each column (typographic device, not a chart).
- `STEP 01 / 02 / 03 / 04` numeric eyebrow in mono.
- Each step ends with a small `meta` row (`~6 min median intake`, `<3s response`, etc.) — concrete proof for the abstract claim above it.

### Solutions (was: dense rows with capability bullets)
**Why polished:** Each row reads like a feature page squeezed into a card.
**What changed:**
- Three full-width **alternating rows** (1.05fr / 1fr). Headline is the **product wordmark** (44px Inter 700), claim line in `--ink-2` at 28px (recedes), then short body, chips, two CTAs (primary + link).
- Mini-visuals upgraded:
  - **underscore**: response card with composite bar, sub-scores, and 3 chips (Stacking, Active funders, NSF).
  - **underchat**: full chat thread with live pulse, real bubbles, typing indicator, and outcome chips.
  - **copilot**: SVG ring (`-90°` rotated, dual stroke-dasharray for ML baseline + agentic adjustment) with a B+ grade in mono.

### Case studies (was: image div + read-link)
**Why polished:** Just thumbnails. No proof, no metric, no preview.
**What changed:**
- Two real **case-study tiles** with:
  - 16:8 patterned thumbnail with a **giant in-thumb metric** (`71%` / `650 bps`) and a customer-name badge.
  - 3-up footer stats (`3.1× throughput / 22% more booked / $0 added headcount`).
  - Two-action footer (read link + "PDF · 8 min read" microcopy).

### Testimonial (was: bare blockquote + cite)
**Why polished:** Italic blockquote on plain bg — didn't land.
**What changed:**
- Lives in its own banded section (`.testimonial`, `surface-alt`).
- Oversized opening **quote glyph** in Amber Rust at 80–160px (fluid), positioned negative-top.
- Editorial 20–32px Inter quote with `em` wrapping the key claim — `em` is rendered as a tinted highlight (`background: var(--accent-soft)`).
- Three-part cite row: avatar initials + name/role + customer logo wordmark right-aligned.

### CTA (was: centered headline + one button)
**Why polished:** A standard CTA block with no real "next step."
**What changed:**
- Two-column composition: copy + persuasion left, **mini-calendar tile** right (5 weekday cells with "open" days highlighted in Amber Rust, plus six time-slot chips).
- Headline emphasizes the personal pitch (`See undersight against your deal book`).
- Decorative radial wash sits behind the calendar.
- The same block is templated and **re-injected on every solution page** (`<template id="tpl-cta">`) for consistency.

---

## Solution pages (underscore / underchat / copilot / RFI)

All four use a shared layout:

1. **Sol-hero** — `1.05fr / .95fr` split. Eyebrow → 40–64px headline (with an Amber Rust em on one or two words) → 18px lede → CTA row → endpoint chip (underscore only) or trust strip.
2. **Hero visual** — the mini product visual from the home page, but framed cleanly in a `.frame` card with a `.frame-head` (title + meta).
3. **Content sections** — alternating canvas / `.alt` bands. Card grids snap to a clean 3- or 4-col with consistent padding (28px) and a `.badge` numeral.
4. **Shared CTA** injected at the bottom.

### underscore-specific
- **API preview** section: two `code-block`s (request + response) side by side, in a dark deck-ink fill that works in both themes (we override to `#0F1216` in dark mode for a touch more contrast).
- **Capabilities grid** uses big mono badges (`150+`, `21`, `ML+`, `<3s`) instead of icons — keeps the page from sliding into iconography it doesn't earn.
- **MCA callout** split with a 6-cell `.metrics-grid` (uses 1px gap trick for clean dividers without borders fighting).

### underchat-specific
- **Use cases** grid uses pill `.tag` (the Amber Rust pill from the system) instead of icons.
- **"Why it works" split** pairs prose with a small **resolution-rate bar chart** built from divs (no chart lib). Chart cards underneath show 80% / 3.4 min / 4.7 CSAT in big mono numerals.

### copilot-specific
- **Workflow** is the same 3-up card with mono numeric badges (`01/02/03`) — connects visually to the home "how it works" step numbering.
- **Workspace overview** is a flat 4×2 grid of titled cards — no icons, just clear groupings. This is more honest than icon-led grids for a product page.

### RFI-specific
- **Hero visual** is a "Submission package · #SUB-2014" checklist with `✓ Verified` rows — proof-of-output, not concept art.
- **How it flows** reuses the home `.how` timeline pattern for consistency.

---

## Blog index

Was: a Fibery-rendered grid with no hierarchy or filter UI.
Polish:
- **Hero band** with a section eyebrow + 36–56px headline + lede, on its own banded row.
- **Filter pills** (6 categories) — first is highlighted (`is-on`), pill is full ink fill when active.
- **Featured post** — 1.4/1 split with patterned thumb (giant metric in the thumb instead of cover art), category meta row, 24–36px headline, lede, link.
- **3-up grid** with mini-cards: 16:9 patterned thumbnail + a small product-name glyph in the corner (`underscore`, `macy`, `MCA`, `co-pilot`, `infra`, `4D`) instead of stock imagery. Hover state turns the headline Amber Rust.

> **Note:** the patterned thumbnails are pure CSS (`repeating-linear-gradient`). Designed to be a *placeholder system* — when real article art lands, drop it in as `background-image` and keep the giant metric/glyph as an overlay.

## Blog post

Was: a long-form markdown render in 720px column.
Polish:
- Same column width but a **proper post-meta row** (category · date · read time) in mono caps.
- 34–52px headline, 19px lede (DM Sans, slightly muted ink).
- **Hero strip** with patterned bg and oversized in-strip metric (mirrors the case-study tile language).
- Body styles: `blockquote` becomes a left-bordered Amber Rust pull-quote with `--accent-tint` wash; `h2/h3` get clear rhythm; `ul/ol` snap to consistent gap.
- **Author card** at the foot with 56px avatar, role, and a Subscribe ghost button.

## Docs gate

Was: an emoji lock + heading + button.
Polish:
- Replaced the emoji lock with a properly framed icon tile (Amber Rust tint background, line icon inside).
- Added an eyebrow ("API documentation") and restructured the copy so the H1 is the action ("Sign in to access docs").
- Centered everything in a 520px column with generous vertical padding so the page doesn't feel orphaned.

---

## Animation discipline

Kept to two reusable motions:
- `@keyframes live-pulse` — the green status dot on the chat agent header.
- `@keyframes dot` — the three-dot typing indicator (240ms stagger).
- Hovers use `transform: translateY(-1px)` + a shadow lift; no bounces, no fades.

No third-party animation libs are introduced.

---

## Tokens added (suggest committing to `tokens.css`)

```css
:root {
  /* fluid scale */
  --fs-h1: clamp(40px, 5.2vw + 12px, 76px);
  --fs-h2: clamp(28px, 2.6vw + 14px, 44px);
  --fs-h3: clamp(22px, 1.6vw + 14px, 28px);
  --fs-data-xl: clamp(48px, 6vw + 12px, 92px);

  /* layout */
  --max-w: 1200px;          /* was 1120 — slightly wider for the editorial grid */
  --gutter: clamp(20px, 4vw, 40px);
  --section-y: clamp(56px, 7vw, 112px);

  /* accent mixes (light/dark safe) */
  --accent-soft: color-mix(in oklab, var(--color-accent) 12%, transparent);
  --accent-tint: color-mix(in oklab, var(--color-accent) 6%, transparent);

  /* mono with tabular figures */
  --font-num: 'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, Consolas, monospace;
}
```

---

## Suggested rollout order

1. **Foundation** — Drop `polished.css`, add JetBrains Mono to Google Fonts call, add the new tokens above.
2. **Chrome** — Header (mega-panel, theme toggle) + Footer (4-col + status pill). Quick wins, immediately visible everywhere.
3. **Home — hero + stats + testimonial + CTA**. These are the four blocks where the current page reads weakest; biggest payoff per LOC.
4. **Home — who we serve, how-it-works, solutions, case-studies**. Touch the underlying Fibery shapes (`SOLUTION_PILLS`, `solutionMiniGraphic`) to render the new chip + frame patterns.
5. **Solution pages** — port the shared `sol-hero` + `frame` patterns, then specific sections (API preview, MCA callout, use cases).
6. **Blog index + post + docs gate** — last pass; structurally simple, just style.

## Known caveats / next steps

- **Customer logos** in the hero trust strip are wordmark placeholders; swap to real SVG/PNGs when available.
- **Calendar tile** in the CTA is mock; real version should pull from Calendly's availability API.
- **Case-study and blog thumbnails** use a CSS pattern + metric overlay placeholder. Plan to swap each card's pattern for real article art and keep the overlay as a treatment.
- Did not touch the **whitepaper modal** (`#wpOverlay`) or **mobile menu** — flagged for a follow-up.
- Did not touch the **`navigate(...)` SPA mechanics, Fibery render pipeline, or Clerk gating** — only the rendered markup downstream of those.
