# undersight Website Build Plan

**Task:** [undersight website #953](https://adriany.fibery.io/Task_Management/Task/undersight-website-953)
**State:** In Progress | **Created:** 2026-05-07

---

## 1. Situation Assessment

### What exists today

| Asset | Location | Status |
|-------|----------|--------|
| Placeholder site | `/Users/kyle/Documents/underchat/undersight/undersight/index.html` | Minimal — logo + title only |
| Favicon SVG | `.../undersight/favicon.svg` | Pen nib with eye motif, monochrome |
| Skeleton SPA | `~/Downloads/undersight-skeleton.html` | Complete — 7 pages, all navigation, responsive, skeleton loading |
| Dev server | `~/Downloads/undersight-serve.py` | Working — proxies Fibery API on :8088, macOS Keychain auth |
| Blog illustrations | `~/Downloads/undersight-assets/*.png` | 3 monochrome editorial PNGs, 1536x1024, ~2MB each |
| Agent workspace | This repo | CLAUDE.md, empty tokens/, reference/, .planning/ |
| Design system | Not created | No DESIGN.md, no tokens, no preview catalog |

### Fibery CMS content (subscript.fibery.io / Website/Database 1)

| Entity | Content | Files |
|--------|---------|-------|
| Homepage - Hero | 189 chars | 0 |
| Site Config | 422 chars (sign-in URL, privacy, contact email, copyright) | 0 |
| Contact Page | 192 chars | 0 |
| Solutions - underscore | 889 chars | 0 |
| Solutions - Agentic Client RFI | 952 chars | 0 |
| Solutions - AI Underwriting Copilot | 919 chars | 0 |
| Blog - Why AI underwriting is not about replacing underwriters | 654 chars | 1 image |
| Blog - The RFI bottleneck | 535 chars | 1 image |
| Blog - Building an underwriting copilot | 502 chars | 1 image |

### Access verification

| System | Access | Method |
|--------|--------|--------|
| Fibery API (subscript.fibery.io) | Confirmed | macOS Keychain `mcp-credentials` / `fibery-undersight` |
| getdesign CLI | Confirmed | `npx getdesign@latest list` returns 70+ reference sites |
| Site directory | Confirmed | Read/write to `/Users/kyle/Documents/underchat/undersight/undersight/` |
| Impeccable Design skills | Available | Slash commands: /frontend-design, /animate, /polish, etc. |
| 21st.dev Magic MCP | Available | Component generation |
| OpenAI Image Gen MCP | Available | Asset generation |

---

## 2. Inspiration Site Analysis

The Fibery spec names four references. Two (Truffles, Wagoo) use JS redirects that block
static analysis. The two that resolved:

### PaveFi (pavefi.com) — "domain clarity"
- **Takeaway:** Modular section layout, generous whitespace, icon+headline+description cards
- **Relevant patterns:** Feature cards with outcome stats ("45% Increase Approvals"),
  use-case segmentation (consumer vs. business), minimal animation for trust
- **Steal:** Trust signal bar, stat-driven proof points, CTA placement within content sections

### Equabli (equabli.com) — "content/polish"
- **Takeaway:** Premium B2B SaaS positioning, 24-column grid, scroll-triggered animations,
  executive quotes, structured schema markup (WebSite, LocalBusiness JSON-LD)
- **Relevant patterns:** "Book a Discovery Call" CTA (matches our spec exactly),
  alternating left/right content blocks, underline-curve brand flourish
- **Steal:** Problem-then-solution content structure, multi-CTA placement strategy,
  accessibility (ARIA labels), performance (deferred scripts)

### Truffles / Wagoo — blocked by JS redirects
- These need manual browser review. Based on spec notes:
  - Truffles = structural inspiration (page organization)
  - Wagoo = simplicity benchmark (minimal surface area)

---

## 3. Design Methodology

### Reference system selection

From the 70+ available getdesign specs, the strongest candidates for undersight:

| Reference | Why it fits | What to transplant |
|-----------|-------------|-------------------|
| **claude** | Warm terracotta accent ≈ Amber Rust, clean editorial layout | Color warmth strategy, accent restraint, editorial spacing |
| **stripe** | Gold standard B2B SaaS marketing, weight-300 elegance | Section rhythm, type scale, CTA hierarchy, gradient approach |
| **linear.app** | Ultra-minimal, precise, single accent | Density control, navigation precision, dark mode execution |
| **vercel** | Black-and-white backbone with Geist font | Monochrome foundation, code-centric sections, deploy-ready feel |

**Recommendation:** Fetch `stripe` as primary reference (best B2B SaaS marketing structure),
with `claude` as secondary (closest accent color match to Amber Rust).

### Pipeline execution order

```
Step 1: /teach-impeccable          → Persist design guidelines to AI config
Step 2: getdesign add stripe       → Fetch reference DESIGN.md
Step 3: getdesign add claude       → Fetch secondary reference
Step 4: Adapt (Keep/Swap/Invert)   → Create undersight DESIGN.md
Step 5: Generate tokens            → tokens.css + tokens.json (synced)
Step 6: Build preview catalog      → preview.html + preview-dark.html
Step 7: Verify preview             → Visual QA against brand rules
```

### Brand adaptation rules (Keep/Swap/Invert/Drop/Extend)

| Action | What |
|--------|------|
| **Keep** | 9-section Stitch structure, weight scales, spacing system, OpenType identity, single chromatic accent rule, border-radius scale |
| **Swap** | All hex codes → undersight palette (Charcoal #23262C, Amber Rust #C97A54, Eucalyptus #6B9E8C, BG Light #FFFFFF, BG Dark #1A1D21). Display font choice. |
| **Invert** | If reference is dark-native → invert depth model (shadows instead of luminance stepping, since undersight is light-first with dark mode support) |
| **Drop** | Any gradient-heavy patterns that don't match the editorial illustration style |
| **Extend** | Monochrome illustration treatment (matching blog assets), pen-nib logo integration points, Clerk auth patterns, Fibery CMS content slots |

---

## 4. Complete Asset Inventory

### Brand assets (have)

| Asset | Format | Dimensions | Notes |
|-------|--------|------------|-------|
| Logo (pen nib + eye) | SVG inline | 64x64 viewBox | In index.html and favicon.svg |
| Blog illustration 1 | PNG | 1536x1024 | Human hand + robot hand writing — "AI copilot" theme |
| Blog illustration 2 | PNG | 1536x1024 | Documents through funnel — "RFI bottleneck" theme |
| Blog illustration 3 | PNG | 1536x1024 | Character with dashboard — "AI underwriting" theme |

### Brand assets (need to produce)

| Asset | Method | Priority |
|-------|--------|----------|
| Logo variations (light bg, dark bg, small, large) | SVG color variants from existing | P0 |
| OG/social sharing image (1200x630) | `/png-export` from HTML template | P1 |
| Solution page hero visuals (3x) | Product UI mockups or editorial illustrations | P1 |
| Favicon variants (16, 32, 180, 192, 512) | `/png-export` from favicon.svg | P1 |
| Additional blog illustrations | OpenAI Image Gen MCP (match monochrome editorial style) | P2 |
| Background textures or patterns (if design calls for them) | Generate or extract from reference | P2 |

### Typography (need to load)

| Font | Weight | Source | Use |
|------|--------|--------|-----|
| Inter | 400 (Regular) | Google Fonts or self-host | Body text |
| Inter | 510 (UI weight) | Variable font axis | Buttons, nav, labels, form fields |
| Inter | 600 (SemiBold) | Google Fonts or self-host | Subheadings |
| Inter | 700 (Bold) | Google Fonts or self-host | Headings |
| JetBrains Mono | 400 | Google Fonts or self-host | Code blocks, technical content |
| Display font | TBD | Evaluate Space Grotesk or keep Inter | Hero headlines |

**OpenType features required:** `'cv01'` (alternate a), `'ss03'` (alternate g)

### Color system (defined, not yet tokenized)

| Token | Light mode | Dark mode | Usage |
|-------|-----------|-----------|-------|
| Charcoal | #23262C | #E8E9EB (inverted) | Primary text, headings |
| Amber Rust | #C97A54 | #C97A54 (same) | CTAs, active states, interactive only |
| Eucalyptus | #6B9E8C | #6B9E8C or lighter | Secondary accent, success states, tags |
| BG | #FFFFFF | #1A1D21 | Page background |
| Surface | #FAFAFA | #23262C | Card backgrounds, elevated surfaces |
| Border | #E5E5E5 | #333 | Dividers, card borders |
| Muted text | rgba(35,38,44,0.5) | rgba(255,255,255,0.5) | Secondary text, captions |

---

## 5. Prerequisite Skill Development

Skills to run before building, in dependency order:

### Phase 0: Foundation (before any code)

| # | Skill | Purpose | Depends on |
|---|-------|---------|------------|
| 0.1 | `/teach-impeccable` | Persist design guidelines to AI config for all future commands | Nothing |
| 0.2 | `getdesign add stripe` | Fetch primary reference DESIGN.md | Nothing |
| 0.3 | `getdesign add claude` | Fetch secondary reference DESIGN.md | Nothing |
| 0.4 | Design adaptation | Create `DESIGN.md` from references | 0.2, 0.3 |
| 0.5 | Token generation | Produce `tokens/tokens.css` + `tokens/tokens.json` | 0.4 |
| 0.6 | Preview catalog | Build `preview.html` + `preview-dark.html` | 0.5 |
| 0.7 | `/audit` on preview | Verify a11y, performance, token consistency | 0.6 |

### Phase 1: Skeleton → Branded

| # | Skill | Purpose | Depends on |
|---|-------|---------|------------|
| 1.1 | `/frontend-design` | Transform skeleton with design system tokens | Phase 0 |
| 1.2 | `/typeset` | Dial in Inter type ramp, weights, OpenType features | 1.1 |
| 1.3 | `/colorize` | Apply Amber Rust + Eucalyptus accent strategy | 1.2 |
| 1.4 | `/arrange` | Fix layout rhythm, spacing, visual hierarchy | 1.3 |
| 1.5 | `/adapt` | Responsive breakpoints, fluid layouts, touch targets | 1.4 |

### Phase 2: Polish & Delight

| # | Skill | Purpose | Depends on |
|---|-------|---------|------------|
| 2.1 | `/animate` | Scroll-triggered reveals, hover states, page transitions | Phase 1 |
| 2.2 | `/delight` | Micro-interactions, personality touches | 2.1 |
| 2.3 | `/harden` | Error handling, edge cases, loading states | 2.2 |
| 2.4 | `/polish` | Final alignment, spacing, consistency pass | 2.3 |
| 2.5 | `/critique` | UX scoring with persona-based testing | 2.4 |
| 2.6 | `/audit` | Final technical quality: a11y, perf, responsive | 2.5 |

### Phase 3: Production

| # | Skill | Purpose | Depends on |
|---|-------|---------|------------|
| 3.1 | `/optimize` | Performance: image compression, lazy loading, critical CSS | Phase 2 |
| 3.2 | `/normalize` | Final design system alignment check | 3.1 |
| 3.3 | `verify-app` agent | Run automated checks from .claude/agents/verify-app.md | 3.2 |

---

## 6. Implementation Plan

### Phase 0: Design System (do first, no code)

**Goal:** Produce DESIGN.md + tokens that every subsequent phase consumes.

1. Run `/teach-impeccable` to capture:
   - Brand: undersight, insurtech/AI underwriting
   - Colors: Charcoal, Amber Rust, Eucalyptus
   - Font: Inter with OpenType cv01, ss03
   - Tone: Professional but warm, editorial, trustworthy
   - Competitors: Equabli, PaveFi
   - Audience: Insurance underwriters, operations leaders

2. Fetch reference specs:
   ```bash
   cd /tmp/getdesign-probe && npx getdesign@latest add stripe
   cp DESIGN.md "projects/undersight-website/reference/stripe.DESIGN.md"
   npx getdesign@latest add claude
   cp DESIGN.md "projects/undersight-website/reference/claude.DESIGN.md"
   ```

3. Adapt references → `DESIGN.md` using Keep/Swap/Invert/Drop/Extend framework

4. Generate synced token files (CSS + JSON)

5. Build preview catalog, open in browser, verify:
   - No raw hex fallbacks (everything through variables)
   - Type ramp is uniform and readable
   - Amber Rust only on interactive elements
   - Shadows visible in both light and dark
   - Inter OpenType features rendering (check lowercase a and g)

**Exit criteria:** DESIGN.md, tokens.css, tokens.json, preview.html all exist and pass
`verify-app` agent checks.

---

### Phase 1: Skeleton Integration

**Goal:** Transform monochrome skeleton into branded undersight site.

**Input files:**
- `~/Downloads/undersight-skeleton.html` → becomes the new `index.html`
- `~/Downloads/undersight-serve.py` → dev server (stays in Downloads or moves to project)
- `tokens/tokens.css` → linked from index.html

**Work:**

1. **Copy skeleton to site directory:**
   ```
   ~/Downloads/undersight-skeleton.html → .../undersight/undersight/index.html
   ```

2. **Strip hardcoded colors from skeleton CSS:**
   Replace all `var(--black)`, `var(--dark)`, etc. with design system tokens.
   The skeleton uses its own variable names — map them:
   ```
   --black (#111)  → var(--color-text-primary)
   --dark (#333)   → var(--color-text-secondary)
   --mid (#666)    → var(--color-text-tertiary)
   --light (#aaa)  → var(--color-text-muted)
   --pale (#e5e5e5)→ var(--color-border)
   --bg (#fafafa)  → var(--color-bg-surface)
   --white (#fff)  → var(--color-bg)
   ```

3. **Integrate logo SVG** into nav (replace text `u<span>ndersight</span>` with
   actual pen-nib SVG from favicon.svg + wordmark)

4. **Add dark mode:**
   Skeleton has no dark mode. Add `@media (prefers-color-scheme: dark)` block
   that swaps all token values. (Tokens are designed for this — just override
   the custom properties.)

5. **Wire Inter font** with OpenType features:
   ```css
   @import url('...inter...');
   body { font-family: 'Inter', ...; font-feature-settings: 'cv01', 'ss03'; }
   ```

6. **Apply UI weight 510** to buttons, nav links, labels, form fields

7. **Run /typeset, /colorize, /arrange, /adapt** in sequence

**Exit criteria:** Site renders at localhost:8088 with correct brand colors, dark mode
works, Inter with OpenType features, responsive down to 320px.

---

### Phase 2: Content & Assets

**Goal:** Wire Fibery content, integrate images, build solution pages.

1. **Blog images:**
   - Copy 3 PNGs from `~/Downloads/undersight-assets/` to site `/images/blog/`
   - Optimize: compress to WebP with PNG fallback
   - Wire into blog card thumbnails (currently placeholder `[ Hero image ]`)

2. **Solution page visuals:**
   - Current skeleton shows `[ product UI placeholder ]` boxes
   - Options: (a) create product UI mockups via screenshot/design tools,
     (b) generate editorial illustrations matching blog style via OpenAI Image Gen,
     (c) use abstract geometric patterns from design system
   - Recommendation: Option (b) for consistency with existing monochrome editorial style

3. **Favicon suite:**
   - Generate from existing SVG: 16x16, 32x32, apple-touch-icon (180x180),
     android-chrome (192x192, 512x512)
   - Add `manifest.json` for PWA metadata

4. **OG/social image:**
   - 1200x630 PNG with logo + tagline on brand background
   - Export via `/png-export`

5. **SEO meta tags:**
   - Title, description, OG tags, Twitter card, canonical URL
   - Structured data (Organization, WebSite JSON-LD — following Equabli's pattern)

**Exit criteria:** All placeholder visuals replaced, images optimized, meta tags complete.

---

### Phase 3: Interactivity & Polish

**Goal:** Elevate from functional to delightful.

1. **Scroll animations** (following Equabli's approach):
   - Fade-in-up on section entry
   - Card stagger on grid appearance
   - Counter animation on any stat elements
   - Keep it subtle — `animation-duration: 1.5s, ease`

2. **Navigation polish:**
   - Smooth dropdown transitions
   - Active state indicator (Amber Rust underline)
   - Scroll-aware header (subtle shadow on scroll)

3. **Form interaction:**
   - Input focus states with Amber Rust border
   - Submit button loading state
   - Success/error feedback
   - Consider Calendly embed for "Book a Discovery Call"

4. **Blog reading experience:**
   - Estimated read time
   - Proper markdown rendering with styled code blocks (JetBrains Mono)
   - Share links

5. **Run skill sequence:** `/animate` → `/delight` → `/harden` → `/polish`

6. **Run `/critique`** for UX scoring

**Exit criteria:** Lighthouse scores > 90 across all categories, `/audit` passes,
`/critique` scores > 7/10 on all dimensions.

---

### Phase 4: Production Readiness

**Goal:** Ship-ready site at undersight.ai.

1. **Performance:**
   - Critical CSS inlined
   - Images lazy-loaded below fold
   - Font `preload` for Inter
   - Run `/optimize`

2. **Final checks:**
   - Run `/normalize` for design system drift
   - Run `verify-app` agent
   - Cross-browser test (Safari, Chrome, Firefox)
   - Test at 320px, 768px, 1024px, 1440px, 2560px

3. **Deploy artifacts:**
   - Final `index.html` (or split if needed)
   - `/images/` directory with optimized assets
   - `favicon.svg` + favicon suite
   - `manifest.json`
   - `robots.txt`
   - `sitemap.xml` (if multi-page)
   - CNAME / DNS for undersight.ai

4. **Content handoff:**
   - Document how to update content in Fibery
   - Document serve.py → production server migration path
   - Consider static export vs. keeping Fibery live-fetch

**Exit criteria:** Site live at undersight.ai, all verify-app checks pass, content
editable via Fibery CMS.

---

## 7. Open Questions

| # | Question | Blocks |
|---|----------|--------|
| 1 | **Display font decision** — Keep Inter for everything, or add Space Grotesk for hero headlines? | Phase 0 (type ramp) |
| 2 | **Solution page visuals** — Product UI mockups vs. editorial illustrations vs. abstract? | Phase 2 |
| 3 | **Calendly integration** — Embed or link for "Book a Discovery Call"? | Phase 3 |
| 4 | **Deploy target** — Static hosting (Vercel, Cloudflare Pages) or keep Python server? | Phase 4 |
| 5 | **Clerk integration** — Real auth for docs, or defer? | Phase 3 |
| 6 | **Truffles/Wagoo** — Need manual browser screenshots for reference analysis | Phase 0 |

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Blog images are ~2MB each, will slow page load | High | WebP conversion + lazy loading in Phase 2 |
| Fibery API dependency means site is not static | Medium | Consider static export with rebuild on content change |
| No display font decision may delay type ramp | Low | Inter works fine as mono-font; display font is additive |
| Skeleton has no dark mode CSS | Medium | Token system designed for easy dark mode — just override props |
| serve.py runs on :8088 only — no HTTPS, no production path | Medium | Plan production hosting in Phase 4 |

---

## 9. Recommended Start Sequence

```
1.  /teach-impeccable                    ← establish persistent design context
2.  npx getdesign@latest add stripe      ← fetch primary reference
3.  npx getdesign@latest add claude      ← fetch secondary reference
4.  Adapt → DESIGN.md                    ← create undersight design system
5.  Generate tokens.css + tokens.json    ← tokenize everything
6.  Build preview.html                   ← visual QA catalog
7.  /audit on preview                    ← verify before building
8.  Copy skeleton → index.html           ← start implementation
9.  /frontend-design                     ← brand the skeleton
10. /typeset → /colorize → /arrange      ← refine typography, color, layout
11. /adapt                               ← responsive
12. Wire content + assets                ← Fibery + images
13. /animate → /delight → /harden        ← interactivity
14. /polish → /critique → /audit         ← final quality
15. /optimize → deploy                   ← ship
```

**Ready to begin with step 1: `/teach-impeccable`**
