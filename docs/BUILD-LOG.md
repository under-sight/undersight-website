# undersight.ai Website Build Log

Historical record of the undersight.ai website build, from planning through production.

**Fibery Task**: [undersight website - design & build #812](https://adriany.fibery.io/Task_Management/Task/812)
**Later renamed**: [undersight website #953](https://adriany.fibery.io/Task_Management/Task/undersight-website-953)

---

## Timeline

### Phase 0: Planning & Design System (May 7-8, 2026)

**Goal**: Establish design system, build plan, and tooling before writing any site code.

| Step | What | Status |
|------|------|--------|
| Situation assessment | Catalogued all existing assets, verified Fibery access, analyzed inspiration sites | Done |
| `/teach-impeccable` | Saved design context to `.impeccable.md` for persistent AI design guidelines | Done |
| Reference fetch | Fetched Stripe and Claude design systems via `npx getdesign@latest` | Done |
| Design adaptation | Applied Keep/Swap/Invert/Drop/Extend framework to create `DESIGN.md` | Done |
| Token generation | Produced `tokens/tokens.css` and `tokens/tokens.json` in sync with DESIGN.md | Done |
| Build plan | Created `.planning/BUILD-PLAN.md` with 4-phase implementation plan | Done |
| Inspiration analysis | Analyzed PaveFi and Equabli for B2B SaaS marketing patterns | Done |

**Key decisions**:
- Stripe selected as primary design reference (best B2B SaaS marketing structure)
- Claude selected as secondary reference (closest accent color match to Amber Rust)
- DM Sans chosen as body font (paired with Inter for headings/UI)
- Light-first design with dark mode via CSS custom property swap
- Monochrome editorial illustration style for all visuals

### Phase 1: Skeleton Integration & Branding (May 8-10, 2026)

**Goal**: Transform the monochrome skeleton SPA into a branded undersight site.

| Step | What | Status |
|------|------|--------|
| Skeleton copy | Moved `undersight-skeleton.html` to `index.html` at site directory | Done |
| Token integration | Linked `tokens.css`, replaced skeleton's `--black`/`--dark`/etc. with design tokens | Done |
| Logo integration | Integrated pen-nib SVG logo into nav; later replaced with horizontal underline SVG | Done |
| Dark mode | Added `@media (prefers-color-scheme: dark)` semantic alias swap in tokens.css | Done |
| Font loading | Added Google Fonts for Inter (400/500/600/700) + DM Sans (400/500/700) | Done |
| OpenType features | Applied `font-feature-settings: 'cv01', 'ss03'` to all Inter elements | Done |
| UI weight 510 | Applied fractional weight to buttons, nav, labels, form fields | Done |
| Inline CSS extraction | Extracted 612 lines of inline CSS to `main.css` (Task #28) | Done |
| `/typeset` | Refined type hierarchy: Inter headings, DM Sans body, SF Mono data | Done |
| `/colorize` | Applied Amber Rust accent strategy (CTAs only, never decorative) | Done |
| `/arrange` | Fixed layout rhythm, spacing, visual hierarchy | Done |
| `/adapt` | Added responsive breakpoint at 768px, mobile menu, touch targets | Done |

**Key decisions**:
- Decided to keep Inter as both heading and UI font (no separate display font)
- Used DM Sans for body text instead of Inter to create typographic contrast
- Established the bridge-alias pattern in `main.css` (`--black`, `--dark`, `--mid`, etc.) mapping to semantic tokens
- Chose a single 768px breakpoint (tablet and phone share the same mobile layout)

### Phase 2: Content, Assets & CMS Integration (May 9-11, 2026)

**Goal**: Wire Fibery CMS content, generate visual assets, build the content pipeline.

| Step | What | Status |
|------|------|--------|
| Dev server | Built `undersight-serve.py`: Fibery proxy on :8088, Keychain auth, opaque file IDs | Done |
| Content pipeline | Built `parseMeta()` + `mdToHtml()` + `renderContent()` for Fibery markdown | Done |
| Solution pages | Generated 3 solution detail pages with narrative scroll (3 steps each) | Done |
| Blog rendering | Built blog grid with cards, post view with markdown rendering, case study | Done |
| Security: file proxy | Implemented opaque SHA-256 IDs instead of raw Fibery secrets (Task #21) | Done |
| Blog images | Generated 4 monochrome editorial illustrations via Higgsfield | Done |
| Solution images | Generated 9 solution step images (3 per product) via Higgsfield | Done |
| Image optimization | Converted all images to WebP + retained PNG originals (Task #30) | Done |
| OG image | Generated 1200x630 social sharing image (Task #30) | Done |
| Favicon suite | Generated PNG favicons from SVG: 16, 32, 180, 192, 512 | Done |
| Logo suite | Created horizontal logo variants with underline (primary + reversed) | Done |
| Nav logo update | Replaced inline SVG with horizontal underline logo SVG (Task #33) | Done |
| Image regeneration | Regenerated cop3 and rfi3 images that had fake text artifacts (Task #26) | Done |

**Key decisions**:
- Built a custom Python dev server rather than using an existing static server, to handle Fibery API proxying
- Chose opaque SHA-256 hashing for file IDs rather than sequential numbers, for security
- Generated images via Higgsfield rather than OpenAI Image Gen MCP, for style consistency
- Kept both PNG and WebP variants (HTML references PNG; WebP available for future optimization)

### Phase 3: Polish, Audit & Hardening (May 11-12, 2026)

**Goal**: Quality pass before production deployment.

| Step | What | Status |
|------|------|--------|
| Scroll animations | Added IntersectionObserver-based reveal animations with stagger | Done |
| Page transitions | Added 150ms fade-out/fade-in between page navigations | Done |
| Nav scroll shadow | Added subtle header shadow on scroll (`.scrolled` class) | Done |
| `/polish` pass | Final alignment, spacing, consistency review (Task #29) | Done |
| `/critique` pass | UX scoring with 3 personas: Fund Manager, Ops Leader, Developer (Task #24) | Done |
| `/audit` pass | Technical quality: a11y, performance, responsive, anti-patterns (Task #27) | Done |
| Adversarial review | Comprehensive security and content review (Task #24) | Done |
| Blog header fix | Fixed "Bl o g" vertical text stacking on blog page header (Task #34) | Done |
| Favicon fix | Fixed favicon not loading with cache-busting `?v=2` parameter (Task #31) | Done |
| Loading animation | Added pen-nib writing animation when content fails to load (Task #32) | Done |
| Fibery API diagnosis | Diagnosed and resolved content fetching issues (Task #35) | Done |
| Reduced motion | Added `prefers-reduced-motion` support for all animations | Done |
| Focus states | Added visible `:focus-visible` outlines in Amber Rust | Done |

### Phase 4: Production Build & Deployment (May 11-12, 2026)

**Goal**: Ship a production-ready static site.

| Step | What | Status |
|------|------|--------|
| Build script | Created `build.py` for static HTML generation (Task #22) | Done |
| Content baking | Built function extraction + JSON baking into loadContent() | Done |
| File download | Built Fibery file attachment download + URL rewriting | Done |
| Security verification | Built `--verify` scanner for secrets, Fibery URLs, UUIDs | Done |
| SEO: meta tags | Added title, description, canonical, OG, Twitter Card tags | Done |
| SEO: JSON-LD | Added Organization + WebSite structured data | Done |
| SEO: robots.txt | Created with explicit AI agent allowlists | Done |
| SEO: sitemap.xml | Created with all SPA page URLs | Done |
| SEO: llms.txt | Created AI-readable site summary | Done |
| PWA: manifest.json | Created with icons, theme color, app metadata | Done |
| Deploy prep | CNAME, DNS, final file inventory (Task #23) | Done |
| Handoff docs | Created README.md with quick start, build, deploy instructions (Task #25) | Done |

---

## Key Decisions

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Light-first, not dark-first** | Target audience (fund managers, ops leaders) works in professional office environments. Light mode is the natural default. Dark mode supported but not primary. |
| **Stripe as primary design reference** | Stripe's marketing site is the gold standard for B2B SaaS. Its section rhythm, type hierarchy, and CTA placement patterns translated well to undersight's content structure. |
| **Single chromatic accent (Amber Rust)** | Borrowed from Stripe's discipline of one accent color. Amber Rust's warm terracotta tone conveys trust without being corporate blue. Scarcity makes it more impactful. |
| **Dual-font system (Inter + DM Sans)** | Inter for structural elements (headings, UI, nav) and DM Sans for narrative elements (body, descriptions). The split creates typographic contrast without introducing a third font. |
| **No alternating dark/light section bands** | Tested during development and rejected (noted in `.impeccable.md` as anti-reference). Mixed dark/light/amber bands looked inconsistent. Uniform white canvas with subtle accents is cleaner. |
| **Border-first, shadow-rare depth model** | Cards use 1px borders instead of drop shadows at rest. Shadows only appear on floating elements (dropdowns). Produces a flat, architectural quality that reinforces precision. |
| **Monochrome editorial illustrations** | Matches the brand personality (precise, analytical). Avoids the "stock photo" problem. All illustrations share the same visual language. |
| **Weight 510 for UI elements** | Fractional weight between regular (400) and medium (500). Creates a subtle "present but not heavy" quality for interface chrome. A quiet signal of typographic intention. |

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **SPA with hash routing** | Fibery content maps to a flat entity structure. Hash routing was the simplest implementation without a build framework. Trade-off: poor SEO for individual pages. |
| **Python dev server** | Needed Fibery API proxying with Keychain-based auth. Python stdlib has everything needed (http.server, urllib, json, subprocess). No dependencies required. |
| **Static build with baked content** | Production site has zero API dependencies. Content is fetched once at build time and embedded in the HTML. The site works even if Fibery goes down. |
| **Opaque file IDs** | Fibery file secrets are UUIDs that grant read access. Exposing them in the client would be a security risk. SHA-256 hashing to 12-char IDs provides an opaque identifier that cannot be reversed. |
| **No JS framework** | The site is small enough (~8 pages, no complex state) that vanilla JS is sufficient. A framework would add build complexity without meaningful benefit. |
| **Inline JS in index.html** | Since there is no build step, keeping JS inline avoids cache-coordination issues between HTML and JS files. Trade-off: the HTML file is larger than ideal. |
| **All AI agents allowed in robots.txt** | undersight wants AI assistants to be able to describe the product. The `llms.txt` file provides structured information specifically for LLM consumption. |

---

## Tools Used

### Design & Development

| Tool | Purpose | Notes |
|------|---------|-------|
| **getdesign CLI** (`npx getdesign@latest`) | Fetched reference DESIGN.md specs for Stripe and Claude | Used to bootstrap the design system |
| **Impeccable Design Suite** | AI-powered design skills: `/teach-impeccable`, `/frontend-design`, `/typeset`, `/colorize`, `/arrange`, `/adapt`, `/animate`, `/polish`, `/critique`, `/audit` | Used throughout for design iteration |
| **Fibery CMS** | Content management for all site text and file attachments | Accessed via REST API from dev server and build script |
| **Fibery MCP** | Claude Code integration with Fibery for content queries | Used during planning and content auditing |

### Image Generation

| Tool | Purpose | Notes |
|------|---------|-------|
| **Higgsfield** | AI image generation for solution illustrations and blog graphics | Monochrome editorial style, ~154 credits used |
| **sips** (macOS) | Image resizing and WebP conversion | Built-in macOS tool, no dependencies |

### Build & Infrastructure

| Tool | Purpose | Notes |
|------|---------|-------|
| **Python 3** (stdlib only) | Dev server (`undersight-serve.py`) and build script (`build.py`) | Zero external dependencies |
| **macOS Keychain** | Secure storage for Fibery API token | Accessed via `security` CLI |

---

## Issues Encountered and Resolutions

### Critical Issues Found in Adversarial Review

| Issue ID | Problem | Resolution |
|----------|---------|------------|
| P0-1 | Missing `--color-text-muted` token caused hierarchy collapse | Added to `tokens.css` semantic aliases, mapped to `--color-cloud-zinc` (light) and `rgba(255,255,255,0.45)` (dark) |
| P0-2 | Sign-in links pointed to `staging.app.underchat.ai` | Known issue; production app URL to be configured when app is deployed |
| P0-3 | Hardcoded `#ddd`, `#fff`, undefined `--pw`/`--cz` vars | Replaced with token variable references during CSS extraction (Task #28) |
| P0-4 | Blog content referenced "specialty insurance" instead of alternative finance | Content issue in Fibery; flagged for content team to fix |
| P0-5 | "underchat" brand name in customer-facing blog content | Content issue in Fibery; flagged for content team to fix |

### UX Issues Found in Critique/Audit

| Issue | Score | Resolution |
|-------|-------|------------|
| Developer persona scored 6.0/10 (docs are a dead end) | P1 | Known limitation; real docs gated behind Clerk auth are future work |
| Trust signals scored 5/10 (no logos, no team, no testimonials) | P1 | Acknowledged; adding social proof is a future phase |
| Stats unattributed (71%, 22%, 650bps) | P1 | Added "Based on measured outcomes across active customer deployments" disclaimer |
| Keyboard accessibility gaps (onclick on divs/spans) | P1 | Partially addressed; remaining items tracked as future work |
| Theme toggle broken for light-mode users | P1 | Known limitation documented; full theme toggle is future work |

### Technical Issues

| Issue | Resolution |
|-------|------------|
| Blog page header "Bl o g" vertical text stacking (Task #34) | Fixed CSS causing letter-spacing/display issue on blog page heading |
| Favicon not loading (Task #31) | Added cache-busting `?v=2` parameter to favicon link tags |
| 612 lines of inline CSS creating maintenance drift (Task #28) | Extracted to `main.css` as the single source of truth for component styles |
| Fibery API not serving content (Task #35) | Diagnosed root cause (workspace/database path issue) and resolved |
| Blog images at 2MB+ causing slow page loads | Converted to WebP format; PNG retained as fallback (Task #30) |
| cop3 and rfi3 images had fake/garbled text (Task #26) | Regenerated with corrected Higgsfield prompts |

---

## Adversarial Review Summary

A comprehensive adversarial review was conducted on May 12, 2026, examining the live site and all source files.

### Finding Counts

| Severity | Count | Key Themes |
|----------|-------|------------|
| P0 (Critical) | 5 | Missing CSS token, staging URLs, hardcoded colors, wrong industry in blog content, internal brand name leak |
| P1 (Important) | 9 | Unsourced stats, orphaned contact page, email mismatch, inline CSS drift, broken theme toggle, keyboard a11y |
| P2 (Nice to fix) | 15 | Missing SEO tags (since added), rgba hardcodes, jargon ("CaC"), missing error states, reduced motion gaps |

### Fixes Applied

- P0-1 (missing token): Fixed in `tokens.css`
- P0-3 (hardcoded colors): Mostly fixed during CSS extraction
- P1-4 (inline CSS): Extracted to `main.css`
- P2-1 (meta description): Added
- P2-2 (OG/Twitter tags): Added
- P2-3 (hardcoded copyright year): Replaced with `new Date().getFullYear()`
- P2-5 (blog page header): Added heading
- P2-10 (prefers-reduced-motion): Extended to cover all animations
- P2-11 (SVG logo accessibility): Added `role="img"`, `aria-label`, `<title>`
- P2-15 ("CaC" jargon): Replaced with "Acquisition Cost"

### Fixes Remaining

- P0-2 (staging URL): Requires production app deployment
- P0-4, P0-5 (blog content industry/brand): Requires Fibery content edits
- P1-1 (stat attribution): Disclaimer added, but specific methodology/timeframe still needed
- P1-2 (orphaned contact page): Contact page exists but no nav link
- P1-5 (theme toggle): Needs full dark/light toggle implementation
- P1-6 (keyboard accessibility): Some onclick-on-div elements remain
- P1-7 (solution page back navigation): Back links added but breadcrumbs not implemented

---

## Critique/Audit Scorecard

### Persona Scores

| Persona | Score | Notes |
|---------|-------|-------|
| Fund Manager (Jeremy) | 7.0/10 | Strong headline, easy CTA discovery, stats need attribution |
| Operations Leader | 6.7/10 | Clear product comparison, thin on specs, case study is marketplace-focused |
| Developer | 6.0/10 | Docs page is a dead end; whitepaper content is genuinely strong |

### Dimension Scores

| Dimension | Score |
|-----------|-------|
| First impression / visual quality | 8/10 |
| Clarity of value proposition | 7/10 |
| Information architecture | 6/10 |
| Content quality and credibility | 7/10 |
| Call-to-action effectiveness | 8/10 |
| Visual consistency | 7/10 |
| Typography and readability | 8/10 |
| Responsive design | 7/10 |
| Trust signals | 5/10 |
| Overall "would I engage" factor | 7/10 |

**Overall readiness**: 6.8/10 -- needs P0 and P1 fixes before prospect-facing use.

---

## Current Completion Status

### Completed

- Design system (DESIGN.md, tokens.css, tokens.json)
- Full SPA with 8 page types (home, 3 solutions, docs, blog, post, contact)
- Fibery CMS integration (dev server + static build)
- All visual assets (9 solution images, 4 blog illustrations, logo suite, favicons, OG image)
- SEO package (meta tags, JSON-LD, robots.txt, sitemap.xml, llms.txt)
- Static build pipeline (build.py with security verification)
- Dark mode support
- Responsive layout (768px breakpoint)
- Scroll reveal animations with reduced-motion support
- Handoff documentation (README.md)
- Adversarial review + critique/audit

### Remaining Work

| Item | Priority | Notes |
|------|----------|-------|
| Fix staging URL in Sign In links | P0 | Blocked on production app deployment |
| Fix blog content (industry/brand references) | P0 | Requires Fibery content edits |
| Populate docs section with real API documentation | P1 | Blocked on API documentation readiness |
| Add trust signals (customer logos, team, testimonials) | P1 | Requires customer permission + team photos |
| Improve stat attribution with methodology | P1 | Requires data team input |
| Full keyboard accessibility pass | P1 | onclick-on-div elements need button/link conversion |
| Implement proper dark/light theme toggle | P2 | Current toggle only works for dark-mode OS users |
| Add intermediate tablet breakpoint (768-1024px) | P2 | Currently shares mobile layout |
| Consider migration from hash routing to proper URLs | P2 | Would significantly improve SEO |
| Remove unused hero.png (991KB) | P2 | Saves bandwidth in dist/ |
| Remove legacy palette.css and fonts.css | P2 | Prevent maintenance confusion |
| Add Chat Advance logo and Macy badge to case study | P3 | Task #36, pending |
| Compress/serve WebP blog images (currently PNG in HTML) | P3 | WebP files exist but HTML references PNG |

---

## Credit Usage

### Higgsfield Image Generation

| Metric | Value |
|--------|-------|
| Starting credits | ~210 |
| Credits used | ~154 |
| Remaining credits | ~56 |
| Images generated | ~18 final images (solution + blog + OG + regenerations) |
| Average credits per image | ~8-9 per final image (includes iterations and rejected outputs) |

Images generated:
- 9 solution narrative images (3 per product: underscore, RFI, Copilot)
- 4 blog post illustrations
- 1 OG/social sharing image
- Additional iterations for cop3 and rfi3 (regenerated due to fake text artifacts)
- Various test generations for style exploration

### Fibery API

- Development: ~50-100 API calls per session (2 calls per content fetch, 5-second cache)
- Build: 2-3 API calls per build (entity query + doc fetch + optional file downloads)
- No per-call cost (included in Fibery subscription)
