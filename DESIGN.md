---
version: 1.0
name: undersight-design-system
description: The fintech-canon design system for undersight.ai — AI underwriting infrastructure for MCA/RBF funders. The site sits alongside Plaid, Stripe, Heron Data, and Ocrolus and plays that category's design language straight, executed at their craft level (standing direction, Kyle 2026-08-05; metaphor-driven concept worlds declined). Paper-white ground, graphite ink, one amber-rust accent carrying CTAs and emphasis, eucalyptus reserved for cleared/after states. Inter display with cv01/ss03, DM Sans body, monospace strictly for figures. Depth comes from soft offset+blur shadows under floating product UI; the only ornament is a contour-engraving line texture in the hero. Dark mode via semantic-alias swap on prefers-color-scheme plus manual theme classes. Recorded from the built home page (2026-08-05); solution detail pages still carry the pre-redesign system and are phase 2.

colors:
  # Primary palette (graphite ink ramp)
  graphite-900: "#23262C"
  graphite-800: "#2E3138"
  graphite-700: "#3A3F47"
  graphite-500: "#6B7280"
  graphite-100: "#F0F1F2"
  graphite-50: "#F7F8F8"
  cloud-zinc: "#D1D5DB"
  cloud-zinc-light: "#E8EAED"

  # Accent
  amber-rust: "#C97A54"
  amber-rust-hover: "#B56A45"
  amber-rust-light: "rgba(201,122,84,0.08)"
  amber-rust-focus: "rgba(201,122,84,0.2)"

  # Cleared/after states only
  eucalyptus: "#6B9E8C"
  eucalyptus-light: "rgba(107,158,140,0.1)"

  # Ground
  paper-white: "#FFFFFF"
  bg-surface: "#FAFAFA"
  on-accent: "#FFFFFF"

  # Signals
  error: "#D05454"
  info: "#5B8DEF"

  # Dark mode primitives (semantic aliases swap to these)
  dark-bg: "#1A1D21"
  dark-surface: "#23262C"
  dark-elevated: "#3A3F47"
  dark-text: "#FFFFFF"
  dark-text-muted: "#D1D5DB"
  dark-border: "rgba(255,255,255,0.1)"

typography:
  display-hero:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(40px, 5.2vw, 68px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.032em
    fontFeature: cv01, ss03
  display-section:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(26px, 3vw, 36px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.025em
    fontFeature: cv01, ss03
  display-cta:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.025em
    fontFeature: cv01, ss03
  title-lg:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
    fontFeature: cv01, ss03
  title-md:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "17px-20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
    fontFeature: cv01, ss03
  body-lede:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-md:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  ui-button:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 14px
    fontWeight: 510
    lineHeight: 1
    letterSpacing: 0
    fontFeature: cv01, ss03
  nav-link:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 15px
    fontWeight: 510
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: cv01, ss03
  label-uppercase:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.08em
    fontFeature: cv01, ss03
  data-ui:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "10.5px-13.5px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: cv01, ss03
  data-mono:
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace"
    fontSize: "8.5px-12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  figure-mono:
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace"
    fontSize: "18px-34px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.02em

rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"

spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  section: "80px"
  section-mobile: "48px"

components:
  button-primary:
    backgroundColor: "{colors.amber-rust}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.amber-rust-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-700}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "32px"
  demo-card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: undersight

## Overview

**Creative North Star: "The Fintech Canon, Played Straight"**

undersight's site sits alongside the top of its category — plaid.com, stripe.com, herondata.io, ocrolus.com — and mirrors that category's design language, executed at their craft level. That is a standing direction (Kyle, 2026-08-05): concept-world metaphors (submission-file, prospectus, etc.) were explicitly declined. The mechanism is shown, not styled — a bank statement becomes a scored deal in a live product vignette, real deployment numbers carry named sources, and nothing is decorative that could instead be evidence.

The world is paper-white ground and graphite ink, with a single amber-rust accent doing all the chromatic work (CTAs, emphasis, section labels) and eucalyptus reserved exclusively for cleared/after states — a live chip, a positive ledger line, a passing score ring, a verdict. Type is a dual voice: Inter for display and UI (always with `cv01, ss03`), DM Sans for prose, and monospace strictly for figures. Depth comes from soft offset+blur shadows under floating product-UI cards; the only ornament in the system is the contour-engraving line texture behind the hero.

This file records the system **as built on the home page** (`index.html` `#page-home`, 2026-08-05). Solution detail pages (the `underscore` / `underchat` / `copilot` renderers) still carry the pre-redesign system and are scheduled for phase 2; their legacy patterns are noted where relevant but are not the standard for new work.

**Key Characteristics:**
- Category-standard fintech craft; no metaphor worlds, no AI mystique
- Paper-white light-first canvas, graphite ink, one warm accent
- Product UI as illustration: real-looking demo cards, not abstract art
- Monospace only ever renders figures and data labels
- Soft, layered offset shadows lift floating UI off the page
- Dark mode is a first-class semantic-alias swap, test-enforced
- Reduced motion is test-enforced; one authored motion moment per page

## Colors

A restrained three-role palette: graphite ink on paper white, amber rust as the single voice of action, eucalyptus as the single voice of clearance.

### Primary
- **Amber Rust** (#C97A54): the only action color. Primary CTA buttons, text links, section eyebrow labels, active nav underline, focus outlines, tag chips, meter fills, selection tint. Hover deepens to **#B56A45**; tinted washes use `rgba(201,122,84,0.08)` (backgrounds) and `rgba(201,122,84,0.2)` (focus rings). On the graphite-900 CTA/case-study panels it is the accent that survives the inversion.

### Secondary
- **Eucalyptus** (#6B9E8C): cleared/after states only — never navigation, never decoration. Live chips, positive transaction amounts, the score ring fill, verdict rows, success icons. Tinted wash `rgba(107,158,140,0.1)`. Its rarity is what makes a green number mean something.

### Neutral
- **Graphite 900** (#23262C): headline ink; also the background of the inverted closing sections (CTA, testimonial, case-study graphic panel).
- **Graphite 700** (#3A3F47): body ink (default `body` color).
- **Graphite 500** (#6B7280): muted/secondary text, data labels, captions.
- **Cloud Zinc** (#D1D5DB) / **Cloud Zinc Light** (#E8EAED): borders and hairline rules; zinc-light for card borders, zinc for structural dividers.
- **Paper White** (#FFFFFF): card and nav surface. **Surface** (#FAFAFA): the page ground behind cards.
- **Graphite 50/100** (#F7F8F8 / #F0F1F2): subtle/muted fills (pills, icon tiles, skeletons).

### Signals
- **Error** (#D05454): form validation, dimmed NSF rows in the demo ledger. **Info** (#5B8DEF): numeric literals in dark code blocks. Neither appears in marketing chrome.

### Dark mode
Semantic aliases (`--color-bg`, `--color-text`, `--color-border`, `--color-surface`, …) swap to the dark primitives (#1A1D21 bg, #23262C surface, #3A3F47 elevated, white text, `rgba(255,255,255,0.1)` borders) under `prefers-color-scheme: dark`, with manual `html.theme-dark` / `html.theme-light` overrides. Accents (amber rust, eucalyptus) are unchanged in dark mode; shadows deepen to black-based values. Component CSS styles against the aliases, never the primitives.

### Named Rules
**The One Accent Rule.** Amber rust is the only color that asks for a click. If an element is interactive or emphasized, it is amber rust or graphite — never eucalyptus, never info blue.

**The Cleared-State Rule.** Eucalyptus appears only after something has gone right: a live connection, a positive line, a passing score, a verdict. It never decorates and it never navigates.

## Typography

**Display/UI Font:** Inter (with -apple-system, BlinkMacSystemFont fallback) — always with `font-feature-settings: 'cv01', 'ss03'`
**Body Font:** DM Sans (with -apple-system, BlinkMacSystemFont fallback)
**Figure Font:** JetBrains Mono (with 'SF Mono', monospace fallback) — *figures and data labels only*

**Character:** Confident geometric display over a warm, readable body — the standard fintech pairing executed tightly (negative tracking scales with size). Monospace is a semantic signal, not a style: if it's mono, it's a number, a data label, or code.

### Hierarchy
- **Hero display** (700, `clamp(40px, 5.2vw, 68px)`, 1.04, −0.032em): the home hero `h1` only. `text-wrap: balance`; accent words colored amber rust via `.accent`.
- **Section display** (700, `clamp(26px, 3vw, 36px)`, 1.15, −0.025em): `home-section-head h2`, case-study `cs-h2`. The dark CTA close runs slightly larger (`clamp(28px, 3.4vw, 40px)`).
- **Title** (700, 24px, 1.15, −0.02em): solution-row `h3`, case-study text `h3`. Sub-titles at 600, 17–20px (pipeline stage heads, card heads, serve columns at 19px/700).
- **Body lede** (400 DM Sans, 17px, 1.6): hero subtitle, max-width 46ch. Section ledes 15px, max-width 620px. Case-study/body prose 15px/1.7.
- **Body** (400 DM Sans, 14–15px, 1.55–1.6): card copy, pipeline descriptions (14.5px), footer links (13px).
- **UI/Button** (510 Inter, 14–15px, line-height 1): buttons and nav links use weight **510** — the system's signature in-between weight; 600 is reserved for emphasis labels.
- **Label uppercase** (600 Inter, 11px, 0.08em tracking, uppercase): section eyebrow labels (`home-section-label`, amber rust), case-study `cs-label`, API preview labels.
- **Data UI** (600 Inter, 10.5–13.5px): the small type inside product vignettes — demo card titles (11.5px uppercase), score meta (13.5px/10.5px), factor labels (10.5px), verdict rows (11.5px), pipeline `pv-line` (11px).
- **Data mono** (JetBrains Mono, 8.5–12px): ledger rows (9.5px), chips (9px uppercase), ring sub-labels (8.5–9px), mini-score values (12px), `pv-client` bubbles (10px).
- **Figure mono** (700 JetBrains Mono, 18–34px, line-height 1, −0.02em): evidence-strip numbers (26px), pipeline score (34px), case-study stats (18px), metric cards (22px).

### Named Rules
**The Mono-Means-Figures Rule.** JetBrains Mono renders dollar amounts, scores, percentages, timestamps, data chips, and code — nothing else. Headlines, prose, and UI never set in mono.

**The 510 Rule.** Interactive UI text (nav links, buttons, pills, filters) sits at Inter weight 510 — heavier than regular, lighter than semibold. Don't round it to 500 or 600.

**The Feature-Settings Rule.** Every Inter element carries `font-feature-settings: 'cv01', 'ss03'`. It is applied globally to headings, nav, buttons, and form labels, and repeated on component-level Inter usage.

*Divergence note:* `tokens.css` still carries the fixed pre-redesign size ramp (`--text-display-xl: 48px`, etc.) and lists `--font-mono` as SF Mono-first; the built home page uses the fluid clamps and JetBrains Mono-first stacks recorded above. The build is normative; reconcile the token file in phase 2.

## Layout

Single centered column, **max-width 1120px** (`--max-width`), 24px horizontal padding (16px under 768px). Sticky 64px nav on a blurred `rgba(255,255,255,0.92)` surface with a hairline bottom border; a 1px scroll shadow appears on `.scrolled`.

Spacing is an **8px grid** (tokens 2/4/8/12/16/24/32). Vertical rhythm: home sections pad **80px** top/bottom (hero 88px/72px, pipeline and case studies 88px, dark CTA 96px, evidence strip 28px); mobile sections drop to 48–56px. Sections separate with `border-top: 1px solid` hairlines rather than background changes — the page stays one paper surface until the graphite-900 closing sections invert it.

Signature layout moves, in home-page order:
- **Split hero** `hero-grid`: `6fr / 5fr` grid, 64px gap — copy + two CTAs left, floating demo right. Collapses to one column at 960px.
- **Evidence strip**: full-width hairline-bounded band of four mono figures with named sources, directly under the hero; 2×2 grid at 640px.
- **Pipeline**: 4-across grid (28px gap) with a 1px connecting line drawn behind the vignette cards (`.pipeline::before`); 2-across at 960px (line hidden), 1-across at 640px.
- **Solution rows** `sol-row`: alternating flex rows (`row-reverse` on even), 48px gap, hairline separated, 320px fixed mini-tile column; stacks under 768px.
- **Serve columns** `serve-cols`: 3 equal columns separated by 1px left rules (32px padding), no cards; rules rotate to top borders when stacked.
- **Case study**: split panel — 480px graphite-900 graphic side + white text side inside one 12px-radius bordered container; alt variant reverses direction.
- Responsive breakpoints in use: **960px**, **768px**, **640px** (plus 560px for footer stacking).

## Elevation & Depth

A hybrid: the page itself is flat (hairline borders separate sections; cards at rest are border-only or subtly shadowed), while **floating product UI carries soft offset+blur shadow stacks** — large vertical offset, larger blur, low-opacity graphite ink — that make the demo cards feel physically lifted off the paper.

### Shadow Vocabulary
- **Token ramp** (`--shadow-subtle/medium/large`): `0 1px 3px rgba(35,38,44,0.06)` / `0 4px 16px rgba(35,38,44,0.08)` / `0 8px 32px rgba(35,38,44,0.12)` — general-purpose elevation (modal uses large).
- **Hero float** (`box-shadow: 0 16px 40px rgba(35,38,44,0.10), 0 3px 10px rgba(35,38,44,0.05)`): the hero demo cards — the deepest shadow in the system, reserved for the first-viewport product UI.
- **Tile float** (`0 10px 28px rgba(35,38,44,0.07), 0 2px 6px rgba(35,38,44,0.04)`): framed solution mini-tiles (`#homeSolutions .sol-mini-tile`).
- **Vignette float** (`0 6px 20px rgba(35,38,44,0.06), 0 1px 4px rgba(35,38,44,0.04)`): pipeline stage cards.
- **Hover lift** (`0 4px 16px rgba(0,0,0,0.06)` + `translateY(-2px)`): cards and blog cards on hover, paired with an amber-rust border.
- **CTA glow** (`0 8px 24px rgba(201,122,84,0.35)`): the primary button on the dark CTA close only; the standard primary button carries `0 1px 2px` at rest, `0 4px 16px rgba(201,122,84,0.25)` on hover.
- **Dropdown/menu** (`0 8px 32px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)`).

In dark mode every shadow deepens to pure-black-based values (e.g. hero float becomes `0 16px 40px rgba(0,0,0,0.45), 0 3px 10px rgba(0,0,0,0.3)`).

### Named Rules
**The Soft-Float Rule.** Shadows are always ink-tinted (rgba of #23262C in light mode), always offset downward, always two-layer (one deep + one tight), never hard-edged. The deeper the shadow, the more "product UI" the element — deepest in the hero, shallower down the page.

## Shapes

Gently rounded rectangles throughout: **8px** (`--rounded-md`) is the default radius for cards, buttons, demo cards, inputs, and code blocks; **6px** for tags; **12px** for the case-study container and modal; **999px pills** for chips, filters, and status pills. Score rings are true circles built from `conic-gradient` with an inset `::after` disc (64–72px). Chat bubbles use 10–12px radii with one 3px "tail" corner (bottom-left for agent, bottom-right for client). Borders are 1px hairlines everywhere — cloud zinc light on cards, cloud zinc on structural rules; dashed hairlines mark tentative/annotation rows (`.pv-sign`). No sharp corners, no bevels, no border thicker than 1px. The hero's contour-engraving texture (a `repeating-radial-gradient` of 1px amber-rust ellipse lines at 14% opacity, 26px pitch) is the system's only ornament.

## Components

### Buttons
- **Shape:** gently rounded (8px), inline-flex, line-height 1, Inter 510.
- **Primary:** amber rust (#C97A54) with white text, `0 1px 2px rgba(201,122,84,0.15)` at rest; 10px 24px padding (13px 26px in hero, 14px 32px in dark CTA).
- **Hover:** deepens to #B56A45, lifts `translateY(-1px)`, shadow grows to `0 4px 16px rgba(201,122,84,0.25)`; active returns to rest.
- **Ghost:** transparent with 1px cloud-zinc border, graphite-700 text; hover darkens border/text and lifts 1px.
- **Focus:** 2px amber-rust outline, 2px offset, `:focus-visible`-gated.

### Hero Demo (`hero-demo`) — signature component
The first-viewport product vignette: a three-column grid (`demo-doc` → `demo-link` arrow → `demo-score`) showing a bank statement becoming a scored deal.
- **demo-doc:** white card, hero-float shadow, uppercase 11.5px Inter title + 9px mono chip head; ledger of mono 9.5px rows, hairline-separated, positive amounts eucalyptus, NSF row error-dimmed.
- **demo-link:** 44px amber-rust arrow SVG between the cards; rotates 90° when the grid stacks at 640px.
- **demo-score:** matching card with a 64px eucalyptus conic-gradient score ring (82 / B+), factor meters (4px tracks, amber-rust fills), and an eucalyptus verdict row with a glowing 6px dot.
- **Motion:** the page's one authored moment — cards rise (`demoRise`, 0.7s `cubic-bezier(0.2,0.8,0.2,1)`, score delayed 0.35s), ledger rows fade in staggered 0.15–0.50s, meters grow from the left at 0.7s, verdict lands at 1.1s. Fully disabled under reduced motion.

### Evidence Strip (`evidence-strip`)
Hairline-bounded band: `ev-item`s of 26px mono-700 figures + 13px Inter labels, with a right-aligned 12px source line naming the deployments. Real numbers with named sources only — this component must never carry invented metrics.

### Pipeline (`pipeline`)
Four `pipe-stage`s (Intake → Enrich → Score → Monitor) over a connecting hairline. Each stage leads with a `pipe-vis` vignette card (min-height 122px, vignette-float shadow) in one of four variants: chat bubbles (`pv-bubble` agent/client), data rows (`pv-line` with mono values and eucalyptus ticks), big score (`pipe-vis-score`, 34px mono), and decision (`pv-decision` with a eucalyptus check disc + dashed-rule sign-off line). Stage title 17px/600, description 14.5px muted.

### Solution Rows (`sol-row` + mini-tiles)
Alternating rows: fixed 320px `sol-mini-tile` graphic + text column (24px/700 h3 with optional inline uppercase tag chip, 15px oneliner, pill list, amber-rust "explore" link whose gap widens on hover). On the home page (`#homeSolutions`) tiles are framed white cards with the tile-float shadow and 24px padding, containing per-product vignettes: **mini-score** (data rows + 56px eucalyptus ring), **mini-chat** (live pill + agent/client bubbles), **mini-grade** (72px amber-rust grade ring + legend).

### Serve Columns (`serve-cols`)
Three rule-separated columns, no cards: 19px/700 heads, 13.5px/600 amber-rust verb line, 14.5px muted body.

### Case Study (`case-study`)
Split container (12px radius, hairline border): graphite-900 graphic panel (amber-rust uppercase label, white title, numbered amber-rust step discs, mono stat row over a `rgba(255,255,255,0.1)` rule) beside a white text panel (pill tag, 24px title, 15px prose, amber-rust link). `--alt` reverses the direction for the second study.

### Testimonial (`testimonial-section`)
Graphite-900 full-bleed band: italic DM Sans 20px quote at `rgba(255,255,255,0.9)`, oversized amber-rust opening quote mark (48px Inter), Inter citation block.

### CTA Close (`cta-section`)
Graphite-900 full-bleed close: white display headline, `rgba(255,255,255,0.65)` lede, glowing primary button, small underlined alt-link line at 55% white.

### Cards / Containers
White surface, 1px cloud-zinc border, 8px radius, 32px padding (20px mobile). Hover: amber-rust border, −2px lift, soft shadow. Icon tiles 48px, 12px radius, surface fill.

### Inputs / Modal
Inputs: surface-filled, 1px hairline, 8px radius, DM Sans 15px; focus swaps the border to amber rust with a `0 0 0 3px rgba(201,122,84,0.12)` ring; error state mirrors this in #D05454. The whitepaper modal: 420px, 12px radius, `--shadow-large`, blurred dark overlay, eucalyptus success state.

### Navigation
Sticky 64px bar on blurred white; 15px/510 links (muted → graphite on hover/active, active gets a 2px amber-rust underline); hover dropdowns on white 8px-radius panels with menu shadow; ghost Sign In + primary Book a Discovery Call; hamburger panel under 768px.

### Motion grammar
Scroll sections use a generic `reveal` (24px rise + fade, 0.6s) with 0.12s staggering for solution rows; page swaps cross-fade 0.2s; hovers are 0.15–0.2s ease micro-transitions.

## Do's and Don'ts

### Do:
- **Do** run every animation behind the reduced-motion guard: each animated component ships a matching `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` / `transition: none` and lands the element in its final state. This is the established convention and it is test-enforced.
- **Do** limit each page to **one authored motion moment** (on home: the hero demo cascade); everything else stays on the generic reveal/hover grammar.
- **Do** style against the semantic aliases (`--color-bg`, `--color-text`, `--color-border`) so dark mode works for free; give any hard-coded rgba treatment explicit `prefers-color-scheme: dark` **and** `html.theme-dark` / `html.theme-light` overrides (the established triple-surface pattern).
- **Do** set all figures — money, scores, percentages, durations — in JetBrains Mono 700 with tight tracking, and keep uppercase labels at Inter 600, 10–11.5px, 0.05–0.08em tracking.
- **Do** build product vignettes from real-shaped data (plausible ledger lines, named sources, "Sample" chips) with soft-float shadows; the vignette *is* the illustration system.
- **Do** close pages with the graphite-900 inversion (CTA section) and keep "Book a Discovery Call" as the one primary action per viewport.
- **Do** keep "undersight" lowercase everywhere (test-enforced).

### Don't:
- **Don't** introduce metaphor-driven visual worlds (paper dossiers, prospectus chrome, terminal aesthetics); the standing direction is the fintech category standard played straight — craft bar: plaid.com, stripe.com, herondata.io, ocrolus.com.
- **Don't** use eucalyptus for anything except cleared/after states, and don't let any color other than amber rust carry an interactive affordance.
- **Don't** set headlines or prose in monospace, and don't use Inter without `cv01, ss03`.
- **Don't** use hard-edged or spread-heavy shadows; every shadow is a two-layer soft ink-tinted float.
- **Don't** invent metrics, logos, or customers — the evidence strip and case studies render only the real Chat Advance / 4D Financing / AFB numbers with named sources (PRODUCT.md).
- **Don't** add a second ornament; the hero contour-engraving texture is the only decorative surface in the system.
- **Don't** copy patterns from the solution detail pages (`sol-hero`, `sol-visual-box`, `serve-grid` cards, fixed 42px/48px display sizes) into new work — they are the pre-redesign system awaiting the phase-2 pass.
