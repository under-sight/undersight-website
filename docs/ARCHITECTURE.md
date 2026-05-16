# undersight.ai Website Architecture

## High-Level Overview

The undersight website is a single-page application (SPA) that serves as the marketing and product site for undersight.ai, an AI underwriting platform for alternative finance. The architecture has two modes:

- **Development mode**: A Python dev server (`undersight-serve.py`) proxies the Fibery CMS API and serves static files on `localhost:8088`. Content is fetched at runtime via `/api/content`.
- **Production mode**: A build script (`build.py`) fetches all Fibery content, downloads file attachments, and bakes everything into a fully static `dist/` directory with zero runtime API calls.

The site is design-system-first: all visual decisions flow from `DESIGN.md` through `tokens.css` into `main.css`. No hardcoded hex values in component styles.

### Key URLs

| URL | Purpose |
|-----|---------|
| `https://undersight.ai` | Production site |
| `https://legal.undersight.ai` | Privacy policy |
| `https://staging.app.underchat.ai` | Product app (staging) |
| `https://calendly.com/kyle-undersight/30min` | Discovery call booking |

---

## File Structure

```
undersight/
  index.html                  Main SPA (dev version, fetches content from API)
  undersight-serve.py         Dev server (Fibery proxy + static file server, :8088)
  build.py                    Static site generator (Fibery -> dist/)

  css/
    tokens.css                Design system tokens (primitive + semantic aliases)
    main.css                  Component styles (references tokens.css variables)
    palette.css               Legacy color definitions (unused in production)
    fonts.css                 Legacy font definitions (unused in production)

  images/
    brand/
      icon-primary.svg        Standalone icon (pen nib + eye motif)
      logo-horizontal-line-primary.svg   Logo with underline (primary, for light bg)
      logo-horizontal-line-reversed.svg  Logo with underline (reversed, for dark bg)
      logo-horizontal-primary.svg        Logo without underline (primary)
      logo-horizontal-reversed.svg       Logo without underline (reversed)
      wordmark-primary.svg    Wordmark only
    solutions/
      us1.png, us1.webp       underscore solution images (3 pairs, PNG + WebP)
      us2.png, us2.webp
      us3.png, us3.webp
      rfi1.png, rfi1.webp     Agentic Client RFI solution images (3 pairs)
      rfi2.png, rfi2.webp
      rfi3.png, rfi3.webp
      cop1.png, cop1.webp     AI Underwriting Copilot solution images (3 pairs)
      cop2.png, cop2.webp
      cop3.png, cop3.webp
    blog/
      ai-underwriting.png, .webp       Blog illustration: AI underwriting concept
      rfi-bottleneck.png, .webp        Blog illustration: RFI document funnel
      copilot-building.png, .webp      Blog illustration: human+AI collaboration
      chat-advance.png, .webp          Blog illustration: Chat Advance case study
    hero.png                  Unused hero image (991KB, candidate for removal)
    og-image.png              Open Graph social sharing image (1200x630)

  favicon.svg                 Vector favicon (pen nib + eye SVG)
  favicon-16.png              16x16 raster favicon
  favicon-32.png              32x32 raster favicon
  favicon-180.png             180x180 raster favicon
  favicon-192.png             192x192 Android Chrome icon
  favicon-512.png             512x512 Android Chrome icon
  apple-touch-icon.png        iOS home screen icon (180x180)
  manifest.json               PWA manifest (icons, theme color, name)

  robots.txt                  Crawler permissions (all AI agents explicitly allowed)
  sitemap.xml                 URL listing for search engines
  llms.txt                    AI agent-readable site summary (structured plain text)
  README.md                   Handoff documentation

  dist/                       Build output (deploy this directory)
    index.html                Static HTML with baked-in Fibery content
    css/                      Copied from source
    images/                   Copied from source + downloaded Fibery file attachments
      files/                  Fibery file attachments (downloaded during build)
    [all other static files]
```

---

## CSS Architecture

### Token Layering

The CSS architecture follows a three-layer model:

```
tokens.css (primitive values + semantic aliases)
    |
    v
main.css (component styles referencing semantic aliases)
    |
    v
index.html (structural markup, no inline styles ideally)
```

#### Layer 1: `tokens.css`

Defines all design tokens as CSS custom properties in `:root`:

- **Primitive palette** (lines 8-36): Raw color values like `--color-graphite-900: #23262C`, `--color-amber-rust: #C97A54`. These are constants that never change between themes.
- **Semantic aliases** (lines 41-65): Contextual mappings like `--color-text: var(--color-graphite-900)`, `--color-bg: var(--color-paper-white)`. These are what components reference.
- **Typography tokens** (lines 70-137): Font families, sizes, weights, line heights, letter spacing for every type role.
- **Spacing tokens** (lines 143-152): 8px grid system from `--space-xxs` (2px) to `--space-section` (80px).
- **Border radius** (lines 157-163): Scale from `--rounded-xs` (4px) to `--rounded-pill` (9999px).
- **Shadow tokens** (lines 169-171): Three elevation levels.
- **Transition tokens** (lines 177-180): Duration and easing values.
- **Z-index tokens** (lines 186-188): Layering stack.
- **Layout tokens** (lines 194-195): Max width (1120px) and nav height (64px).

#### Layer 2: Dark Mode Override (`tokens.css` lines 202-228)

A `@media (prefers-color-scheme: dark)` block overrides the semantic aliases only, swapping them to dark mode primitives. This means components never need dark mode-specific CSS -- they reference semantic aliases that automatically resolve to the correct value.

There is also an `html.theme-light` class (lines 232-248) for manual light mode override when the OS is in dark mode.

#### Layer 3: `main.css`

Component styles that reference only semantic aliases from `tokens.css`. The file begins with a bridge block (lines 8-18) that maps semantic tokens to short aliases used throughout:

```css
:root {
  --black: var(--color-text);
  --dark: var(--color-text-secondary);
  --mid: var(--color-text-muted);
  --light: var(--color-border-light);
  --pale: var(--color-border);
  --bg: var(--color-bg-alt);
  --white: var(--color-bg);
  --radius: var(--rounded-sm);
  --max-w: var(--max-width);
}
```

This bridge enables concise component code (`color: var(--mid)`) while maintaining full token-system traceability.

#### Legacy Files (unused)

- `palette.css`: Duplicates some color definitions from `tokens.css`. Not loaded in production.
- `fonts.css`: Duplicates some font definitions. Not loaded in production.

These exist from an earlier build phase and should be considered for removal to prevent confusion.

### Dark Mode Strategy

Dark mode works through a single mechanism: CSS custom property override.

1. `tokens.css` defines light-mode semantic aliases in `:root`
2. `@media (prefers-color-scheme: dark)` overrides those same aliases with dark values
3. All components reference only the semantic aliases
4. Result: zero component-level dark mode code needed

Special cases:
- The header background uses `rgba()` for blur-through transparency, with explicit light/dark overrides in `main.css`
- The nav logo image uses `filter: invert(1)` in dark mode

### Responsive Breakpoints

The site uses a single primary breakpoint at 768px:

| Breakpoint | Behavior |
|------------|----------|
| > 768px | Full desktop layout: horizontal nav, multi-column grids, side-by-side solution rows |
| <= 768px | Mobile layout: hamburger menu, single-column stacking, reduced padding |
| <= 560px | Footer columns collapse to single column |

Section padding shifts from 80px (desktop) to 48px (mobile). Hero headline drops from 48px to 32px.

---

## JavaScript Architecture

All JavaScript is inline in `index.html` (no external JS files, no build tools, no framework). The architecture is organized into several functional groups:

### Content Fetching & Rendering

- **`loadContent()`**: Fetches all CMS content from `/api/content` (dev) or uses baked-in JSON (production). Passes the data to `renderContent()`.
- **`renderContent(data)`**: The core rendering function. Takes a `{entityName: {content, files}}` map and populates the DOM:
  - Parses hero title/subtitle from `Homepage - Hero`
  - Reads site config (sign-in URL, privacy URL, contact email, copyright)
  - Generates solution dropdown items, home page solution rows, and detail pages
  - Generates blog cards from `Blog - *` entities
  - Wires contact page from `Contact Page` entity

### Content Parsing

- **`parseMeta(md)`**: Parses Fibery markdown into `{key: value}` metadata pairs and a `_body` field. Handles `**Key:** Value` patterns, `# Title` headers, and `---` separators.
- **`mdToHtml(md)`**: Converts markdown to HTML. Handles headings (`#`, `##`, `###`), bold (`**text**`), links (`[text](url)` with URL safety check), horizontal rules, and paragraphs.
- **`getContent(data, key)`**: Extracts content string from entity map.
- **`getFiles(data, key)`**: Extracts file array from entity map.
- **`firstImage(files)`**: Finds first image file in an entity's file list.

### Page Routing (SPA)

- **`navigate(page)`**: Core routing function. Shows the target `<section class="page" id="page-{name}">` and hides all others. Updates active nav state. Scrolls to top. Wrapped by a transition layer that adds a 150ms fade-out before switching.
- **Hash-based routing**: Pages are identified by fragment IDs (`#home`, `#underscore`, `#rfi`, `#copilot`, `#docs`, `#blog`, `#post`, `#contact`).
- **`openPost(post)`**: Navigates to a blog post, populating title, meta, and body from parsed content.
- **`openCaseStudy()`**: Direct-links to the Chat Advance case study blog post.

### Navigation

- **`toggleMobileNav()` / `closeMobile()`**: Toggle mobile hamburger menu.
- **`closeDropdowns()`**: Closes solution dropdown menu.
- **`clerkSignIn()`**: Simulates Clerk authentication for docs section (uses `confirm()` dialog in dev/staging).

### Scroll & Animation

- **`initReveals()`**: Adds `.reveal` and `.reveal-stagger` classes to content sections and sets up an `IntersectionObserver` that triggers `.visible` when sections enter the viewport at 10% threshold.
- **Scroll shadow**: A `scroll` event listener toggles `.scrolled` class on the header when `scrollY > 10`, adding a subtle shadow.
- **Page transitions**: The `navigate` function is wrapped to add a 150ms `.fade-out` opacity transition before page switch.

### Theme Toggle

- **`toggleTheme()`**: Toggles `theme-light` class on `<html>`. Works correctly for dark-mode OS users (forces light). Has a known limitation for light-mode OS users (toggle has no effect since there is no `theme-dark` class).

### Content Maps (Static Data)

Several objects map Fibery entity names to rendering configuration:

- **`SOLUTION_MAP`**: Maps entity names to page IDs, icons, and tags.
- **`BLOG_IMAGES`**: Maps blog post titles to local image paths.
- **`SOLUTION_IMAGES`**: Maps solution page IDs to hero image paths.
- **`SOLUTION_NARRATIVES`**: Maps solution page IDs to 3-step narrative scroll content (title, description, image per step).

---

## Content Pipeline

### Fibery CMS Structure

Content lives in a Fibery workspace at `subscript.fibery.io` in the database `Website/Database 1`. Each entity has:

- **Name**: Entity identifier (e.g., `Homepage - Hero`, `Blog - The RFI bottleneck`)
- **Description**: A rich text document (fetched separately via document secret)
- **Assets**: File attachments (images)

### Entity Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `Homepage - Hero` | Hero section content | Title + subtitle |
| `Site Config` | Global site settings | Sign-in URL, privacy URL, email, copyright |
| `Contact Page` | Contact/CTA content | Title + body text |
| `Solutions - *` | Solution pages | `Solutions - underscore`, `Solutions - Agentic Client RFI`, `Solutions - AI Underwriting Copilot` |
| `Blog - *` | Blog posts | `Blog - Why AI underwriting is not about replacing underwriters` |

### Content Flow (Development)

```
Fibery CMS
    |
    | (1) Entity query: names, doc secrets, file secrets
    | (2) Batch doc fetch: markdown content for all entities
    v
undersight-serve.py (:8088)
    |
    | /api/content -> JSON {name: {content, files}}
    | /api/file/{opaque_id} -> proxied Fibery file download
    v
index.html (browser)
    |
    | loadContent() -> fetch('/api/content')
    | renderContent(data) -> DOM manipulation
    v
Rendered page
```

### Content Flow (Production)

```
Fibery CMS
    |
    | (1) Entity query
    | (2) Batch doc fetch
    | (3) File downloads -> dist/images/files/
    v
build.py
    |
    | Bakes content JSON into loadContent() as inline data
    | Rewrites /api/file/ URLs to local paths
    | Strips Fibery references from markdown
    v
dist/index.html (static, no API calls)
```

### Content Format

Fibery entities use a markdown-like format parsed by `parseMeta()`:

```markdown
# Entity Title

**Key:** Value
**Another Key:** Another Value

---

Body content in markdown format.
Paragraphs separated by blank lines.
```

Common metadata keys: `Date`, `Excerpt`, `Tag`, `Sign In URL`, `Privacy Policy URL`, `Contact Email`, `Copyright`.

---

## Build Pipeline

### `build.py` Steps

The build script performs 6 sequential steps:

1. **Retrieve Fibery API token** from macOS Keychain (`security find-generic-password -s mcp-credentials -a fibery-undersight -w`)

2. **Fetch content from Fibery** in 2 API calls:
   - `fibery.entity/query`: Gets all entity names, document secrets, and file attachment secrets
   - `get-documents`: Batch-fetches all markdown document content

3. **Prepare dist/ directory**: Clean slate (removes existing `dist/` and recreates)

4. **Copy static files**: Copies `css/`, `images/` directories and individual files (robots.txt, sitemap.xml, favicons, etc.)

5. **Download Fibery file attachments**: Downloads each file by its secret, saves to `dist/images/files/` with sanitized filenames, then rewrites `/api/file/{opaque_id}` URLs in the content map to local paths

6. **Bake content into HTML**:
   - Extracts the `loadContent()` function from `index.html` using brace-matching
   - Replaces the `fetch('/api/content')` call with inline JSON data
   - Strips any Fibery URLs from markdown content
   - Removes dev server reference comments
   - Writes the modified HTML to `dist/index.html`

### Build Verification

Running `python3 build.py --verify` adds a security scan of all text files in `dist/` checking for:

- Fibery workspace URLs (`fibery.io`, `subscript.fibery.io`)
- Dev server endpoints (`/api/content`, `/api/file/`)
- Possible auth tokens (`Token ` followed by credentials)
- UUIDs that might be leaked Fibery document/file secrets

Failures block the build; warnings are informational.

### Build Output

```
dist/
  index.html          ~50-80KB (HTML + baked content JSON)
  css/tokens.css      ~6KB
  css/main.css        ~17KB
  images/             Solution PNGs, blog PNGs, WebP variants, OG image
  images/files/       Downloaded Fibery file attachments
  favicons            SVG + PNG suite
  robots.txt
  sitemap.xml
  llms.txt
  manifest.json
```

---

## Security Model

### API Token Storage

The Fibery API token is stored in the macOS Keychain:
- **Service**: `mcp-credentials`
- **Account**: `fibery-undersight`
- **Retrieval**: `security find-generic-password -s mcp-credentials -a fibery-undersight -w`

The token never appears in source code, environment variables, or configuration files.

### Opaque File IDs

When the dev server serves file attachments, it maps Fibery file secrets (UUIDs) to opaque SHA-256 hashes (first 12 hex characters). The client only sees `/api/file/abc123def456` -- never the raw Fibery secret. The mapping is held in server memory only.

### Production Security

The production build (`dist/`) contains:
- Zero API calls (all content is baked inline)
- Zero Fibery URLs (stripped during build)
- Zero auth tokens (never in source)
- Zero file secrets (rewritten to local paths)

The `--verify` flag confirms this with a full text scan.

### Known Exposure

- The Fibery workspace domain `subscript.fibery.io` and database name `Website/Database 1` appear in the server source files (`undersight-serve.py`, `build.py`). These are not deployed to production but are in the repository.
- The staging app URL `https://staging.app.underchat.ai/login` appears in the HTML (known issue flagged in adversarial review).

---

## Image Pipeline

### Source Generation

Solution and blog images were generated using the Higgsfield AI image generation tool:

1. **Prompt**: Describe the desired monochrome editorial illustration matching the brand style
2. **Generation**: Higgsfield produces high-resolution PNG
3. **Resize**: `sips -Z 1024` to resize to web-appropriate dimensions
4. **WebP conversion**: `sips -s format webp` for optimized variants
5. **Deployment**: Copy PNG + WebP pairs to appropriate `images/` subdirectory

### Image Inventory

| Category | Count | Format | Typical Size |
|----------|-------|--------|-------------|
| Solution images | 9 | PNG + WebP pairs | ~100-500KB each |
| Blog illustrations | 4 | PNG + WebP pairs | ~200KB-2MB each |
| OG image | 1 | PNG | 37KB |
| Favicons | 7 | SVG + PNG | 392B - ~20KB |
| Brand logos | 6 | SVG | ~1-5KB each |

### Image References in Code

Blog and solution images are mapped via static objects in `index.html`:
- `BLOG_IMAGES`: Maps blog post titles to `images/blog/` paths
- `SOLUTION_IMAGES`: Maps solution page IDs to `images/solutions/` paths
- `SOLUTION_NARRATIVES`: Includes image paths for each narrative step

When a blog post has a Fibery file attachment (image), the dev server proxies it via `/api/file/{opaque_id}`. The build script downloads these to `dist/images/files/` and rewrites the URLs.

---

## Agentic SEO

The site includes several files specifically for AI agent and search engine discoverability:

### `llms.txt`

A structured plain-text file designed for LLM consumption. Contains:
- Company description and positioning
- Product descriptions (underscore, Agentic Client RFI, AI Underwriting Copilot)
- Key metrics (71% deal time reduction, 22% more receivables, 650bps loss ratio)
- Market context ($19-22B annual US market)
- Contact information and all site links

### `robots.txt`

Explicitly allows all major AI agents:
- `GPTBot`, `ChatGPT-User` (OpenAI)
- `Claude-Web`, `Anthropic-AI` (Anthropic)
- `PerplexityBot` (Perplexity)
- `Google-Extended` (Google AI)
- `Amazonbot` (Amazon)

### `sitemap.xml`

Lists all SPA pages with hash-based URLs:
- Homepage (priority 1.0, weekly)
- Solution pages: `/#underscore`, `/#rfi`, `/#copilot` (priority 0.8, monthly)
- Blog: `/#blog` (priority 0.7, weekly)
- Docs: `/#docs` (priority 0.6, monthly)

### JSON-LD Structured Data

Two `<script type="application/ld+json">` blocks in `<head>`:

1. **Organization schema**: Name, URL, description, founding date (2025-10), contact point, and three Offer entities for each product.
2. **WebSite schema**: Name, URL, description.

### Open Graph & Twitter Cards

Full meta tag suite for social sharing:
- `og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:image` (with dimensions)
- `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`

### `manifest.json`

PWA manifest with:
- App name: "undersight"
- Theme color: `#23262C` (Graphite 900)
- Background color: `#FAFAFA` (BG Surface)
- Icons: 192x192 and 512x512 PNG

---

## Whitepaper Lead Capture System

### Overview

Gated whitepaper downloads capture email leads and deliver PDFs via Fibery automation. The system spans the website frontend, a server-side relay, Fibery CMS databases, and an email automation pipeline.

```
[Website Modal] → [Dev Server / Cloudflare Worker] → [Fibery API]
                                                          ↓
                                                  [Whitepaper Leads DB]
                                                          ↓
                                                  [Fibery Automation]
                                                          ↓
                                              [HTML Email + PDF to user]
```

### Fibery Schema

**`Website/Blog`** — catalog of blog posts (Case Study and Research types have PDFs)

| Field | Type | Purpose |
|-------|------|---------|
| Name | text | Display name (used in email subject + template) |
| Slug | text | URL-safe identifier |
| Type | multi-select | "Case Study", "Research", or "Insight" |
| PDF | file | Attached PDF (Case Study + Research only) |
| Leads | relation (one-to-many) | Reverse relation to Blog Leads |

**`Website/Blog Leads`** — captured email entries

| Field | Type | Purpose |
|-------|------|---------|
| Email | text (email) | Submitted email address |
| Blog Post | relation (many-to-one) | Linked blog entity |
| Sent At | date-time | Set by Fibery automation when email sent |

### Frontend Components

**Email capture modal** (`index.html`):
- `div.wp-overlay` / `div.wp-modal` — overlay + centered card
- `openWhitepaperModal(name)` — opens modal, sets `_activeWhitepaper` to the whitepaper name
- `submitWhitepaperEmail()` — validates email, POSTs to `WORKER_URL`, shows success/error state
- `closeWhitepaperModal()` — hides modal, resets form state
- Escape key and backdrop click close the modal
- CSS in `main.css` lines 741+ (`.wp-overlay`, `.wp-modal`, `.wp-input`, `.wp-success`)

**Download buttons** appear in three locations:
1. Case study section on homepage (`btn-ghost`, passes `'Chat Advance Case Study'`)
2. Case study blog post hero (inside dark header block)
3. Research blog post heroes (inside dark header block, passes `post.title`)

### Server-Side Relay

**Dev server** (`undersight-serve.py`):
- `POST /api/whitepaper-lead` accepts `{ email, whitepaper }` JSON
- Looks up blog entity by name via Fibery query (uses `$name` param syntax)
- Creates `Website/Blog Leads` entity with linked blog post relation
- Logs: `[LEAD] email -> whitepaper_name (linked)` or `(no match)`

**Production** (Cloudflare Worker at `worker/index.js`):
- Same logic: validate email → query whitepaper → create lead with relation
- CORS headers for `undersight.ai` origin
- Fibery API token stored as Worker secret (`FIBERY_TOKEN`)
- Deploy: `npx wrangler deploy` + `npx wrangler secret put FIBERY_TOKEN`

**WORKER_URL resolution** (in `index.html`):
```javascript
const WORKER_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? '/api/whitepaper-lead'      // dev server
  : '';                          // TODO: Cloudflare Worker URL
```

### Fibery Email Automation

**Rule:** "undersight research dispatch" — trigger: entity created on Whitepaper Leads

**Email template engine:** Fibery uses an EJS-like templating system for email bodies:

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{! Relation:Field1,Field2 !}` | Pre-load relation data before template renders | `{! Whitepaper:Name,PDF !}` |
| `<%= expression %>` | Output a value into HTML | `<%= wp.Name %>` |
| `<% code %>` | Logic blocks (if/for/variable assignment) | `<% if (pdfUrl) { %>` |
| `{{Field}}` | Simple field template (direct fields only) | `{{Email}}` |
| `Entity.Relation` | Access pre-loaded relation object | `Entity.Whitepaper["Name"]` |
| `context.getService('utils')` | Utility functions | `utils.getFileUrl(secret)` |

**Critical formatting rules for Fibery email HTML:**
1. **Zero indentation** — all HTML lines must start at column 0. Markdown mode treats 4+ spaces as code blocks, rendering raw HTML as text.
2. **Use `{! !}` directive** — pre-loads relation data. Without it, `Entity.Relation` is null.
3. **EJS markers required for HTML rendering** — plain HTML without `<% %>` markers gets markdown-escaped.
4. **`markdown: true` is compatible** — the EJS/HTML content passes through the markdown processor untouched as long as there's no indentation.
5. **File URLs** — use `utils.getFileUrl(file.Secret)` to generate accessible download links.
6. **Relation data is an object** (many-to-one) — access fields as `Entity.Whitepaper["Name"]`, not as an array.

**Email template structure:**
```
{! Whitepaper:Name,PDF !}
<% /* EJS preamble: load data */ %>
<div style="...">          ← all HTML at column 0
<%= wp.Name %>              ← dynamic values via EJS
<% if (pdfUrl) { %>         ← conditional blocks
<a href="<%= pdfUrl %>">    ← dynamic attributes
<% } %>
</div>
```

### PDF Generation

**Source templates:** `whitepaper/chat-advance.html` (custom) + `whitepaper/generate-all.js` (research articles)

**Pipeline:**
1. Fetch article content from Fibery CMS via dev server (`/api/content`)
2. Convert markdown → HTML with brand styling (Inter headings, DM Sans body, Amber Rust accents)
3. Render HTML → PDF via Playwright (`page.pdf({ format: 'A4', printBackground: true })`)
4. Upload PDF to Fibery whitepaper entity via `fibery undersight file attach`

**Regenerate all PDFs:**
```bash
cd whitepaper && node generate-all.js
```

### Current Whitepapers

| Name | Type | Slug | PDF |
|------|------|------|-----|
| Chat Advance Case Study | Case Study | chat-advance | 5 pages, 398KB |
| From Deterministic Scorecards to Agentic Credit Assessments | Research | deterministic-scorecards | 3 pages, 250KB |
| Unlocking Institutional Capital for Mid-Tier MCA Funds | Research | institutional-capital | 3 pages, 385KB |

---

## Known Architecture Limitations

1. **SPA hash routing**: All pages use `#fragment` URLs, which are invisible to search engine crawlers. Blog posts and solution pages cannot be individually indexed. A migration to proper URL paths (via static generation or server-side routing) would significantly improve SEO.

2. **Single HTML file**: All pages, including blog posts, are in one `index.html`. As content grows, this file will become unwieldy. Consider splitting into separate HTML files per page.

3. **No framework**: The site uses vanilla JS with direct DOM manipulation. This is fine for the current scope but limits composability if the site grows significantly.

4. **Theme toggle is incomplete**: The toggle only works for dark-mode OS users (adds `theme-light` class). There is no `theme-dark` class, so light-mode OS users cannot manually switch to dark mode.

5. **Inline CSS remnant**: While the primary styles are in `main.css`, some inline styles remain in `index.html` (particularly on dynamically generated content in JavaScript template literals).

6. **Legacy CSS files**: `palette.css` and `fonts.css` exist but are not loaded in production. They duplicate token definitions and could cause confusion if accidentally loaded.
