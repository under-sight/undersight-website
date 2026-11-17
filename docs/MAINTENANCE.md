# undersight.ai Website Maintenance Guide

## Updating Content

All website content lives in `content/content.json`, and the images it references live in `images/files/`. A content change is a pull request against `main`; it reaches production when Railway deploys the merge.

### Entity Naming Conventions

Entity names (the top-level keys of `content/content.json`) determine how content is routed and rendered. `index.html` looks them up by exact name.

| Entity Name | Renders As |
|-------------|-----------|
| `Home - Hero` | Hero headline (line after `#`) and subtitle (body text) |
| `Home - Who We Serve` | Homepage audience cards |
| `Home - Metrics` | Homepage stats bar between Who We Serve and How It Works |
| `Home - How It Works` | Homepage process section |
| `Home - Case Study: Chat Advance` | First homepage case study |
| `Home - Testimonial` | Homepage testimonial |
| `Home - Case Study: 4D Financing` | Second homepage case study |
| `Home - CTA` | Homepage final CTA |
| `Site Config` | Global settings: sign-in URL, privacy policy URL, contact email, copyright, booking URL, LinkedIn URL, Production Mode, Dev Mode |
| `Contact Page` | Contact section headline and description |
| `Footer` | Footer copy |
| `SEO` | Meta and Open Graph content |
| `Solutions - underscore` | underscore solution page |
| `Solutions - underchat agent` | underchat agent solution page (formerly `Solutions - Agentic Client RFI`) |
| `Solutions - AI Underwriting Copilot` | Copilot solution page |
| `Offer - AI Implementation Workshop` | `/workshop` page |

Blog posts are rows in `_blogs._data`, integrations are rows in `_integrations._data`, and case study and research titles are rows in `_whitepapers._data`.

### Content Format

Each entity is `{"content": "<markdown>", "files": [...]}`. The markdown uses this format:

```markdown
# Title Goes Here

**Key:** Value

---

Body content starts after the separator.
Supports **bold**, [links](https://example.com), and paragraph breaks.
```

- The `# Title` becomes the rendered title (or page heading)
- `**Key:** Value` pairs become metadata
- Everything after `---` is the body content
- Paragraphs are separated by blank lines

`content` is a JSON string, so newlines are `\n` and double quotes are escaped. Each `files` entry is `{"name": "<file>", "type": "<mime type>", "url": "images/files/<file>"}`.

### Workflow: Edit Existing Content

1. Branch off `origin/main`.
2. Find the entity in `content/content.json` and edit its `content` string.
3. Preview: `python3 build.py && node serve.mjs`, then open http://localhost:8080.
4. Run the test suite (see CLAUDE.md) and open a pull request against `main`.
5. After merge, confirm the change on https://undersight.ai.

### Workflow: Maintenance Mode

Set the `Site Config` line `**Production Mode:** under-construction` and ship it. The next production build serves `under-construction.html` in place of the site, and `health-check.yml` opens an alert issue while it is live. Set the line back to `live` to restore the site.

---

## Adding a New Blog Post

1. **Add the images** to `images/files/`. For the card image, use a 1536x1024 PNG in the monochrome editorial illustration style.

2. **Append a row** to `_blogs._data` in `content/content.json`, copying the keys of an existing post:

   | Key | Value |
   |-----|-------|
   | `name` | Post title |
   | `slug` | URL slug; the post lives at `/blog/<slug>` |
   | `type` | `Insight`, `Research` or `Case Study` (also the blog filter tag) |
   | `post_date` | ISO date; falls back to `creation_date` |
   | `creation_date` | ISO timestamp |
   | `author`, `subtitle`, `excerpt` | Post metadata; `excerpt` shows on the blog card |
   | `body` | Post body in markdown |
   | `files` | Image entries; the first image is the card thumbnail |
   | `has_pdf` | `false` for a new post |

3. **Preview** at http://localhost:8080/blog after `python3 build.py && node serve.mjs`.

4. **Ship** through a pull request. The build adds the post to `sitemap.xml`, `llms.txt`, `llms-full.txt`, the BlogPosting JSON-LD and `/blog/<slug>.md`.

---

## Adding a New Solution Page

Adding a new solution page requires both content and code changes:

1. **Add the content entity** `Solutions - [Product Name]` to `content/content.json`, with its images in `images/files/`.

2. **Add to `SOLUTION_MAP`** in `index.html`:
   ```javascript
   const SOLUTION_MAP = {
     'Solutions - [Product Name]': { page: 'newproduct', icon: 'N', tag: 'Category' },
   };
   ```

3. **Add the page section** in `index.html`:
   ```html
   <section class="page" id="page-newproduct"></section>
   ```

4. **Add homepage pills and narrative copy** in `SOLUTION_PILLS`, `SOLUTION_NARRATIVE_TITLES` and `SOLUTION_NARRATIVE_DESCS` in `index.html`.

5. **Update footer links** in `index.html`:
   ```html
   <a href="/newproduct" onclick="event.preventDefault();navigate('newproduct')">[Product Name]</a>
   ```

6. **Update `build.py`**: add the path to `SITEMAP_PAGES` and to the markdown targets so the page gets a sitemap entry and a `.md` file.

7. **Update `llms.txt`**: add the product description and link.

8. **Update JSON-LD structured data**: add a new Offer entry in the Organization schema in `index.html`.

---

## Modifying the Design System

The design system has three files that must stay in sync:

| File | Purpose |
|------|---------|
| `DESIGN.md` | Source of truth specification |
| `tokens/tokens.css` | CSS custom properties |
| `tokens/tokens.json` | Design Tokens Community Group format |

The live site loads `css/tokens.css`.

### Workflow: Change a Token Value

1. Update the value in `DESIGN.md` (the specification)
2. Update the corresponding CSS custom property in `tokens/tokens.css`
3. Update the corresponding entry in `tokens/tokens.json`
4. Carry the change into `css/tokens.css`
5. Verify in both light and dark mode
6. Check that no components break by previewing the site

### Workflow: Add a New Token

1. Define the token in `DESIGN.md` with its value, purpose, and usage rules
2. Add the CSS custom property to `tokens/tokens.css` in the appropriate section
3. If it needs a dark mode override, add it to the `@media (prefers-color-scheme: dark)` block
4. Add the corresponding entry to `tokens/tokens.json`
5. If the token needs a short alias in `main.css`, add it to the `:root` bridge block
6. Update `preview.html` to showcase the new token

### Key Rules

- Never use raw hex values in `main.css` or `index.html`. Always reference a token variable.
- The UI weight is `510`, not `500`. Always use `--weight-ui` for buttons, nav, labels, form fields.
- Amber Rust is only for CTAs, active states, section labels, and interactive elements. Never decorative.
- Inter must always have `font-feature-settings: 'cv01', 'ss03'`.
- "undersight" is always lowercase. No exceptions.

---

## Regenerating Images

Solution and blog images were created using Higgsfield AI image generation.

### Prerequisites

- Higgsfield account with available credits
- `sips` command (built into macOS) for image processing

### Workflow

1. **Generate the image** using Higgsfield with a prompt matching the monochrome editorial style:
   - Style: clean line work, grayscale/monochrome, conceptual illustration
   - Avoid: color, photorealism, stock photo aesthetics
   - Reference existing images in `images/files/` for style consistency

2. **Resize**:
   ```bash
   sips -Z 1024 downloaded-image.png
   ```

3. **Place it in `images/files/`** and point the entity's or post's `files` entry at it.

---

## Local Preview

Requires Python 3.12 and Node 22. No credentials are needed.

```bash
python3 build.py && node serve.mjs    # http://localhost:8080
PORT=3000 node serve.mjs              # custom port
```

`serve.mjs` serves the built `dist/`. Rebuild after every content or source change. The server reads files from disk on each request, so a rebuild needs no restart; it reads `_redirects` and `_headers` once at start, so a change to either needs one.

---

## Building for Production

```bash
python3 build.py --env=production --verify
```

`--env=production` reads the `Production Mode` line of `Site Config`; without it the build reads `Dev Mode`, which never triggers the under-construction page. `--verify` scans `dist/` for API calls, auth tokens and UUIDs and exits non-zero on a failure.

### What the Build Does

1. Reads `content/content.json` and the site mode
2. Creates a clean `dist/` directory
3. Copies `css/`, `images/`, `resources/` and the root static files
4. Bakes the content map into `loadContent()` in `index.html`, and the workshop entity into `resources/workshop.html`
5. Writes the sitemap, `llms.txt`, `llms-full.txt`, BlogPosting JSON-LD and per-page markdown
6. Writes `dist/.build-meta.json`

---

## Deploying

Railway builds the `Dockerfile` and deploys on every push to `main`. There is no manual deploy step and no dev environment.

1. Open a pull request against `main`. CI runs the full test suite.
2. Merge when CI is green. Railway builds the image (production build with `--verify`) and starts `node serve.mjs`.
3. A failed build leaves the previous deploy serving.

### DNS

- undersight.ai DNS is on Cloudflare and points at the Railway service.
- The old Cloudflare Pages project is kept, unused, as a rollback target: pointing the DNS record back at it restores the previous host.
- `legal.undersight.ai` must resolve (hosts the privacy policy).

### Post-Deploy Verification

1. `curl -s https://undersight.ai/healthz` returns `ok`
2. Visit `https://undersight.ai` and confirm content loads
3. Check dark mode (toggle OS setting)
4. Check mobile layout (resize or use device)
5. Verify all images load (solutions, blog, OG image)
6. "Book a Discovery Call" opens https://cal.com/adriany/quick-connect, and `/book` redirects there
7. "Sign In" goes to `https://app.underchat.ai/login`
8. `curl -H "Accept: text/markdown" https://undersight.ai/` returns markdown
9. Check `https://undersight.ai/robots.txt` and `https://undersight.ai/llms.txt`
10. Test the OG image by pasting the URL into LinkedIn or Twitter share preview tools

---

## Troubleshooting

### Content Not Loading

**Symptom**: Hero shows the pen nib loading animation with "Loading content..."

**Cause**: The page is the unbuilt `index.html`, whose `loadContent()` still calls `fetch('/api/content')`. Nothing answers that path.

**Fix**: Serve `dist/` (`python3 build.py && node serve.mjs`). If the deployed site shows it, check the Railway build log for a `build.py` error such as "Could not find loadContent() function".

### Images Missing

**Symptom**: Empty gray boxes where images should appear.

**Causes**:
1. The file is missing from `images/files/`
2. The `url` in the entity's `files` entry does not match the file name

**Fix**: Verify the file exists at the referenced path. Check the browser console for 404 errors.

### Dark Mode Problems

**Symptom**: Colors look wrong, text invisible, or elements don't change in dark mode.

**Causes**:
1. Hardcoded hex values bypassing the token system
2. Missing dark mode override for a semantic alias in `tokens.css`
3. The `rgba()` values in `main.css` (header background) using hardcoded color channels

**Fix**: Search for raw hex values in `main.css` and replace with token variable references. Check that all semantic aliases have dark mode overrides in the `@media (prefers-color-scheme: dark)` block.

### Favicon Not Loading

**Symptom**: Browser tab shows generic icon.

**Fix**: Ensure all favicon files exist and the cache-busting query parameter (`?v=2`) is present in the `<link>` tags. Clear browser cache.

### Build Script Fails

**Symptom**: `build.py` exits with an error.

**Common causes**:
- JSON syntax error in `content/content.json`: check it with `python3 -m json.tool content/content.json > /dev/null`
- "Could not find loadContent() function": the function signature in `index.html` changed. Update `_extract_function()` in `build.py`.
- Security verification failures: the output lists each `FAIL` with file and line. Common cause: a `/api/` string in content or markup.

### Site Shows the Under-Construction Page

**Cause**: `Site Config` has `**Production Mode:** under-construction`.

**Fix**: Set it to `live` and ship the change.

---

## Brand Rules Checklist

Before publishing any content update, verify:

- [ ] "undersight" is always lowercase (never "Undersight" or "UNDERSIGHT")
- [ ] "underchat" is always lowercase (never "Underchat" or "UNDERCHAT")
- [ ] No use of "merchant" (use "business owner", "applicant", or "client")
- [ ] No use of "SMB" (use "small business")
- [ ] No em-dashes in copy
- [ ] Amber Rust (#C97A54) appears only on CTAs, active states, section labels, and interactive elements
- [ ] No decorative use of Amber Rust (no background fills, no non-interactive borders)
- [ ] Inter font has OpenType features `cv01`, `ss03` applied
- [ ] UI weight is `510` (not 500) for buttons, nav, labels, form fields
- [ ] No hardcoded hex values in CSS (all through token variables)
- [ ] Content does not reference "specialty insurance" or insurance-specific terms (the product is for private credit)
- [ ] No "underchat" branding in customer-facing content (use "undersight")
- [ ] Stats have disclaimers or qualifiers ("Based on measured outcomes across active customer deployments")
- [ ] Sign-in URL points to production (not staging)
- [ ] Email addresses are consistent (use `contact@undersight.ai` unless specific to a person)
