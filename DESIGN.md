---
version: alpha
name: undersight-design-system
description: A light-first editorial design system for undersight.ai — an AI underwriting platform for private credit. The system anchors on a clean white canvas with warm Graphite text, a dual-font voice (Inter for headlines and UI, DM Sans for body), and a dual chromatic accent system: Amber Rust as the ACTION voice (CTAs and interactive elements) and Eucalyptus as the INSIGHT voice (data, status, validated truth). The two accents pair complementary under strict separation — Rust never decorates, Eucalyptus never calls to action. The brand communicates trustworthiness and precision through generous whitespace, an 8px spacing grid, card-based layouts with subtle borders, and monochrome editorial illustration. Dark mode is supported via CSS custom property swap on prefers-color-scheme. OpenType features cv01 and ss03 are enabled globally on all Inter text.

colors:
  # Primary palette
  graphite-900: "#23262C"
  graphite-800: "#2E3138"
  graphite-700: "#3A3F47"
  graphite-100: "#F0F1F2"
  graphite-50: "#F7F8F8"
  graphite-500: "#6B7280"
  cloud-zinc: "#D1D5DB"
  cloud-zinc-light: "#E8EAED"
  rule: "#E8EAED"   # in-content hairline (semantic --color-rule; dark mode -> dark-border)
  amber-rust: "#C97A54"
  amber-rust-hover: "#B56A45"
  amber-rust-light: "rgba(201,122,84,0.08)"
  amber-rust-focus: "rgba(201,122,84,0.2)"
  eucalyptus: "#6B9E8C"
  eucalyptus-hover: "#588977"
  eucalyptus-light: "rgba(107,158,140,0.08)"
  eucalyptus-focus: "rgba(107,158,140,0.2)"
  paper-white: "#FFFFFF"
  bg-surface: "#FAFAFA"
  on-accent: "#FFFFFF"
  error: "#D05454"
  info: "#5B8DEF"

  # Dark mode overrides (via prefers-color-scheme: dark)
  dark-bg: "#1A1D21"
  dark-surface: "#23262C"
  dark-elevated: "#3A3F47"
  dark-text: "#FFFFFF"
  dark-text-muted: "#D1D5DB"
  dark-border: "rgba(255,255,255,0.1)"

typography:
  display-hero:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.035em
    fontFeature: cv01, ss03
  display-xl:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.03em
    fontFeature: cv01, ss03
  display-lg:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
    fontFeature: cv01, ss03
  display-md:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
    fontFeature: cv01, ss03
  display-sm:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
    fontFeature: cv01, ss03
  title-lg:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
    fontFeature: cv01, ss03
  title-md:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: cv01, ss03
  body-lg:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-md:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: 0
  body-sm:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  ui-label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 14px
    fontWeight: 510
    lineHeight: 1
    letterSpacing: 0.02em
    fontFeature: cv01, ss03
  ui-button:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
    fontFeature: cv01, ss03
  nav-link:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 14px
    fontWeight: 510
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: cv01, ss03
  caption:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: cv01, ss03
  caption-uppercase:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.08em
    fontFeature: cv01, ss03
  data-display:
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.02em
  code:
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  xxxl: 48px
  section: 80px
  section-mobile: 48px
  measure: 68ch   # prose measure for editorial text columns (--measure)

components:
  button-primary:
    backgroundColor: "{colors.amber-rust}"
    textColor: "{colors.on-accent}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.xs}"
    padding: 10px 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.amber-rust-hover}"
    textColor: "{colors.on-accent}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.xs}"
    padding: 10px 20px
    height: 40px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.graphite-700}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.xs}"
    padding: 10px 20px
    height: 40px
    border: 1px solid {colors.cloud-zinc}
  button-ghost-hover:
    backgroundColor: transparent
    textColor: "{colors.graphite-900}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.xs}"
    padding: 10px 20px
    height: 40px
    border: 1px solid {colors.graphite-900}
  motif-ruled-field:
    pattern: repeating-linear-gradient hard-stop 1px lines
    color: "{colors.pattern-line}"
    pitch: 80px (dense: 32px)
    mask: alpha fade to 95% height
  rule-double:
    top: 1px solid {colors.cloud-zinc}
    gap: 3px (bg-masked)
    echo: 1px {colors.cloud-zinc-light}
  eye-ring:
    size: 12px
    border: 1px solid {colors.cloud-zinc}
    centerDot: 4px {colors.graphite-500}
  text-input:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 10px 14px
    height: 40px
    border: 1px solid {colors.cloud-zinc}
  text-input-focused:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 10px 14px
    height: 40px
    border: 1px solid {colors.amber-rust}
    boxShadow: 0 0 0 3px {colors.amber-rust-focus}
  card-solution:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 32px
    border: 1px solid {colors.cloud-zinc}
  card-solution-hover:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    rounded: "{rounded.xs}"
    padding: 32px
    border: 1px solid {colors.graphite-700}
  card-blog:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    border: 1px solid {colors.cloud-zinc}
    overflow: hidden
  stat-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.data-display}"
    rounded: "{rounded.xs}"
    border: 1px solid {colors.cloud-zinc}
    textAlign: center
  nav-bar:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.nav-link}"
    height: 64px
    position: sticky
    borderBottom: 1px solid {colors.cloud-zinc}
  hero-section:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.display-xl}"
    padding: "{spacing.section}"
  section-label:
    backgroundColor: transparent
    textColor: "{colors.amber-rust}"
    typography: mono 12px / 500, uppercase, 0.08em tracking (folio-numbered, e.g. "01 · Solutions")
  solution-tag:
    backgroundColor: "{colors.amber-rust-light}"
    textColor: "{colors.amber-rust}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  cta-section:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.display-md}"
    padding: "{spacing.section}"
    textAlign: center
  footer:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-700}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xl}"
    borderTop: 1px solid {colors.cloud-zinc}
---

## Overview

undersight's design system is a light-first editorial interface built for an AI underwriting platform. The system anchors on a clean white canvas (`{colors.paper-white}` -- #FFFFFF) with warm Graphite text (`{colors.graphite-900}` -- #23262C), producing a reading experience that feels precise, trustworthy, and intelligent -- qualities essential for a platform operating in private credit.

The brand operates on a **dual chromatic accent system** built around the product's core promise -- act on insight. **Amber Rust** (`{colors.amber-rust}` -- #C97A54) is the ACTION voice, reserved for CTAs and interactive elements: when Amber Rust appears, something is actionable. **Eucalyptus** (`{colors.eucalyptus}` -- #6B9E8C) is the INSIGHT voice, used for data eyebrows, metric callouts, status pills, validated indicators, and illustrative graphics: when Eucalyptus appears, something is known, validated, or measured. The two never compete for the same role: Rust never decorates, Eucalyptus never calls to action. Their separation is the brand's structural rhythm and the source of its voltage.

The type system runs a dual-font voice. **Inter** (with OpenType features `cv01` and `ss03` enabled globally) handles all headlines, navigation, labels, buttons, and UI chrome -- the structural skeleton of the page. **DM Sans** handles body copy, descriptions, and long-form reading -- the humanist voice that carries explanatory content. The weight `510` (not 500) is used for UI elements: buttons, navigation links, labels, and form fields. This fractional weight is a quiet signal of typographic intention; it sits between regular and medium, giving interface chrome just enough presence without the heaviness of a traditional medium weight. Display headlines use `600` and `700` with negative letter-spacing (`-0.03em` to `-0.01em`) for editorial density.

The layout philosophy is uniform light page rhythm. There are no dark hero bands, no gradient meshes, no alternating surface-tone sections. Every section lives on the same white or near-white canvas, with depth communicated through card borders (`{colors.cloud-zinc}`), generous whitespace, and the occasional `{colors.graphite-100}` background on alternating content bands. The 8px spacing grid (`{spacing.sm}` as base unit) governs all internal dimensions, with `{spacing.section}` at 80px between major page bands. Cards use `{rounded.lg}` (12px) corners with 1px borders -- clean, geometric containers that let content breathe. Dark mode is supported via CSS custom property swap triggered by `prefers-color-scheme: dark`, inverting the canvas to `{colors.dark-bg}` (#1A1D21) while preserving the same spatial relationships and accent rules.

**Key Characteristics:**
- Clean white canvas (`{colors.paper-white}` -- #FFFFFF) with warm Graphite text (`{colors.graphite-900}` -- #23262C). No cream tints, no cool grays -- pure white with warm dark text.
- Dual chromatic accent system: Amber Rust (`{colors.amber-rust}` -- #C97A54) for ACTION (CTAs, interactive elements, active states, action-section eyebrows) and Eucalyptus (`{colors.eucalyptus}` -- #6B9E8C) for INSIGHT (data eyebrows, metric callouts, status pills, illustrative graphics). Each is scarce within its own role; the two never overlap in function.
- Dual-font voice: Inter (cv01, ss03) for headlines and UI, DM Sans for body copy. The split is structural vs. narrative.
- UI weight `510` for buttons, navigation, labels, form fields. Display weight `600`/`700` with negative tracking for editorial density.
- Card-based layouts with 1px `{colors.cloud-zinc}` borders and `{rounded.lg}` (12px) corners. No shadows at rest -- depth comes from border and whitespace.
- Uniform light page rhythm -- no dark section bands, no alternating surface tones. White canvas throughout, with `{colors.graphite-100}` for subtle background variation.
- Monochrome editorial illustration style -- clean line work in Graphite tones, not photorealistic.
- 8px spacing grid with `{spacing.section}` (80px) between major bands.
- Dark mode via CSS custom property swap on `prefers-color-scheme: dark`.
- Eucalyptus (`{colors.eucalyptus}` -- #6B9E8C) used for the INSIGHT voice: data eyebrows, metric callouts, status pills, validated/positive indicators, and illustrative line work. Pairs complementary with Amber Rust under strict role separation.

## Colors

### Brand & Accent

The system runs on **two complementary chromatic accents** under strict role separation. Amber Rust carries the ACTION voice; Eucalyptus carries the INSIGHT voice. They never substitute for each other.

#### Amber Rust — ACTION voice
- **Amber Rust** (`{colors.amber-rust}` -- #C97A54): Primary CTA buttons, action-section eyebrow labels (hero, solutions, CTA bands), active nav states, interactive pill tags, inline links in body copy. Means "actionable."
- **Amber Rust Hover** (`{colors.amber-rust-hover}` -- #B56A45): The pressed/hover state, one step darker. Used as `button-primary-hover` background.
- **Amber Rust Light** (`{colors.amber-rust-light}` -- rgba(201,122,84,0.08)): A translucent warm wash used as tag and pill backgrounds for interactive categories (solution tags). Pairs with Amber Rust text.
- **Amber Rust Focus** (`{colors.amber-rust-focus}` -- rgba(201,122,84,0.2)): A translucent ring used as the focus outline on inputs and interactive elements. Visible, warm, accessible.

#### Eucalyptus — INSIGHT voice
- **Eucalyptus** (`{colors.eucalyptus}` -- #6B9E8C): Data-section eyebrow labels (metrics band, case studies, testimonials, blog), metric callout numerals, status pill text ("Live", "Verified", "Approved"), checkmark/shield icons, illustrative line-work accents in graphics. Means "known, validated, measured."
- **Eucalyptus Hover** (`{colors.eucalyptus-hover}` -- #588977): Pressed/emphasized state, one step darker. Use as fill on Eucalyptus icon buttons or status pills carrying white text — improves contrast over the base hue.
- **Eucalyptus Light** (`{colors.eucalyptus-light}` -- rgba(107,158,140,0.08)): Translucent wash for status pills, metric badges, and metadata tag backgrounds (e.g., "Research", "Case Study" content-type chips). Pairs with Eucalyptus text. Mirrors `{colors.amber-rust-light}` opacity exactly.
- **Eucalyptus Focus** (`{colors.eucalyptus-focus}` -- rgba(107,158,140,0.2)): Focus ring for validated-state inputs (verified email field, confirmed selection). Signals "this input has passed validation," distinct from `{colors.amber-rust-focus}` which signals an interactive-but-not-yet-validated state.

#### Dual-Accent Pairing Rules

The two accents coexist on a single page but never inside a single component. The voltage of the brand comes from their separation.

**By section**
- An "action-led" section (hero, solutions grid, CTA band, pricing) uses Amber Rust eyebrows + Amber Rust CTAs.
- An "insight-led" section (metrics bar, case study results, testimonial quotes, blog grid) uses Eucalyptus eyebrows + Eucalyptus metric callouts. If the section ends with a CTA, the CTA itself uses Amber Rust — the eyebrow voice does not override the action color.
- Never mix Rust and Eucalyptus eyebrows on the same section.

**By text role**
- **CTA copy, inline links, navigation:** Amber Rust only.
- **Metric numerals, validated data points, "live"/"verified"/"approved" descriptors, content-type labels (Research / Case Study):** Eucalyptus only.
- **Body paragraphs, headlines, helper text:** Graphite — never tinted with either accent.

**By outline / border role**
- **Default 1px card and input borders:** `{colors.cloud-zinc}` -- not an accent.
- **Active interactive outline** (focused input, active tab, selected pill): `{colors.amber-rust-focus}` ring or Amber Rust 1px border.
- **Validated/positive outline** (verified input, "live" status pill, success badge): `{colors.eucalyptus-focus}` ring or Eucalyptus 1px border.
- A single element may carry only one outline accent at a time. If an input is both interactive AND validated, the Eucalyptus outline wins (state is more informative than interactivity).

**By tag / pill role**
- **Interactive tag** (clickable category, solution chip): `{colors.amber-rust-light}` background + Amber Rust text.
- **Metadata tag** (content-type, "Research", "Case Study", date, tag list): `{colors.eucalyptus-light}` background + Eucalyptus text.
- **Status pill** ("Live", "Verified", "Approved", positive trend indicator): `{colors.eucalyptus-light}` background + Eucalyptus text, optionally with a `{colors.eucalyptus}` dot.

**By icon role**
- **Action icons** (arrow, plus, external-link, chevron, hamburger): Amber Rust when colored, Graphite when neutral.
- **Insight icons** (checkmark, shield, trending-up, sparkline, "live" dot): Eucalyptus.

**By illustration**
- Monochrome editorial line work uses Graphite tones as the base. **Both accents may appear in illustrations** -- Amber Rust on interactive nodes or flagged data points, Eucalyptus on validated nodes, stable signals, or "approved" markers. This is the only context where both accents share a surface, because the illustration is *narrating* the action/insight pairing.

**Contrast note.** Both Amber Rust (#C97A54, 3.28:1 on white) and Eucalyptus (#6B9E8C, 3.07:1 on white) pass WCAG AA for large text and UI components (3:1) but not for normal text (4.5:1). When either accent carries body-sized text (≤14px regular), prefer pairing with `{colors.graphite-900}` for the body and using the accent only on the emphasized phrase, or use `{colors.amber-rust-hover}` / `{colors.eucalyptus-hover}` for slightly improved contrast.

### Surface
- **Paper White** (`{colors.paper-white}` -- #FFFFFF): The default page background. Pure white, not tinted. The brand's canvas.
- **BG Surface** (`{colors.bg-surface}` -- #FAFAFA): Off-white surface for alternating content sections. The difference from Paper White is subtle -- a one-step warmth that breaks visual monotony without introducing a new surface tone.
- **Graphite 100** (`{colors.graphite-100}` -- #F0F1F2): Subtle background for alternating sections and content bands. Slightly cooler than BG Surface.
- **Graphite 50** (`{colors.graphite-50}` -- #F7F8F8): Page background surface alternative. Between Paper White and Graphite 100.
- **Cloud Zinc** (`{colors.cloud-zinc}` -- #D1D5DB): The 1px border color for cards, inputs, dividers, and the nav bar bottom border. The system's primary structural line.
- **Cloud Zinc Light** (`{colors.cloud-zinc-light}` -- #E8EAED): A lighter border used on hover states for cards and interactive containers.

### Text
- **Graphite 900** (`{colors.graphite-900}` -- #23262C): Primary text color for all headlines and strong body text. Warm dark charcoal, never pure black.
- **Graphite 800** (`{colors.graphite-800}` -- #2E3138): Hover-dark states and emphasized interactive text.
- **Graphite 700** (`{colors.graphite-700}` -- #3A3F47): Secondary text, muted labels, footer body text, helper copy. One step lighter than primary.
- **Graphite 500** (`{colors.graphite-500}` -- #6B7280): Muted text for descriptions, subtitles, helper copy, and card body text. WCAG AA compliant (4.6:1 on white).
- **On Accent** (`{colors.on-accent}` -- #FFFFFF): Text on Amber Rust buttons and surfaces. Always white.

### Semantic

Success / positive state is a subset of the Eucalyptus INSIGHT voice -- "approved" / "verified" / "live" are simply the most common forms of validated data. See Eucalyptus under **Brand & Accent** above for the full token family. The semantic aliases below are kept for component-API readability (e.g., `--color-success` reads more clearly than `--color-accent-secondary` on a success badge), but resolve to the same primitives.

- **Success** alias -- resolves to `{colors.eucalyptus}` -- #6B9E8C.
- **Success Light** alias -- resolves to `{colors.eucalyptus-light}` -- rgba(107,158,140,0.08).
- **Error** (`{colors.error}` -- #D05454): Form validation errors, destructive action warnings. Distinct from both accents -- never substitutes for Amber Rust.
- **Info** (`{colors.info}` -- #5B8DEF): Informational callouts and neutral status indicators. Used sparingly; prefer Eucalyptus where the state is positive rather than merely informational.

### Dark Mode
- **Dark BG** (`{colors.dark-bg}` -- #1A1D21): Page background in dark mode. Replaces Paper White.
- **Dark Surface** (`{colors.dark-surface}` -- #23262C): Card and elevated surface background in dark mode.
- **Dark Elevated** (`{colors.dark-elevated}` -- #3A3F47): Further-elevated surfaces in dark mode (dropdowns, modals, tooltips).
- **Dark Text** (`{colors.dark-text}` -- #FFFFFF): Primary text in dark mode.
- **Dark Text Muted** (`{colors.dark-text-muted}` -- #D1D5DB): Secondary/muted text in dark mode.
- **Dark Border** (`{colors.dark-border}` -- rgba(255,255,255,0.1)): Card borders and dividers in dark mode. Replaces Cloud Zinc.

## Typography

### Font Family

The headline and UI tier is **Inter** (open-source, available via Google Fonts) with `font-feature-settings: 'cv01', 'ss03'` enabled globally. `cv01` substitutes an alternate lowercase `a` (single-story); `ss03` provides alternate digit forms. These features are part of the brand's typographic identity -- Inter without them looks generic. The fallback stack is `-apple-system, BlinkMacSystemFont, sans-serif`.

The body tier is **DM Sans** (open-source, available via Google Fonts) at weights 400, 500, and 700. DM Sans is a geometric sans-serif with slightly humanist proportions that reads cleanly at body sizes (14-18px) with generous line-height. The fallback stack is the same system sans stack.

The monospace tier is **SF Mono** (macOS), falling back to **Fira Code** and **Consolas**. Used for data displays, code blocks, and numeric readouts where alignment matters.

The headline/body split is structural:
- Inter (cv01, ss03) at weight 600-700 with negative tracking --> h1, h2, h3, section titles, navigation, buttons, labels
- DM Sans at weight 400 --> body paragraphs, descriptions, long-form content
- SF Mono / Fira Code --> code blocks, data displays, numeric readouts

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Font | Use |
|---|---|---|---|---|---|---|
| `{typography.display-hero}` | 64px | 700 | 1.05 | -0.035em | Inter | Homepage hero headline (Column-scale declarative cut; one per page) |
| `{typography.display-xl}` | 48px | 700 | 1.1 | -0.03em | Inter | Hero headline |
| `{typography.display-lg}` | 36px | 600 | 1.15 | -0.02em | Inter | Section opener |
| `{typography.display-md}` | 28px | 600 | 1.2 | -0.02em | Inter | Sub-section head, CTA headline |
| `{typography.display-sm}` | 24px | 600 | 1.25 | -0.01em | Inter | Card title, compact section head |
| `{typography.title-lg}` | 20px | 600 | 1.3 | 0 | Inter | Feature card title |
| `{typography.title-md}` | 18px | 600 | 1.4 | 0 | Inter | Smaller card title, intro label |
| `{typography.body-lg}` | 18px | 400 | 1.6 | 0 | DM Sans | Lead paragraph, hero sub-headline |
| `{typography.body-md}` | 16px | 400 | 1.75 | 0 | DM Sans | Default running text |
| `{typography.body-sm}` | 14px | 400 | 1.5 | 0 | DM Sans | Footer body, fine print |
| `{typography.ui-label}` | 14px | 510 | 1 | 0.02em | Inter | Form labels, nav items, field labels |
| `{typography.ui-button}` | 14px | 600 | 1 | 0 | Inter | Button text |
| `{typography.nav-link}` | 14px | 510 | 1.4 | 0 | Inter | Navigation menu items |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Inter | Tag text, helper captions |
| `{typography.caption-uppercase}` | 11px | 600 | 1.4 | 0.08em | Inter | Section eyebrow labels, all-caps markers |
| `{typography.data-display}` | 18px | 500 | 1 | -0.02em | SF Mono | Stat numbers, KPI readouts |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | SF Mono | Code blocks, terminal text |

### Weight & Tracking

The weight system is intentional:

- **700** -- Hero headlines only (`{typography.display-xl}`). Maximum presence, used once per page.
- **600** -- Display and title tiers (`display-lg` through `title-md`), button labels, caption-uppercase eyebrows. The workhorse heading weight.
- **510** -- UI chrome: navigation links, form labels, field text. The fractional weight is the brand's quiet typographic signal. It produces a "present but not heavy" quality that distinguishes interface elements from both body text (400) and headings (600).
- **500** -- Captions, data-display numerics. A standard medium for small supporting text.
- **400** -- All body copy in DM Sans, code blocks. The reading weight.

Negative letter-spacing is applied at display sizes only:
- `-0.03em` at 48px (display-xl)
- `-0.02em` at 36px and 28px (display-lg, display-md)
- `-0.01em` at 24px (display-sm)
- `0` at 20px and below

This tracking scale tightens proportionally with size, producing editorial density at hero scale while maintaining readability at smaller sizes. Below 20px, tracking stays at `0` or opens slightly (`0.02em` for labels, `0.08em` for uppercase eyebrows).

### Principles
- **OpenType features are non-negotiable.** Every element using Inter must have `font-feature-settings: 'cv01', 'ss03'` applied. Without these features, Inter looks like any other sans-serif. The alternate `a` and digit forms are the brand's typographic identity.
- **510 is the UI weight.** Buttons, nav links, labels, form fields all use weight 510. Not 500, not 600. The fractional weight is intentional.
- **Display is Inter, body is DM Sans.** Never use DM Sans for headlines. Never use Inter for body paragraphs. The split is structural (Inter) vs. narrative (DM Sans).
- **Negative tracking on display only.** Body sizes stay at `0` letter-spacing. Tightening body text reduces readability.

## Layout

### Spacing System
- **Base unit:** 8px (with 2px and 4px sub-tokens for fine work).
- **Tokens:** `{spacing.xxs}` 2px . `{spacing.xs}` 4px . `{spacing.sm}` 8px . `{spacing.md}` 12px . `{spacing.lg}` 16px . `{spacing.xl}` 24px . `{spacing.xxl}` 32px . `{spacing.section}` 80px . `{spacing.section-mobile}` 48px.
- **Section padding:** `{spacing.section}` (80px) between major page bands at desktop; `{spacing.section-mobile}` (48px) on mobile.
- **Card internal padding:** 32px for solution cards, stat cards, and feature cards. The generous internal space lets content breathe and reinforces the clean, precise feel.
- **Nav bar height:** 64px with sticky positioning and a 1px `{colors.cloud-zinc}` bottom border.

### Grid & Container
- **Max content width:** 1120px centered with horizontal padding (`--max-width`).
- **Prose measure:** long-form text columns cap at `{spacing.measure}` (68ch).
- **Hero layout:** Full-width with centered text or a 6/6 split (headline left, visual right).
- **Solution cards:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Stat cards:** 3-up or 4-up at desktop depending on content, stacking on mobile.
- **Blog cards:** 3-up grid at desktop with overflow hidden for image crops.

### Whitespace Philosophy
The uniform white canvas means depth comes from whitespace, not surface color changes. Section gaps at 80px produce a measured editorial rhythm -- unhurried but not sparse. Card padding at 32px gives content room to breathe. The 8px grid governs every dimension: margins, padding, gaps, and component heights all snap to 8px multiples (with 2px and 4px exceptions for fine-grained alignment work like border offsets and icon spacing).

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat | Body sections, hero, CTA bands |
| 1 | 1px `{colors.cloud-zinc}` border | Cards, inputs, nav bar bottom, footer top |
| 1-hover | 1px `{colors.cloud-zinc-light}` border | Card hover states |
| 2 | `box-shadow: 0 1px 3px rgba(35,38,44,0.06)` | Dropdown menus, tooltips (rare) |
| 3 | `box-shadow: 0 4px 16px rgba(35,38,44,0.08)` | Modals, floating panels (rare) |

### Depth Philosophy
The system is **border-first, shadow-rare**. Cards define their boundaries with 1px `{colors.cloud-zinc}` borders, not drop shadows. This produces a flat, precise, architectural quality that reinforces the brand's trustworthiness. Shadows are reserved for floating UI elements (dropdowns, tooltips) that need to communicate layering -- they never appear on resting-state cards or sections.

In dark mode, borders shift to `{colors.dark-border}` (rgba(255,255,255,0.1)) and shadows darken proportionally. The border-first philosophy means the dark mode transition is clean -- no shadow-color adjustments needed for the majority of components.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Small inline elements, tiny badges |
| `{rounded.sm}` | 6px | Form inputs, blog cards |
| `{rounded.md}` | 8px | Buttons, stat cards, standard interactive elements |
| `{rounded.lg}` | 12px | Solution cards, feature cards, content containers |
| `{rounded.xl}` | 16px | Hero illustration containers, large marquee cards |
| `{rounded.pill}` | 9999px | Solution tags, pill badges |

### Illustration & Photography
undersight uses **monochrome editorial illustration** -- clean geometric line work in Graphite tones with occasional Amber Rust accents on interactive or highlighted elements. Illustrations communicate precision and intelligence: data flow diagrams, underwriting process visualizations, risk assessment graphics.

Photography is minimal. When used (team photos, case studies), images are treated with subtle desaturation and crop to consistent aspect ratios within cards. Avoid stock photography; prefer diagrammatic and data-driven visuals that reinforce the platform's analytical nature.

## Components

### Navigation

**`nav-bar`** -- Sticky white navigation bar at the top of every page. 64px tall, `{colors.paper-white}` background, 1px `{colors.cloud-zinc}` bottom border. Carries the undersight wordmark (always lowercase) at left, primary horizontal menu center-left in `{typography.nav-link}` (Inter 14px / 510), right-side cluster with "Sign In" text link and "Get Started" `{component.button-primary}` (Amber Rust). The nav bar uses `position: sticky` so it follows the user down the page.

### Buttons

**`button-primary`** -- The signature Amber Rust CTA. Background `{colors.amber-rust}` (#C97A54), text `{colors.on-accent}` (white), type `{typography.ui-button}` (Inter 14px / 600), padding 10px x 20px, height 40px, rounded `{rounded.md}` (8px). Hover state `button-primary-hover` darkens to `{colors.amber-rust-hover}` (#B56A45). Focus state adds a 3px `{colors.amber-rust-focus}` ring.

**`button-ghost`** -- Outline-style secondary button. Background transparent, text `{colors.graphite-700}`, 1px `{colors.cloud-zinc}` border, same padding/height/radius as primary. Hover state `button-ghost-hover` shifts text and border to `{colors.graphite-900}`.

### Cards & Containers

**`hero-section`** -- Full-width hero on white canvas. Headline in `{typography.display-xl}` (Inter 48px / 700, -0.03em), sub-headline in `{typography.body-lg}` (DM Sans 18px / 400), followed by a button row. Vertical padding `{spacing.section}` (80px). The hero is always on `{colors.paper-white}` -- no dark heroes, no gradient backdrops.

**`card-solution`** -- The primary content card used in solution grids. Background `{colors.paper-white}`, 1px `{colors.cloud-zinc}` border, rounded `{rounded.lg}` (12px), internal padding 32px. Carries a `{component.section-label}` eyebrow, a `{typography.title-lg}` headline, body text in `{typography.body-md}`, and optional `{component.solution-tag}` pills. Hover state shifts border to `{colors.cloud-zinc-light}`.

**`card-blog`** -- Blog post card with image crop at top. Background `{colors.paper-white}`, 1px `{colors.cloud-zinc}` border, rounded `{rounded.sm}` (6px), `overflow: hidden` for the image crop. Carries a thumbnail image, a `{typography.title-md}` headline, a `{typography.body-sm}` excerpt, and a date in `{typography.caption}`.

**`stat-card`** -- Numeric stat display card. Background `{colors.paper-white}`, 1px `{colors.cloud-zinc}` border, rounded `{rounded.md}` (8px), centered text. The stat number renders in `{typography.data-display}` (SF Mono 18px / 500) and the label in `{typography.caption}`. Used to display platform metrics, processing volumes, and accuracy rates.

### Inputs & Forms

**`text-input`** -- Standard form field. Background `{colors.paper-white}`, text `{colors.graphite-900}`, type `{typography.body-md}`, padding 10px x 14px, height 40px, rounded `{rounded.sm}` (6px), 1px `{colors.cloud-zinc}` border.

**`text-input-focused`** -- Focus state. Border shifts to `{colors.amber-rust}`, and a 3px `{colors.amber-rust-focus}` outer ring appears. The warm Amber Rust focus ring is a deliberate contrast to the system's otherwise cool, neutral palette -- it signals interactivity.

### Section Labels & Tags

**`section-label`** -- Section eyebrow text. Text in `{colors.amber-rust}`, type `{typography.caption-uppercase}` (Inter 11px / 600, 0.08em tracking). Used above every major section to label content categories ("SOLUTIONS", "HOW IT WORKS", "TRUSTED BY"). The Amber Rust color is the eyebrow's only decoration -- no underlines, no icons.

**`solution-tag`** -- Pill-shaped tag for solution categorization. Background `{colors.amber-rust-light}` (translucent warm), text `{colors.amber-rust}`, type `{typography.caption}` (Inter 13px / 500), rounded `{rounded.pill}` (9999px), padding 2px x 10px. Used inside solution cards to label capabilities.

### CTA & Footer

**`cta-section`** -- Pre-footer call-to-action band. Background `{colors.paper-white}`, text `{colors.graphite-900}`, centered layout. Headline in `{typography.display-md}` (Inter 28px / 600), sub-line in `{typography.body-lg}`, followed by a `{component.button-primary}`. Vertical padding `{spacing.section}` (80px). The CTA section stays on the white canvas -- the Amber Rust button is the sole color accent.

**`footer`** -- Site-wide footer closing every page. Background `{colors.paper-white}`, 1px `{colors.cloud-zinc}` top border, text `{colors.graphite-700}`, type `{typography.body-sm}` (DM Sans 14px / 400). Padding `{spacing.xl}` (24px). Carries 3-4 columns of link groups in `{typography.nav-link}`, social icons, and a legal/copyright row. The footer stays light -- it does not invert to dark.

## Background Motifs

The "underwriting paper" motif system (added 2026-06-12). Two shapes carry
every background treatment: **the written line** (1px hairline ledger rules,
editorial double rules, the amber pen-stroke bookend — the line-logo geometry)
and **the underwriter's eye** (a hairline ring with center dot — registration
mark / scope reticle, the favicon's circular cutout). One weight (1px), one
ink (graphite at 3–10% opacity via `--pattern-line` / `--pattern-line-strong`),
one grid (8px pitches: 80px / 32px).

**Pattern primitives are not gradients.** `repeating-linear-gradient` with
hard stops drawing flat 1px lines, and alpha-only `mask-image` fades, are
*line primitives* — there is no visible color transition. The "no gradient
backdrops" rule refers to color-transition washes (radial glows, mesh
gradients, duotones), which remain prohibited.

**Usage rules.**
- Backgrounds are monochrome graphite only. Amber never appears in background
  graphics; the two pen-stroke bookends (`.hero-bar`, CTA signature stroke)
  are logo-derived marks, capped at one non-interactive amber per viewport.
- Strokes are always 1px. Field tint behind running body text caps at ~4%.
- Max one large motif figure per viewport.
- Treatments are pseudo-elements: `pointer-events: none`, absolutely
  positioned, zero layout shift, content z-lifted (`.bg-ruled` handles this).
- Every treatment must be tokens-only and dark-aware (the `--pattern-*`
  tokens swap per scheme).

**Pattern vocabulary** (all in `css/main.css` under MOTIF PRIMITIVES;
demos in `preview.html` §14):
- `.bg-ruled` / `.bg-ruled--dense` — ruled ledger field, masked fade
  (80px / 32px pitch).
- `.rule-double` — editorial double rule: a true 1px rule, 3px bg-masked gap,
  1px lighter echo (`--rule-double-gap`). Masthead / totals-row / colophon
  grammar.
- `.eye-ring` — 12px hairline ring + 4px center dot. Timeline nodes, cite
  bullets, step markers.
- Exhibit crop marks — four corner ticks outside a card border
  (`--pattern-line-strong`), framing case studies as pinned exhibits.
- Ghost folio indices — SF Mono `01`–`04` CSS-counter numerals in
  `--pattern-line-strong` behind process steps.
- Signature strokes — the hero pen-stroke on a full-width baseline rule
  opens the page; a mirrored static stroke signs the CTA.
- Footer colophon — editorial double rule + the 16px favicon nib at 40%.

**Decision log (2026-06-12).** Removed: the hero triple radial-gradient wash
(violated no-gradients), non-interactive amber on stat numerals / timeline
dots / case-study step circles / quote marks / cite avatar (accent rule),
the case-study resting box-shadow (border-first rule). The V2 homepage had
already re-lit the former dark stats/testimonial bands; their dark CSS is
dead legacy code. Open rulings: (1) the two amber pen-strokes — amber vs
graphite one-line variants exist; (2) solution-page contained dark blocks
(`.convo-preview`, `.capacity-callout`, `.not-workflow`, `.chat-surface`,
`.api-preview`, `.mca-callout`) — contained component panels today, not
section bands; principle 5 untouched pending a ruling.

## Column Adaptation — Editorial Ledger (2026-07-10)

The homepage design language was re-anchored on column.com's document-first
structure ("the underwriting file"), explicitly bypassing the built-in Claude
design template (`reference/claude.DESIGN.md`: cream #faf9f5 canvas, coral
#cc785c accent, serif-400 display, cream-to-dark band alternation — none of
those moves are used). Column contributes *structure*, not color: the brand
palette, dual-accent semantics, and font stack are unchanged.

**Keep (brand non-negotiables).** Dual chromatic accents under strict role
separation (Rust = act, Eucalyptus = know); Inter cv01/ss03 + weight 510 UI
chrome; DM Sans body; light-first uniform canvas; border-first depth; the
underwriting-paper motif grammar (ruled fields, double rules, eye-rings,
crop marks, ghost folios, signature strokes, colophon).

**Amplify (motifs become the layout language).** Hairlines structure the
page, not card boxes: Who-We-Serve is three ruled text columns with
registration ticks (no boxes); the stats band stays a ledger totals row;
case tiles keep exhibit crop marks. Metadata speaks mono: section eyebrows,
stat labels, footer index headers, and the testimonial label are SF Mono
12px/11px uppercase, and eyebrows are folio-numbered ("01 · Who we serve").

**Swap.**
- Hero visual: the 3-card collage is replaced by ONE product artifact — the
  `.hv-ledger` decision ledger (file header, ruled rows with verified /
  review / approve states, double-rule composite total, mono foot). The
  product is the hero visual; Column's signature move.
- Hero type: `{typography.display-hero}` 64px/1.05/-0.035em declarative cut.
- Radius scale usage moves down: buttons, cards, tiles, frames, inputs use
  `{rounded.xs}` (4px). Metadata chips and status pills stay `{rounded.pill}`.
  Floating UI (modal, theme toggle) is exempt.
- Hover sobriety: no translateY lifts, no hover shadows — hover is a
  border-color shift to `{colors.graphite-700}` (or color change) only.

**Extend (new tokens, synced across DESIGN.md + tokens/tokens.css +
tokens/tokens.json + css/tokens.css).** `{typography.display-hero}`;
`{spacing.measure}` (68ch prose measure, `--measure`); `{spacing.xxxl}`
(48px); `{colors.rule}` (`--color-rule`, in-content hairline decoupled from
structural borders and motif pattern ink; swaps to dark-border in dark mode).

**Decision log (2026-07-10).** Deleted dead V1 blocks (dark stats bar, dark
testimonial band, case-study split card, how-timeline, sol-visual-box, blog
filters v1, placeholder markers) and pruned their eye-ring selector-group
references; removed the hvTyping keyframe with the hero chat card (hvLiveDot
survives on the ledger's live pill); reconciled the two-copy token drift
(eucalyptus-light 0.08 both sides, accent-secondary family in css/tokens.css,
graphite-500/text-muted in tokens/tokens.css, tokens.json max-content-width
1120px). Invariants live in `tests/design-editorial.sh`.

## Do's and Don'ts

### Do
- Reserve `{colors.amber-rust}` for primary CTAs, active states, action-section eyebrows, and interactive tags. It should appear sparingly -- one filled button per visible viewport.
- Use `{colors.eucalyptus}` for data-section eyebrows, metric numerals, status pills, validated-state outlines, and "insight" icons (checkmark, shield, trending-up).
- Choose **one accent voice per section.** Action-led sections use Rust eyebrows; insight-led sections use Eucalyptus eyebrows. Never mix the two in the same section header.
- Apply `font-feature-settings: 'cv01', 'ss03'` to every Inter element. This is the brand's typographic identity.
- Use weight `510` for all UI chrome (nav links, form labels, field text). Not 500, not 600.
- Use `{typography.display-xl}` (Inter 48px / 700) for hero headlines only. One per page.
- Keep the page rhythm uniform: white canvas throughout, with `{colors.graphite-100}` or `{colors.bg-surface}` for subtle background variation.
- Define card boundaries with 1px `{colors.cloud-zinc}` borders. No resting-state shadows.
- Apply `{spacing.section}` (80px) between major bands consistently.

### Don't
- Don't use Amber Rust decoratively. It is never a background fill on non-interactive elements, never a border color on resting cards, never a text color for body copy.
- Don't use Eucalyptus as a CTA color or to signal interactivity. It is the INSIGHT voice -- if it carries meaning, that meaning is "known / validated / measured," never "click me."
- Don't mix Amber Rust and Eucalyptus inside a single component (button, badge, card header). The voltage of the dual system comes from their separation.
- Don't use both accents on the same eyebrow / section opener. Choose one voice per section.
- Don't use Inter for body paragraphs. Body copy is DM Sans only.
- Don't use DM Sans for headlines, buttons, or labels. Headlines and UI chrome are Inter only.
- Don't add drop shadows to resting-state cards. The system is border-first.
- Don't introduce dark section bands or alternating dark/light page rhythm. The page stays uniformly light.
- Don't capitalize "undersight" in any context. It is always lowercase.
- Don't use weight 500 for UI elements. The brand weight is 510.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger nav; hero 48 -> 32px; solution cards 1-up; stat cards stack; section padding 48px |
| Tablet | 768-1024px | Top nav stays horizontal but tightens; solution cards 2-up; stat cards 2-up |
| Desktop | 1024-1440px | Full top-nav; solution cards 3-up; stat cards 3-4 up; hero at full scale |
| Wide | > 1440px | Same as desktop with more outer breathing room; max content width caps at 1200px |

### Touch Targets
- `{component.button-primary}` at minimum 40 x 40px. On mobile, padding scales up to ensure 44px minimum touch target per WCAG.
- `{component.text-input}` height stays at 40px at all breakpoints.
- `{component.card-solution}` entire card area is tappable; effective tap area far exceeds 44px.

### Collapsing Strategy
- Top nav collapses to hamburger at < 768px; menu opens as a full-screen white sheet.
- Hero headline stair-steps from 48px (desktop) to 36px (tablet) to 32px (mobile).
- Solution card grids reduce columns rather than scaling cards: 3 -> 2 -> 1.
- Stat cards stack vertically on mobile, maintaining centered text alignment.
- Section padding reduces from `{spacing.section}` (80px) to `{spacing.section-mobile}` (48px) on mobile.
- Footer columns collapse from 3-4 columns to a single stacked column.

### Image Behavior
- Illustration SVGs scale proportionally with container width; stroke widths stay fixed.
- Blog card images crop to consistent aspect ratios at every breakpoint via `object-fit: cover`.
- Data visualizations inside stat cards simplify on mobile (fewer data points, larger labels).

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.card-solution}`, `{component.button-primary}`, `{component.section-label}`).
2. Variants of an existing component (`-hover`, `-focused`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere -- never inline hex values in component code.
4. Default body to `{typography.body-md}` (DM Sans 16px / 400). Use `{typography.body-lg}` for lead paragraphs and hero sub-headlines.
5. Apply `cv01, ss03` globally on the body element for Inter. DM Sans elements inherit but don't use these features.
6. Amber Rust is the only color accent in the system. When tempted to add a second accent, use Graphite weight/size variation instead.
7. When adding new components, follow the existing naming convention: `component-variant` (e.g., `card-solution`, `card-solution-hover`).
8. Test every new component in both light and dark mode before shipping.
