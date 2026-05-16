# undersight Website

## Purpose

Marketing and landing page for undersight.ai. Design-system-first: every visual
decision flows from `DESIGN.md` and `tokens/tokens.css`. No hardcoded hex codes
in components.

---

## Development Workflow

**All development happens in the `dev` branch of the `undersight-website` repo.**
There is no separate local dev directory — this repo IS the working directory.

### Git Workflow

1. **Every session**: start by pulling latest from `dev`
2. **All edits**: made directly in this repo (not a separate local copy)
3. **Commit frequently**: push to `dev` at every natural checkpoint
4. **Merge to main**: when ready for production build/deploy
5. **No local testing on a separate directory** — test via dev server from this repo

```bash
# Start of session
cd "/Users/kyle/My Drive (kyle@undersight.ai)/undersight-website"
git checkout dev && git pull

# After changes
git add <files> && git commit -m "description" && git push

# When ready for production
git checkout main && git merge dev && git push && git checkout dev
```

### Dev Server

```bash
python3 undersight-serve.py
# Serves on http://localhost:8088
# Content from Fibery API (5s cache)
# SPA fallback routing for clean paths
```

### Build & Deploy

```bash
python3 build.py          # Bakes Fibery content into dist/
python3 build.py --verify  # Build + security checks
```

Requires `FIBERY_TOKEN` env var or macOS Keychain entry
(`mcp-credentials / fibery-undersight`).

---

## Repo & File Map

| What | Path |
|------|------|
| GitHub repo | `under-sight/undersight-website` (`dev` branch) |
| Landing page | `index.html` |
| Favicon SVG | `favicon.svg` |
| Design spec | `DESIGN.md` |
| Token CSS | `tokens/tokens.css` |
| Token JSON | `tokens/tokens.json` |
| Preview catalog | `preview.html` |
| Reference specs | `reference/<source>.DESIGN.md` |
| Tests | `tests/test-suite.sh` |
| Docs | `docs/ARCHITECTURE.md`, `docs/MAINTENANCE.md` |
| Build output | `dist/` (committed, deployed to Cloudflare Pages) |
| Dev server | `undersight-serve.py` |
| Build script | `build.py` |
| Cloudflare Worker | `worker/index.js` + `worker/wrangler.toml` |
| Whitepapers | `whitepaper/` (PDFs + generation scripts) |

---

## Tech Stack

- HTML/CSS (static site, built via `build.py`)
- Inter font with OpenType features (`cv01`, `ss03`)
- Dark mode via `prefers-color-scheme` + manual toggle (`theme-dark`/`theme-light`)
- SPA routing via `history.pushState` + `popstate` (clean paths: `/blog`, `/copilot`)
- **CMS: Fibery (`subscript.fibery.io`) — single source of truth for all editable content.** Site baked at build (`build.py`) and deployed static. Dev refresh cadence: local server caches 5s; Cloudflare dev rebuilds via cron (~5-15 min) and on every push to `dev`.
- Hosted at undersight.ai (Cloudflare Pages)

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

## Content Source of Truth: Fibery CMS

**Principle.** Marketing-grade content (copy, headlines, metrics, testimonials,
case studies, blog posts, whitepapers) lives in Fibery. HTML is a *rendering
layer*, not a content store. The default answer to "where do I change this
text?" is always: **edit the Fibery entity**.

**Editorial workflow.** Edit the Fibery entity → wait for cache refresh
(5s on local dev; next push or cron rebuild on Cloudflare dev/prod). Never
edit content directly in `index.html`.

**Engineering workflow.** To add a new content surface: create the Fibery
entity *first*, then wire the renderer in HTML via `data-content-entity` and
`getContent()`. Do not ship hardcoded copy with a TODO to "move to Fibery
later" — the contract is content-first.

### Currently Fibery-driven

- Hero (`Home - Hero`)
- Solutions dropdown + cards + detail pages
- Blog grid, post bodies, post images
- Contact page (`Contact Page`)
- Site Config (contact email, Calendly, copyright, sign-in URL)
- Whitepapers + lead capture (`Website/Blog` + `Website/Blog Leads`)
- Deployment tracking (`Website/Deployments`)

### Migration backlog (currently hardcoded — should move to Fibery)

- "Who We Serve" cards — `index.html:157-175`
- Metrics bar with 71% / 22% / 650bps claims — `index.html:182-184`
- "How It Works" timeline — `index.html:190-208`
- Testimonial quote — `index.html:264-270`
- CTA copy — `index.html:312-315`
- Footer tagline — `index.html:392`

### Hybrid drift risk

Two case study sections carry `data-content-entity` attributes
(`index.html:226` — Chat Advance; `index.html:275` — 4D Financing) but their
copy is still hardcoded inline. The attribute is a **contract** — those
sections must be fully wired so the Fibery entity is the live source. Any
hardcoded fallback masks a missing render and lets content drift go
undetected.

### Legitimately hardcoded (exceptions)

- JSON-LD structured data (crawler preference for inline literals)
- Design tokens (`tokens/tokens.css`, `tokens/tokens.json`)
- Layout scaffolding (grid wrappers, section containers, semantic structure)
- Brand identity strings ("undersight")
- Calendly / auth URLs — but these *do* live in the `Site Config` entity and
  should be read from there, not duplicated in markup

---

## Fibery Schema Reference

| Type | Key Fields | Used By |
|------|------------|---------|
| `Website/Pages` | `Website/Name`, `Website/Description` (markdown doc), `Website/Assets` (files) | `build.py:97-200`, `undersight-serve.py:53-123` |
| `Website/Blog` | `Website/name`, `Website/Slug`, `Website/PDF`, `Website/Assets`, `Website/Post Date`, `Website/Tag`, `Website/Subtitle`, `Website/Author`, `Website/Excerpt` | `build.py:183-194`, `functions/api/whitepaper-lead.js:79`, `undersight-serve.py:164-166` |
| `Website/Blog Leads` | `Website/Email`, `Website/Blog Post`, `Website/Sent` | `functions/api/whitepaper-lead.js:97-105` |
| `Website/Deployments` | `Website/Commit`, `Website/Site Mode`, `Website/Content Hash`, `Website/Build Status`, `Website/URL`, `Website/Deployed At` | `deploy-report.py:56-102` |
| `Site Config` (entity in `Website/Pages`) | contact email, Calendly URL, copyright, sign-in URL (markdown body keys) | `index.html:784-794` |

**Markdown front-matter convention** used inside `Website/Description` documents:
`_title`, `_body` for primary copy; `Date`, `Excerpt`, `Tag`, `Subtitle`,
`Author` for Blog metadata.

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

1. **Fibery is the CMS source of truth.** All editable content lives in
   Fibery, not HTML. To add or change content, edit the Fibery entity first.
2. **Never hardcode colors.** Import `tokens/tokens.css` and use CSS variables.
3. **Inter text must have OpenType features.** Always apply
   `font-feature-settings: 'cv01', 'ss03'` via `tokens.css` or explicitly.
4. **UI weight is `510`**, not 500. Buttons, nav, labels, form fields.
5. **Amber Rust is reserved** for CTAs, active states, and interactive elements.
   Never decorative.
6. **Token synchrony.** `DESIGN.md`, `tokens/tokens.css`, and `tokens/tokens.json`
   must stay in sync. If you add a value to one, add it to all three.
7. **`data-content-entity` is a contract.** If the attribute is set, the
   rendered copy MUST come from Fibery. Never leave hardcoded fallback copy
   that masks a missing Fibery render.
8. **Preview before shipping.** New component patterns go to `preview.html` first.
9. **"undersight" is always lowercase.** Never "Undersight" or "UNDERSIGHT".

---

## Design Heritage

Reference: `projects/agency-website/` has a fully worked Linear-to-grunion
transplant as a model for how this pipeline works end-to-end.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `python3 undersight-serve.py` → `http://localhost:8088` |
| Build for production | `python3 build.py --verify` |
| Run tests | `bash tests/test-suite.sh` |
| Design preview | `open preview.html` |
| Fetch design ref | `npx getdesign@latest add <site>` |
| Push to dev | `git add . && git commit -m "msg" && git push` |
| Merge to main | `git checkout main && git merge dev && git push && git checkout dev` |
| Trigger test lead | `curl -s -X POST http://localhost:8088/api/whitepaper-lead -H "Content-Type: application/json" -d '{"email":"kyle.adriany@gmail.com","whitepaper":"Chat Advance Case Study"}'` |

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

## Blog PDF Lead Capture & Delivery

### Overview

Research articles and case studies are gated behind an email capture modal.
When a visitor submits their email, a lead entity is created in Fibery and linked
to the corresponding blog/case-study asset. A Fibery automation ("undersight research dispatch")
sends the PDF to the visitor's email automatically. Public route/function names
still say `whitepaper` for compatibility.

### Data Flow

```
Website modal → submitWhitepaperEmail()
  → POST /api/whitepaper-lead { email, whitepaper }
  → Dev: undersight-serve.py _capture_lead()
  → Prod: Cloudflare Worker (WORKER_URL — TODO: deploy)
  → Fibery API:
      1. Query Website/Blog by name → get fibery/id
      2. Create Website/Blog Leads entity
         - Website/Email: submitted email
         - Website/Blog Post: linked to blog/case-study entity
  → Fibery Automation triggers on new lead
  → Sends email with PDF attachment from blog/case-study entity
  → Sets Website/Sent = true on the lead
```

### Fibery Schema

**Website/Blog** (catalog of downloadable PDFs):

| Field | Type | Purpose |
|-------|------|---------|
| `Website/name` | text | Entity name — must match the `whitepaper` param from the modal |
| `Website/PDF` | file | The PDF attachment sent to leads |
| `Website/Leads` | relation (1:M) | Back-reference to all leads for this asset |

**Website/Blog Leads** (captured submissions):

| Field | Type | Purpose |
|-------|------|---------|
| `Website/Email` | text | Visitor's email |
| `Website/Blog Post` | relation (M:1) | Link to the blog/case-study entity |
| `Website/Sent` | bool | Set to true by Fibery automation when email is sent |
| `fibery/creation-date` | date-time | (system) When the lead was captured |

### Current PDF Assets (must exist in Fibery with PDF attached)

| Name (exact match required) | Type | Slug |
|----|------|------|
| `Chat Advance Case Study` | Case Study | `chat-advance` |
| `From Deterministic Scorecards to Agentic Credit Assessments` | Research | `deterministic-scorecards` |
| `Unlocking Institutional Capital for Mid-Tier MCA Funds` | Research | `institutional-capital` |

### PDF Asset Name Mapping (JS → Fibery)

The modal receives a whitepaper name via `openWhitepaperModal(name)`. This name
**must exactly match** the `Website/name` field in the Fibery Blog database.

- Homepage case study CTA → hardcoded `'Chat Advance Case Study'`
- Blog posts with tag `Research` or `Case Study` → uses `post.title` directly,
  except posts containing "Chat Advance" which map to `'Chat Advance Case Study'`

### Adding a New PDF Asset

1. Create a `Website/Blog` entity in Fibery with the exact name
2. Attach the PDF file to the `Website/PDF` field
3. In `index.html`, add a download button that calls
   `openWhitepaperModal('Exact Whitepaper Name')` — OR ensure the blog post
   title matches the whitepaper name and has tag `Research` or `Case Study`
4. The Fibery automation will handle delivery — no code changes needed

### Testing Lead Capture

```bash
# Trigger a test lead (dev server must be running on :8088)
curl -s -X POST http://localhost:8088/api/whitepaper-lead \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","whitepaper":"Chat Advance Case Study"}'
```

Verify in Fibery: Website/Blog Leads should show the new entity linked to
the correct blog/case-study asset, with `Sent` eventually set to true by the automation.

### Production Status

- **Dev server**: POST `/api/whitepaper-lead` handled by `undersight-serve.py`
- **Production**: POST `/api/whitepaper-lead` handled by Cloudflare Pages Function
  (`functions/api/whitepaper-lead.js` — deploys automatically with the site)
- **Fibery automation**: Active — "undersight research dispatch" triggers on new leads
- **Setup required**: Set `FIBERY_TOKEN` in Cloudflare Pages dashboard →
  Settings → Environment variables (Production + Preview)

### Lead Capture Security

The lead capture endpoint is hardened against spam and abuse via four layers:
input validation, Cloudflare Turnstile, per-IP rate limiting, and a strict
whitepaper allowlist. All four are wired up; the Turnstile and rate-limit
layers no-op gracefully (with a logged warning) until the user provisions the
required Cloudflare resources, so the site stays functional in the meantime.

**Required environment variables / bindings (Cloudflare Pages → Settings):**

| Setting | Type | Purpose |
|---|---|---|
| `FIBERY_TOKEN` | Secret env var | Fibery API auth (existing) |
| `CF_TURNSTILE_SECRET_KEY` | Secret env var | Server-side Turnstile verification |
| `RATE_LIMIT_KV` | KV namespace binding | Per-IP counters for rate limit |

**Client-side (`index.html`):** replace the `TURNSTILE_SITE_KEY_PLACEHOLDER`
constant with the public site key from the Cloudflare Turnstile dashboard.

**Provision Turnstile keys:**

1. Cloudflare dashboard → Turnstile → Add site
2. Mode: **Invisible** (least friction, matches the modal UX)
3. Hostnames: `undersight.ai`, `dev.undersight-website.pages.dev`, `localhost`
4. Copy the **Site Key** into `index.html` (the `TURNSTILE_SITE_KEY` constant)
5. Copy the **Secret Key** into Cloudflare Pages → Settings → Environment
   variables → `CF_TURNSTILE_SECRET_KEY` (Production + Preview)

**Provision KV namespace for rate limiting:**

```bash
wrangler kv:namespace create RATE_LIMIT_KV
# Then in Cloudflare Pages dashboard:
#   Settings → Functions → KV namespace bindings
#   Variable name: RATE_LIMIT_KV
#   KV namespace:  (select the one just created)
```

**Rate limit budgets:**

| Environment | Per-minute | Per-day | Key |
|---|---|---|---|
| Production (Pages Function + Worker) | 3 | 20 | `CF-Connecting-IP` |
| Dev server | 5 | — | peer socket IP |

**Validation rules (all environments):**

- Request body capped at 4096 bytes → `413` if exceeded
- Email: 5-254 chars, strict regex (2+ char TLD), no `<>"'`, no `..` → `422`
- Whitepaper name: 1-200 chars, no `<>`, must match `KNOWN_WHITEPAPERS`
  allowlist → `422`
- Turnstile token required when `CF_TURNSTILE_SECRET_KEY` is set → `403`
- Per-IP rate limit exceeded → `429` with `Retry-After` header

**CORS allowlist:** `https://undersight.ai`, `https://www.undersight.ai`,
`https://undersight-website.pages.dev`, `https://dev.undersight-website.pages.dev`,
`http://localhost:8088`. Unknown origins receive **no**
`Access-Control-Allow-Origin` header (the browser rejects the response).

**Adding a new PDF asset (post-launch):** update the `KNOWN_WHITEPAPERS`
constant in all three handlers (`functions/api/whitepaper-lead.js`,
`worker/index.js`, `undersight-serve.py`) when adding a new entity in Fibery.

**P1 hardening in place** (alongside the four layers above): responses use
generic error messages with details to stderr only; dev logs mask emails
(`agent@undersight.ai` → `a***t@undersight.ai`); Fibery error bodies are
redacted to `status + body_len` in Cloudflare logs; the email regex enforces
local-part 1-64 chars with no leading/trailing dot; all handlers reject
non-`application/json` Content-Type with `415`; and `worker/index.js` carries
a `DEPRECATED` header — production traffic flows through the Pages Function.

---

## Launch Readiness Checklist

### CMS robustness

- [ ] Hardcoded marketing copy migrated to Fibery (per migration backlog above)
- [ ] Hybrid case study sections fully wired (no hardcoded fallback)
- [ ] Blog consolidation complete (all posts in `Website/Blog`, not `Website/Pages`)
- [ ] `/blog` sorted by post date desc

### Safeguards

- [ ] `build.py --verify` passes
- [ ] Schema guard active in CI (`.github/workflows/deploy-production.yml`)
- [ ] Under-construction fallback verified (auto-deploys if build fails)

### Security

- [ ] `FIBERY_TOKEN` set in Cloudflare Pages env (Production + Preview)
- [ ] No secrets in committed `dist/` (Fibery URLs, UUIDs, file endpoints)
- [ ] Rate-limit / abuse protection on `/api/whitepaper-lead`

### Tests

- [ ] `tests/test-suite.sh` passing
- [ ] `tests/build-validation.sh` (13 checks) passing
- [ ] Lead capture E2E test (submit → entity created → automation email sent)
- [ ] Visual regression on dev before main merge

### Content

- [ ] Metrics bar (71% / 22% / 650bps) attributed with source
- [ ] All whitepaper entities exist in Fibery with PDFs attached

### Performance

- [ ] Dev rebuild reliable at sub-5-min cadence
- [ ] Fibery webhook for push-based freshness

---

## Known Issues

- Cloudflare Pages needs `FIBERY_TOKEN` env var set in dashboard for whitepaper leads
- Sign In link points to `staging.app.underchat.ai` (intentional until prod auth)
- Font stack validated (Inter) but display font TBD
- Test suite has curl flakes on large HTML responses from Python dev server
  (meta tags, OG tags occasionally fail — not real issues)

---

## Learnings

See `tasks/lessons.md` for session-by-session log.
