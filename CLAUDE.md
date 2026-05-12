# undersight Website

## Purpose

Marketing and landing page for undersight.ai. Design-system-first: every visual
decision flows from `DESIGN.md` and `tokens/tokens.css`. No hardcoded hex codes
in components.

---

## Repo & File Map

| What | Path |
|------|------|
| Website repo | `/Users/kyle/Documents/underchat/undersight/` |
| Landing page | `/Users/kyle/Documents/underchat/undersight/undersight/index.html` |
| Favicon SVG | `/Users/kyle/Documents/underchat/undersight/undersight/favicon.svg` |
| Agent workspace | `projects/undersight-website/` (this directory) |
| Design spec | `projects/undersight-website/DESIGN.md` (create via workflow below) |
| Token CSS | `projects/undersight-website/tokens/tokens.css` |
| Token JSON | `projects/undersight-website/tokens/tokens.json` |
| Preview catalog | `projects/undersight-website/preview.html` |
| Reference spec | `projects/undersight-website/reference/<source>.DESIGN.md` |

---

## Tech Stack

- HTML/CSS (static site, no build step)
- Inter font with OpenType features (`cv01`, `ss03`)
- Dark mode via `prefers-color-scheme`
- Hosted at undersight.ai

---

## Brand Tokens

| Token | Value |
|-------|-------|
| Charcoal | `#23262C` |
| Amber Rust | `#C97A54` |
| Eucalyptus | `#6B9E8C` |
| BG Light | `#FFFFFF` |
| BG Dark | `#1A1D21` |
| Font (sans) | Inter, -apple-system, system-ui |
| Font (display) | TBD (consider Space Grotesk or keep Inter) |
| Font (mono) | JetBrains Mono |

---

## Design System Workflow

This project uses the **design-md pipeline** from the agent workspace skills.
Follow this exact sequence when creating or updating the design system:

### Step 1: Fetch a Reference Spec

```bash
# Fetch a reference design system (e.g. Linear, Vercel, Stripe)
mkdir -p /tmp/getdesign-probe && cd /tmp/getdesign-probe
npx getdesign@latest add <site>
cp DESIGN.md "projects/undersight-website/reference/<site>.DESIGN.md"
```

Skill reference: `skills/design-md-fetch.md`

### Step 2: Adapt to undersight Brand

Apply the Keep/Swap/Invert/Drop/Extend framework to create
`projects/undersight-website/DESIGN.md` from the reference.

- **Keep:** 9-section Stitch structure, weight scales, spacing system, OpenType
  identity, single chromatic accent rule, border-radius scale
- **Swap:** All color hexes to undersight palette (Charcoal, Amber Rust,
  Eucalyptus), display font choice
- **Invert:** If reference is dark-native and undersight is light-first,
  invert the depth model (shadows instead of luminance stepping)
- **Extend:** Add undersight-specific patterns as needed

Skill reference: `skills/design-md-adapt.md`

### Step 3: Generate Token Files

Produce in sync:
- `tokens/tokens.css` - CSS custom properties
- `tokens/tokens.json` - Design Tokens Community Group format
- `DESIGN.md` - must match both token files exactly

### Step 4: Generate Preview Catalog

Build `preview.html` + `preview-dark.html` with all 13 canonical sections.

Skill reference: `skills/design-md-preview.md`

### Step 5: Verify

```bash
open projects/undersight-website/preview.html
```

Check for: raw hex fallbacks, uniform type ramp, brand color used decoratively,
invisible shadows.

---

## Design Skills Reference

These skills are available in the agent workspace and should be used for all
design work on this project:

### Design System Pipeline

| Skill | File | Purpose |
|-------|------|---------|
| Fetch | `skills/design-md-fetch.md` | Import DESIGN.md for any catalogued site via `npx getdesign@latest` |
| Adapt | `skills/design-md-adapt.md` | Transplant framework discipline onto undersight brand |
| Preview | `skills/design-md-preview.md` | Generate visual QA catalogs from DESIGN.md |

### Frontend Design Slash Commands (Impeccable Design Suite)

These are available as slash commands in any Claude Code session:

| Command | When to Use |
|---------|-------------|
| `/frontend-design` | Build new pages, components, or sections from scratch |
| `/teach-impeccable` | One-time setup: gather design context, save to AI config |
| `/animate` | Add purposeful animations, micro-interactions, motion |
| `/polish` | Final quality pass: alignment, spacing, consistency |
| `/critique` | UX evaluation with scoring and persona-based testing |
| `/audit` | Technical quality: a11y, performance, responsive, anti-patterns |
| `/delight` | Add joy, personality, unexpected touches |
| `/distill` | Strip to essence, remove unnecessary complexity |
| `/bolder` | Amplify safe designs, increase visual impact |
| `/quieter` | Tone down aggressive designs, reduce intensity |
| `/colorize` | Add strategic color to monochromatic designs |
| `/typeset` | Fix typography: hierarchy, sizing, weight, readability |
| `/arrange` | Fix layout, spacing, visual rhythm |
| `/normalize` | Realign to design system standards |
| `/extract` | Extract reusable components and tokens |
| `/harden` | Error handling, i18n, edge cases, production-readiness |
| `/adapt` | Responsive: breakpoints, fluid layouts, touch targets |
| `/onboard` | Onboarding flows, empty states, first-run experiences |
| `/clarify` | Improve UX copy, error messages, labels |
| `/optimize` | Performance: loading, rendering, bundle size |
| `/overdrive` | Technically ambitious: shaders, spring physics, 60fps |

### Visual Assets

| Skill | File | Purpose |
|-------|------|---------|
| Visual Assets | `skills/visual-assets.md` | Image gen, PNG export, SVG vectorization |
| PNG Export | `skills/png-export/png-export.md` | Retina PNG from HTML/SVG |
| Vectorize | `skills/vectorize-line-art.md` | PNG-to-SVG via potrace outline tracing |

### Component Library

| Tool | Type | Purpose |
|------|------|---------|
| 21st.dev Magic | MCP Server | Production-ready shadcn/ui component generation |
| OpenAI Image Gen | MCP Server | AI image generation for brand assets |

---

## Working Rules

1. **Never hardcode colors.** Import `tokens/tokens.css` and use CSS variables.
2. **Inter text must have OpenType features.** Always apply
   `font-feature-settings: 'cv01', 'ss03'` via `tokens.css` or explicitly.
3. **UI weight is `510`**, not 500. Buttons, nav, labels, form fields.
4. **Amber Rust is reserved** for CTAs, active states, and interactive elements.
   Never decorative.
5. **Token synchrony.** `DESIGN.md`, `tokens/tokens.css`, and `tokens/tokens.json`
   must stay in sync. If you add a value to one, add it to all three.
6. **Preview before shipping.** New component patterns go to `preview.html` first.
7. **"undersight" is always lowercase.** Never "Undersight" or "UNDERSIGHT".

---

## Design Heritage

Reference: `projects/agency-website/` has a fully worked Linear-to-grunion
transplant as a model for how this pipeline works end-to-end.

---

## Quick Reference

| Task | Command |
|------|---------|
| Local preview | `open /Users/kyle/Documents/underchat/undersight/undersight/index.html` |
| Design preview | `open projects/undersight-website/preview.html` |
| Fetch design ref | `npx getdesign@latest add <site>` |
| List available sites | `gh api repos/VoltAgent/awesome-design-md/contents/design-md --jq '.[].name'` |

---

## Fibery Task

[undersight website - design & build #812 - Startup](https://adriany.fibery.io/Task_Management/Task/812)

---

## Patterns

- Logo: pen nib with eye motif (insight through writing)
- Dark mode support via `prefers-color-scheme`
- Design-system-first: DESIGN.md is source of truth, tokens are derived
- Brand colors match `skills/png-export/png-export.md` defaults

---

## Known Issues

- Design system not yet created (DESIGN.md, tokens/, preview.html pending)
- Site is a placeholder landing page only
- Font stack validated (Inter) but display font TBD

---

## Learnings

See `tasks/lessons.md` for session-by-session log.
