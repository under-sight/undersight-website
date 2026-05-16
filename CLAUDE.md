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
git checkout dev && git pull

# After changes
git add <files> && git commit -m "description" && git push

# When ready for production
git checkout main && git merge dev && git push && git checkout dev
```

### Git Rules for Agents (Multi-Agent Safety)

These rules are mandatory for all Claude agents working in this repo.

**Branch before you build.** Never commit directly to `dev` when doing
multi-step work. Create a feature branch from `dev`, do your work there,
then merge back:

```bash
git checkout dev && git pull
git checkout -b <short-descriptive-name>
# ... work and commit ...
git checkout dev && git pull && git merge <branch> && git push
```

**One agent, one branch.** If you are in a worktree or were spawned as a
sub-agent, always create your own branch. Never push to `dev` or `main`
from a worktree — merge via the primary working directory.

**Never revert without reading the commit.** Before running `git revert`,
read the full diff of the target commit (`git show <hash>`) and verify
the changes are actually wrong. Reverting correct work is worse than
leaving a bug — it creates silent regressions across multiple files.

**Never force-push.** No `--force`, no `--force-with-lease`, no
`git push -f`. If the remote has diverged, pull and merge.

**Check for uncommitted work before switching branches.** Run `git status`
before any `git checkout` or `git switch`. Stash or commit first.

**Merge conflicts require human review.** If `git merge` produces
conflicts, stop and ask the user to resolve. Do not silently pick one
side or auto-resolve with `--theirs`/`--ours`.

**Worktree hygiene.** After finishing work in a worktree:
1. Merge your branch back to `dev` from the primary directory
2. Remove the worktree: `git worktree remove <path>`
3. Delete the branch: `git branch -d <name>`

**Before editing a file, check git log for recent changes:**

```bash
git log --oneline -5 -- <file>
```

If another agent touched it in the last few commits, read those commits
before making changes to avoid undoing recent work.

**Commit messages must name the key files changed.** Include file names
in the commit body so the circuit breaker can detect oscillation patterns.

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
- Content from Fibery CMS (`subscript.fibery.io`)
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
| Start dev server | `python3 undersight-serve.py` → `http://localhost:8088` |
| Build for production | `python3 build.py --verify` |
| Run tests | `bash tests/test-suite.sh` |
| Design preview | `open preview.html` |
| Fetch design ref | `npx getdesign@latest add <site>` |
| Push to dev | `git add . && git commit -m "msg" && git push` |
| Merge to main | `git checkout main && git merge dev && git push && git checkout dev` |
| Trigger test lead | `curl -s -X POST https://dev.undersight-website.pages.dev/api/whitepaper-lead -H "Content-Type: application/json" -d '{"email":"test@example.com","whitepaper":"Chat Advance Case Study"}'` |

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

## Blog Lead Capture & PDF Delivery

### Overview

Research articles and case studies (not Insight posts) are gated behind an email
capture modal. When a visitor submits their email, a lead is created in Fibery
and linked to the blog post. A Fibery automation sends the PDF automatically.

### Data Flow

```
Website modal → submitWhitepaperEmail()
  → POST /api/whitepaper-lead { email, whitepaper: "Post Name" }
  → Dev: undersight-serve.py _capture_lead()
  → Prod: Cloudflare Pages Function (functions/api/whitepaper-lead.js)
  → Fibery API:
      1. Query Website/Blog by name → get fibery/id
      2. Create Website/Blog Leads entity
         - Website/Email: submitted email
         - Website/Blog Post: linked to blog entity
  → Fibery Automation triggers on new lead
  → Sends email with PDF attachment from blog entity
```

### Fibery Schema (subscript.fibery.io)

**Website/Blog** (all blog posts; only Case Study and Research have PDFs):

| Field | Type | Purpose |
|-------|------|---------|
| `Website/name` | text | Entity name — must match the name param from the modal |
| `Website/Slug` | text | URL-safe identifier |
| `Website/Type` | multi-select | "Case Study", "Research", or "Insight" |
| `Website/Version` | number | Version control for content updates |
| `Website/PDF` | file | PDF attachment sent to leads (Case Study + Research only) |
| `Website/Leads` | relation (1:M) | Back-reference to all leads for this post |

**Website/Blog Leads** (captured submissions):

| Field | Type | Purpose |
|-------|------|---------|
| `Website/Email` | text | Visitor's email |
| `Website/Blog Post` | relation (M:1) | Link to the blog entity |
| `Website/Sent At` | date-time | Set by Fibery automation when email is sent |

### Current Blog Posts (in Fibery)

| Name (exact match required) | Type | PDF |
|----|------|------|
| `Chat Advance Case Study` | Case Study | Yes |
| `4D Financing Case Study` | Case Study | Yes |
| `From Deterministic Scorecards to Agentic Credit Assessments` | Research | Yes |
| `Unlocking Institutional Capital for Mid-Tier MCA Funds` | Research | Yes |
| `Why AI underwriting is not about replacing underwriters` | Insight | No |
| `The RFI bottleneck` | Insight | No |
| `Building an underwriting copilot` | Insight | No |

### Name Mapping (JS → Fibery)

The modal receives a name via `openWhitepaperModal(name)`. This name
**must exactly match** the `Website/name` field in the Fibery Blog database.

- Posts containing "Chat Advance" → mapped to `'Chat Advance Case Study'`
- Posts containing "4D Financing" → mapped to `'4D Financing Case Study'`
- All other Research/Case Study posts → `post.title` sent directly

### Adding a New Downloadable Post

1. Create a `Website/Blog` entity in Fibery with the exact name
2. Set `Website/Type` to "Case Study" or "Research"
3. Attach the PDF to `Website/PDF`
4. Ensure the blog post title matches the entity name, or add a mapping
   in the `wpName` logic in `index.html`
5. The Fibery automation handles email delivery — no code changes needed

### Generating PDFs

```bash
cd whitepaper && node generate-all.js        # all papers
cd whitepaper && node generate-all.js 4d     # just 4D
```

The generator fetches content from Fibery, renders branded HTML with cover page,
and exports A4 PDFs via Playwright.

### Testing Lead Capture

```bash
curl -s -X POST https://dev.undersight-website.pages.dev/api/whitepaper-lead \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","whitepaper":"Chat Advance Case Study"}'
```

### Production Status

- **Dev server**: POST `/api/whitepaper-lead` handled by `undersight-serve.py`
- **Production**: POST `/api/whitepaper-lead` handled by Cloudflare Pages Function
- **Fibery automation**: Active — triggers on new Blog Leads
- **Required env**: `FIBERY_TOKEN` set in Cloudflare Pages (Production + Preview)

---

## Known Issues

- Cloudflare Pages needs `FIBERY_TOKEN` env var set in dashboard for blog lead capture
- Sign In link points to `staging.app.underchat.ai` (intentional until prod auth)
- Font stack validated (Inter) but display font TBD
- Test suite has curl flakes on large HTML responses from Python dev server
  (meta tags, OG tags occasionally fail — not real issues)

---

## Learnings

See `tasks/lessons.md` for session-by-session log.
