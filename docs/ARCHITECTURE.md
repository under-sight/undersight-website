# undersight.ai Website Architecture

## High-Level Overview

The undersight website is a single-page application (SPA) and the marketing and product site for undersight.ai, an AI underwriting platform for private credit. It is fully static:

- **Content** lives in the repo: `content/content.json` holds every page entity, blog post and integration, and `images/files/` holds the images they reference.
- **Build**: `build.py` reads the content map, bakes it into `index.html` and `resources/workshop.html`, generates the discovery files, and writes everything to `dist/`.
- **Serving**: `serve.mjs`, a Node server with no dependencies, serves `dist/` on Railway and locally.

There is no runtime API, no form handling and no lead capture. Every booking CTA links to https://cal.com/adriany/quick-connect.

The site is design-system-first: all visual decisions flow from `DESIGN.md` through `tokens.css` into `main.css`. No hardcoded hex values in component styles.

### Key URLs

| URL | Purpose |
|-----|---------|
| `https://undersight.ai` | Production site |
| `https://undersight.ai/healthz` | Liveness probe (`ok`) |
| `https://legal.undersight.ai` | Privacy policy |
| `https://app.underchat.ai` | Product app (production sign-in) |
| `https://documentation.underchat.ai` | Product docs (`/docs` redirects there) |
| `https://cal.com/adriany/quick-connect` | Discovery call booking (`/book` redirects there) |

---

## File Structure

```
content/
  content.json                Content map: page entities, _blogs, _integrations, _whitepapers
index.html                    SPA source (loadContent() is replaced at build time)
resources/
  workshop.html               /workshop offer page (one content entity)
  cash-flow-underwriting.html Standalone landing page
  consent.js                  Cookie consent banner
build.py                      Static site builder (content/content.json -> dist/)
serve.mjs                     Static server (dist/, _redirects, _headers, markdown, gzip)
md-negotiation.mjs            Pure helpers for markdown content negotiation
_redirects                    Redirects and rewrites, read by serve.mjs
_headers                      Response header rules, read by serve.mjs
Dockerfile                    Two-stage image: Python build, Node runtime
under-construction.html       Maintenance page used when Production Mode is under-construction

css/
  tokens.css                  Design system tokens (primitive + semantic aliases)
  main.css                    Component styles (references tokens.css variables)
  fonts.css, fonts/           Font faces and font licences

images/
  brand/                      Logo and wordmark SVGs
  files/                      Images referenced by content/content.json
  blog/, solutions/           Older illustration sets
  og-image.png                Open Graph social sharing image (1200x630)

favicon.svg, favicon-*.png, apple-touch-icon.png, manifest.json
robots.txt, sitemap.xml, llms.txt   Fallbacks; sitemap.xml and llms.txt are regenerated at build time

whitepaper/                   Case study and research PDFs and their HTML sources (not deployed)
tests/                        Build, server and page tests (see CLAUDE.md)
dist/                         Build output (gitignored)
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

All site JavaScript is inline in `index.html` (no framework, no bundler). `resources/consent.js` is the one external script.

### Content Loading and Rendering

- **`loadContent()`**: In source, fetches `/api/content`. `build.py` replaces the whole function with one that holds the content map as inline JSON, so the built page makes no content request. Serving the unbuilt `index.html` leaves the hero on its loading state.
- **`renderContent(data)`**: Takes the `{entityName: {content, files}}` map and populates the DOM: hero, site config (sign-in URL, privacy URL, contact email, copyright), solution dropdown, home page rows and detail pages, blog cards and posts from `_blogs`, the integration strip from `_integrations` (`renderIntegrations`), and the contact page.

### Content Parsing

- **`parseMeta(md)`**: Parses entity markdown into `{key: value}` metadata pairs and a `_body` field. Handles `**Key:** Value` patterns, `# Title` headers, and `---` separators.
- **`mdToHtml(md)`**: Converts markdown to HTML. Handles headings, bold, links (with a URL safety check), horizontal rules, and paragraphs.
- **`getContent(data, key)`** and **`getFiles(data, key)`**: Read an entity's markdown and file list.
- **`firstImage(files)`**: Finds the first image in an entity's file list.

### Page Routing (SPA)

- **`navigate(page, opts)`**: Shows `<section class="page" id="page-{name}">`, hides the others, updates the active nav link, scrolls to top, and writes the path with `history.pushState`. Paths are `/`, `/underscore`, `/underchat`, `/copilot`, `/blog`, `/blog/<slug>` and `/contact`; `/rfi` aliases to `/underchat`.
- **`popstate`** listener and boot-time path parsing restore the page for back/forward and for direct visits. `serve.mjs` answers every unknown path with `index.html` (the `/* /index.html 200` rewrite), so deep links load.
- **`openPost(post)`**: Opens a blog post at `/blog/<slug>`. **`openCaseStudy()`** deep-links to the Chat Advance case study.
- **`SOLUTION_MAP`**: Maps solution entity names to page IDs, icons, and tags.

### Navigation, Scroll and Theme

- **`toggleMobileNav()` / `closeMobile()` / `closeDropdowns()`**: Mobile menu and solutions dropdown.
- **`initReveals()`**: `IntersectionObserver` reveal animations at a 10% threshold.
- **Scroll shadow**: toggles `.scrolled` on the header when `scrollY > 10`.
- **`toggleTheme()`**: Cycles the `theme-dark` and `theme-light` classes on `<html>` and back to the OS default.

---

## Content Pipeline

### Content Source

All content lives in `content/content.json`. It started as a one-time export of the production Fibery "CMS" space on 2026-11-16 (19 page entities, 9 blog posts, 12 integrations, 45 files), and the repo is now its only home. A change to copy, a new blog post or a Site Config change is a pull request.

### Content Map Shape

```
{
  "<entity name>": { "content": "<markdown>", "files": [{ "name", "type", "url": "images/files/<name>" }] },
  "_blogs":        { "_data": [{ "name", "slug", "type", "post_date", "creation_date", "author", "subtitle", "excerpt", "body", "files", "has_pdf" }] },
  "_integrations": { "_data": [{ "name", "rank", "pages", "files" }] },
  "_whitepapers":  { "_data": [{ "name", "slug" }] }
}
```

`build.py` copies `images/` into `dist/`, so every `images/files/...` URL in the map resolves as written.

### Entity Naming Convention

| Entity | Purpose |
|--------|---------|
| `Home - Hero` | Hero title and subtitle |
| `Home - Who We Serve` | Homepage audience cards |
| `Home - Metrics` | Stats bar between Who We Serve and How It Works |
| `Home - How It Works` | Homepage process section |
| `Home - Case Study: Chat Advance` | First homepage case study |
| `Home - Testimonial` | Homepage testimonial |
| `Home - Case Study: 4D Financing` | Second homepage case study |
| `Home - CTA` | Homepage final CTA |
| `Solutions - underscore`, `Solutions - underchat agent`, `Solutions - AI Underwriting Copilot` | Solution pages |
| `Solutions - copilot - Scoring Engine`, `Copilot - Feature Matrix` | Copilot page sections |
| `Offer - AI Implementation Workshop` | `/workshop` page |
| `Contact Page` | Contact page |
| `Footer` | Footer copy |
| `SEO` | Meta and Open Graph content |
| `Docs Page` | Docs link copy |
| `Site Config` | Site name, sign-in URL, privacy URL, contact email, copyright, booking URL, LinkedIn URL, Production Mode, Dev Mode, nav structure |

### Content Format

Entity markdown uses a format parsed by `parseMeta()`:

```markdown
# Entity Title

**Key:** Value
**Another Key:** Another Value

---

Body content in markdown format.
Paragraphs separated by blank lines.
```

Blog post metadata (date, excerpt, type, author, subtitle) lives in first-class fields on each `_blogs` row, not in the body.

---

## Build Pipeline

### `build.py` Steps

`python3 build.py [--env=production] [--verify]` runs five steps:

1. **Read `content/content.json`** and read the site mode from the `Site Config` entity: the `**Production Mode:**` line with `--env=production`, otherwise the `**Dev Mode:**` line.
2. **Prepare `dist/`**: removes and recreates it.
3. **Copy static files**: `css/`, `images/`, `resources/` and the root files (favicons, `manifest.json`, `robots.txt`, `sitemap.xml`, `llms.txt`, `_headers`, `_redirects`).
4. **Bake content**: replaces `loadContent()` in `index.html` with an inline copy of the content map, injects BlogPosting JSON-LD, bakes `resources/workshop.html` with its one entity, and writes the discovery files (sitemap, `llms.txt`, `llms-full.txt`, per-page markdown and `_md-manifest.json`).
5. **Write metadata**: `dist/.build-meta.json` records site mode, env, entity count and a content hash.

A production build that reads `under-construction` as the site mode skips steps 3 and 4 and ships `under-construction.html` as `dist/index.html` with the brand assets.

### Build Verification

`--verify` scans every text file in `dist/` for server API calls (`'/api/` or `"/api/`), auth-token-shaped strings, and UUIDs. Failures exit non-zero and stop the Docker build; UUID hits are warnings.

---

## Serving and Hosting

### `serve.mjs`

A Node 22 server using only the standard library. For each GET or HEAD request it:

1. Answers `/healthz` with `ok`.
2. Applies 3xx rules from `_redirects` (`/docs` and `/book` are 302s to external hosts).
3. Serves markdown when the URL ends in `.md` or the request sends `Accept: text/markdown` (see below).
4. Serves a static file, trying the path, then `<path>/index.html`, then `<path>.html`.
5. Applies 200 rewrites from `_redirects` (`/workshop`, `/cash-flow-underwriting`, then `/* /index.html`).
6. Otherwise answers 404.

Every response gets the matching `_headers` rules. Text responses over 1 KB are gzipped when the client accepts gzip. Other methods get 405. `PORT` sets the port (default 8080) and `SITE_ROOT` the served directory (default `dist/` beside the script). Tests: `tests/serve.test.mjs`.

### Railway

The `Dockerfile` has two stages. `python:3.12-slim` copies the repo and runs `python3 build.py --env=production --verify`. `node:22-alpine` copies `serve.mjs`, `md-negotiation.mjs` and the built `dist/`, and runs `node serve.mjs` as the `node` user. Railway builds this image and deploys on every push to `main`; Railway sets `PORT=8080`.

DNS for undersight.ai is on Cloudflare and points at the Railway service. The earlier Cloudflare Pages project is kept, unused, as a rollback target.

### Monitoring

`.github/workflows/health-check.yml` probes https://undersight.ai every 15 minutes, three attempts a minute apart. It opens a GitHub issue when the site is unreachable, returns non-200, lacks the home page markup, or shows the under-construction page, and closes the issue on recovery.

---

## Markdown for Agents

AI agents that fetch the site can get clean Markdown instead of the HTML SPA; browsers are unaffected.

- **Build**: `build.py` emits one `dist/<route>.md` per page and post (home is `dist/index.md`) plus `dist/_md-manifest.json`.
- **Serving**: `serve.mjs` returns the `.md` file when the URL ends in `.md` or the `Accept` header asks for `text/markdown`. The response carries `content-type: text/markdown; charset=utf-8`, `vary: Accept`, `x-robots-tag: all` and `cache-control: public, max-age=300`.
- **Misses**: an explicit `.md` URL with no file answers 404; an `Accept`-negotiated request with no file falls through to the HTML response. `isHtmlDocument()` guards against serving an HTML body as markdown.
- **Helpers**: `md-negotiation.mjs` exports `acceptsMarkdown()`, `markdownAssetPath()` and `isHtmlDocument()`, tested in `tests/md-negotiation.test.mjs`. Page generation is tested in `tests/md-pages.test.py`.

```bash
curl -H "Accept: text/markdown" https://undersight.ai/               # 200 text/markdown
curl https://undersight.ai/underscore.md                             # 200 text/markdown
curl -o /dev/null -w '%{http_code}\n' https://undersight.ai/nope.md  # 404
```

---

## Security Model

- The repo holds no credentials, and neither the build nor the server reads any secret.
- The built site makes no API calls; `build.py --verify` fails the build if a `/api/` call appears in `dist/`.
- `serve.mjs` refuses any path that resolves outside the served directory and accepts only GET and HEAD.
- Third-party analytics or marketing tags load only after the visitor accepts the consent banner (`resources/consent.js`).

---

## Image Pipeline

### Source Generation

Solution and blog images were generated using the Higgsfield AI image generation tool:

1. **Prompt**: Describe the desired monochrome editorial illustration matching the brand style
2. **Generation**: Higgsfield produces high-resolution PNG
3. **Resize**: `sips -Z 1024` to resize to web-appropriate dimensions
4. **WebP conversion**: `sips -s format webp` for optimized variants

### Image References

Page, blog and integration images come from the `files` lists in `content/content.json`, each pointing at `images/files/<name>`. A new image goes into `images/files/` and gets a `files` entry on the entity or blog row that shows it.

---

## Agentic SEO

The site includes several files specifically for AI agent and search engine discoverability.

### `llms.txt` and `llms-full.txt`

`llms.txt` is a structured plain-text summary for LLMs; the build regenerates it with the current blog index. `llms-full.txt` is generated from every content entity except `Site Config`, `SEO` and `Docs Page`, plus every blog post body.

### `robots.txt`

Explicitly allows all major AI agents:
- `GPTBot`, `ChatGPT-User` (OpenAI)
- `Claude-Web`, `Anthropic-AI` (Anthropic)
- `PerplexityBot` (Perplexity)
- `Google-Extended` (Google AI)
- `Amazonbot` (Amazon)

### `sitemap.xml`

Generated at build time: `/`, `/underscore`, `/underchat`, `/copilot`, `/blog`, `/contact`, `/cash-flow-underwriting`, and one `/blog/<slug>` entry per post with its post date. `/docs` is left out because documentation.underchat.ai publishes its own sitemap.

### JSON-LD Structured Data

`index.html` carries Organization and WebSite schemas in `<head>`. The build adds one BlogPosting entry per post.

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

## Known Architecture Limitations

1. **Single HTML file**: All SPA pages, including blog posts, live in one `index.html`, and the content map is inlined into it. As content grows, this file grows with it.

2. **No framework**: The site uses vanilla JS with direct DOM manipulation. This is fine for the current scope but limits composability if the site grows significantly.

3. **Inline CSS remnant**: While the primary styles are in `main.css`, some inline styles remain in `index.html` (particularly on dynamically generated content in JavaScript template literals).

4. **Content edits need a deploy**: With content in the repo, every copy change goes through a pull request, CI and a Railway deploy.
