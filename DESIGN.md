---
version: alpha
name: undersight-design-system
description: A light-first editorial design system for undersight.ai — an AI underwriting platform for private credit. The system anchors on a clean white canvas with warm Graphite text, a dual-font voice (Inter for headlines and UI, DM Sans for body), and a single chromatic accent in Amber Rust reserved exclusively for CTAs and interactive elements. The brand communicates trustworthiness and precision through generous whitespace, an 8px spacing grid, card-based layouts with subtle borders, and monochrome editorial illustration. Dark mode is supported via CSS custom property swap on prefers-color-scheme. OpenType features cv01 and ss03 are enabled globally on all Inter text.

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
  amber-rust: "#C97A54"
  amber-rust-hover: "#B56A45"
  amber-rust-light: "rgba(201,122,84,0.08)"
  amber-rust-focus: "rgba(201,122,84,0.2)"
  eucalyptus: "#6B9E8C"
  eucalyptus-light: "rgba(107,158,140,0.1)"
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
  section: 80px
  section-mobile: 48px

components:
  button-primary:
    backgroundColor: "{colors.amber-rust}"
    textColor: "{colors.on-accent}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.amber-rust-hover}"
    textColor: "{colors.on-accent}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 40px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.graphite-700}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 40px
    border: 1px solid {colors.cloud-zinc}
  button-ghost-hover:
    backgroundColor: transparent
    textColor: "{colors.graphite-900}"
    typography: "{typography.ui-button}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 40px
    border: 1px solid {colors.graphite-900}
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
    rounded: "{rounded.lg}"
    padding: 32px
    border: 1px solid {colors.cloud-zinc}
  card-solution-hover:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    rounded: "{rounded.lg}"
    padding: 32px
    border: 1px solid {colors.cloud-zinc-light}
  card-blog:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    border: 1px solid {colors.cloud-zinc}
    overflow: hidden
  stat-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.data-display}"
    rounded: "{rounded.md}"
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
    typography: "{typography.caption-uppercase}"
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

undersight's design system is a light-first editorial interface built for an AI underwriting platform. The system anchors on a clean white canvas (`{colors.paper-white}` -- #FFFFFF) with warm Graphite text (`{colors.graphite-900}` -- #23262C), producing a reading experience that feels precise, trustworthy, and intelligent -- qualities essential for a platform operating in private credit. The single chromatic accent, Amber Rust (`{colors.amber-rust}` -- #C97A54), is reserved exclusively for calls to action and interactive elements. It never appears decoratively. This scarcity is the brand's voltage: when Amber Rust appears, something is actionable.

The type system runs a dual-font voice. **Inter** (with OpenType features `cv01` and `ss03` enabled globally) handles all headlines, navigation, labels, buttons, and UI chrome -- the structural skeleton of the page. **DM Sans** handles body copy, descriptions, and long-form reading -- the humanist voice that carries explanatory content. The weight `510` (not 500) is used for UI elements: buttons, navigation links, labels, and form fields. This fractional weight is a quiet signal of typographic intention; it sits between regular and medium, giving interface chrome just enough presence without the heaviness of a traditional medium weight. Display headlines use `600` and `700` with negative letter-spacing (`-0.03em` to `-0.01em`) for editorial density.

The layout philosophy is uniform light page rhythm. There are no dark hero bands, no gradient meshes, no alternating surface-tone sections. Every section lives on the same white or near-white canvas, with depth communicated through card borders (`{colors.cloud-zinc}`), generous whitespace, and the occasional `{colors.graphite-100}` background on alternating content bands. The 8px spacing grid (`{spacing.sm}` as base unit) governs all internal dimensions, with `{spacing.section}` at 80px between major page bands. Cards use `{rounded.lg}` (12px) corners with 1px borders -- clean, geometric containers that let content breathe. Dark mode is supported via CSS custom property swap triggered by `prefers-color-scheme: dark`, inverting the canvas to `{colors.dark-bg}` (#1A1D21) while preserving the same spatial relationships and accent rules.

**Key Characteristics:**
- Clean white canvas (`{colors.paper-white}` -- #FFFFFF) with warm Graphite text (`{colors.graphite-900}` -- #23262C). No cream tints, no cool grays -- pure white with warm dark text.
- Single chromatic accent: Amber Rust (`{colors.amber-rust}` -- #C97A54) reserved for CTAs, interactive elements, active states, and section labels. Never decorative.
- Dual-font voice: Inter (cv01, ss03) for headlines and UI, DM Sans for body copy. The split is structural vs. narrative.
- UI weight `510` for buttons, navigation, labels, form fields. Display weight `600`/`700` with negative tracking for editorial density.
- Card-based layouts with 1px `{colors.cloud-zinc}` borders and `{rounded.lg}` (12px) corners. No shadows at rest -- depth comes from border and whitespace.
- Uniform light page rhythm -- no dark section bands, no alternating surface tones. White canvas throughout, with `{colors.graphite-100}` for subtle background variation.
- Monochrome editorial illustration style -- clean line work in Graphite tones, not photorealistic.
- 8px spacing grid with `{spacing.section}` (80px) between major bands.
- Dark mode via CSS custom property swap on `prefers-color-scheme: dark`.
- Eucalyptus (`{colors.eucalyptus}` -- #6B9E8C) reserved for success states and positive indicators only.

## Colors

### Brand & Accent
- **Amber Rust** (`{colors.amber-rust}` -- #C97A54): The brand's single chromatic accent. Used on every primary CTA button, on section eyebrow labels, on active states, and on interactive pill tags. The scarcity rule is absolute: Amber Rust means "actionable."
- **Amber Rust Hover** (`{colors.amber-rust-hover}` -- #B56A45): The pressed/hover state, one step darker. Used as `button-primary-hover` background.
- **Amber Rust Light** (`{colors.amber-rust-light}` -- rgba(201,122,84,0.08)): A translucent warm wash used as tag and pill backgrounds. Pairs with Amber Rust text for solution tags.
- **Amber Rust Focus** (`{colors.amber-rust-focus}` -- rgba(201,122,84,0.2)): A translucent ring used as the focus outline on inputs and interactive elements. Visible, warm, accessible.

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
- **Eucalyptus** (`{colors.eucalyptus}` -- #6B9E8C): Success states, positive indicators, "approved" badges. Never used as a decorative accent.
- **Eucalyptus Light** (`{colors.eucalyptus-light}` -- rgba(107,158,140,0.1)): Translucent background for success badges and positive-state containers.
- **Error** (`{colors.error}` -- #D05454): Form validation errors, destructive action warnings.
- **Info** (`{colors.info}` -- #5B8DEF): Informational callouts and neutral status indicators. Used sparingly.

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
- **Max content width:** ~1200px centered with horizontal padding.
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

## Do's and Don'ts

### Do
- Reserve `{colors.amber-rust}` for primary CTAs, active states, section labels, and interactive tags. It should appear sparingly -- one filled button per visible viewport.
- Apply `font-feature-settings: 'cv01', 'ss03'` to every Inter element. This is the brand's typographic identity.
- Use weight `510` for all UI chrome (nav links, form labels, field text). Not 500, not 600.
- Use `{typography.display-xl}` (Inter 48px / 700) for hero headlines only. One per page.
- Pair every `{component.section-label}` eyebrow with an Amber Rust color. The eyebrow + section title pattern is the brand's content-section opener.
- Keep the page rhythm uniform: white canvas throughout, with `{colors.graphite-100}` or `{colors.bg-surface}` for subtle background variation.
- Define card boundaries with 1px `{colors.cloud-zinc}` borders. No resting-state shadows.
- Apply `{spacing.section}` (80px) between major bands consistently.

### Don't
- Don't use Amber Rust decoratively. It is never a background fill, never a border color on non-interactive elements, never a text color for body copy.
- Don't use Inter for body paragraphs. Body copy is DM Sans only.
- Don't use DM Sans for headlines, buttons, or labels. Headlines and UI chrome are Inter only.
- Don't add drop shadows to resting-state cards. The system is border-first.
- Don't introduce dark section bands or alternating dark/light page rhythm. The page stays uniformly light.
- Don't use Eucalyptus as a decorative accent. It is for success states and positive indicators only.
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
