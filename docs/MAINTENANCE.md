# undersight.ai Website Maintenance Guide

## Updating Content

All website text content is managed in Fibery CMS. No code changes are needed for content updates.

### Fibery Workspace

- **Workspace**: `subscript.fibery.io`
- **Database**: `Website / Pages`
- **Access**: Requires a Fibery account with access to the workspace

### Entity Naming Conventions

Entity names determine how content is routed and rendered. Follow these naming patterns exactly:

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
| `Site Config` | Global settings: Sign In URL, Privacy Policy URL, Contact Email, Copyright |
| `Contact Page` | Contact section headline and description |
| `Solutions - underscore` | underscore solution page |
| `Solutions - underchat agent` | underchat agent solution page (formerly `Solutions - Agentic Client RFI`) |
| `Solutions - AI Underwriting Copilot` | Copilot solution page |
| `Blog - [Title]` | Blog post (the part after `Blog - ` becomes the display title) |

### Content Format

Each entity's Description field uses a markdown-like format:

```markdown
# Title Goes Here

**Date:** 2026-05-01
**Excerpt:** Short preview text for blog cards
**Tag:** Risk Scoring

---

Body content starts after the separator.
Supports **bold**, [links](https://example.com), and paragraph breaks.
```

- The `# Title` becomes the rendered title (or page heading)
- `**Key:** Value` pairs become metadata (Date, Excerpt, Tag, etc.)
- Everything after `---` is the body content
- Paragraphs are separated by blank lines

### Workflow: Edit Existing Content

1. Log in to [Fibery](https://subscript.fibery.io)
2. Navigate to Website > Pages
3. Find the entity by name
4. Edit the Description field
5. For dev preview: refresh `localhost:8088` (content refreshes every 5 seconds)
6. For production: run `python3 build.py` and deploy `dist/`

---

## Adding a New Blog Post

1. **Create entity in Fibery**: Name it `Blog - [Your Title]`. The title after `Blog - ` is what displays on the site.

2. **Write content** in the Description field:
   ```markdown
   # Your Blog Post Title

   **Date:** 2026-05-15
   **Excerpt:** A one-sentence summary that appears on the blog card.

   ---

   First paragraph of your blog post.

   Second paragraph with **bold text** and a [link](https://example.com).

   ## Subheading

   More content under the subheading.
   ```

3. **Add an image** (optional): Attach an image file to the entity's Assets. The first image attachment will be used as the blog card thumbnail. For best results, use a 1536x1024 PNG in the monochrome editorial illustration style.

4. **Map the image locally** (if using a local image instead of Fibery attachment): Add an entry to the `BLOG_IMAGES` object in `index.html`:
   ```javascript
   const BLOG_IMAGES = {
     // ... existing entries ...
     'Your Blog Post Title': 'images/blog/your-image.png',
   };
   ```
   Place the image file in `images/blog/`.

5. **Preview**: Run the dev server and navigate to the Blog page.

6. **Build and deploy**:
   ```bash
   python3 build.py --verify
   # Deploy dist/
   ```

---

## Adding a New Solution Page

Adding a new solution page requires both Fibery content and code changes:

1. **Create the Fibery entity**: Name it `Solutions - [Product Name]`.

2. **Add to `SOLUTION_MAP`** in `index.html`:
   ```javascript
   const SOLUTION_MAP = {
     // ... existing entries ...
     'Solutions - [Product Name]': { page: 'newproduct', icon: 'N', tag: 'Category' },
   };
   ```

3. **Add the page section** in `index.html`:
   ```html
   <section class="page" id="page-newproduct"></section>
   ```

4. **Add solution images** (optional): Create 3 narrative images and add to `SOLUTION_IMAGES` and `SOLUTION_NARRATIVES`:
   ```javascript
   SOLUTION_IMAGES['newproduct'] = 'images/solutions/new1.png';
   SOLUTION_NARRATIVES['newproduct'] = [
     { img: 'images/solutions/new1.png', title: 'Step 1', desc: 'Description...' },
     { img: 'images/solutions/new2.png', title: 'Step 2', desc: 'Description...' },
     { img: 'images/solutions/new3.png', title: 'Step 3', desc: 'Description...' },
   ];
   ```

5. **Update footer links** in `index.html`:
   ```html
   <a href="#newproduct" onclick="event.preventDefault();navigate('newproduct')">[Product Name]</a>
   ```

6. **Update `sitemap.xml`**: Add the new solution page URL.

7. **Update `llms.txt`**: Add the product description and link.

8. **Update JSON-LD structured data**: Add a new Offer entry in the Organization schema.

---

## Modifying the Design System

The design system has three files that must stay in sync:

| File | Location | Purpose |
|------|----------|---------|
| `DESIGN.md` | Agent workspace root | Source of truth specification |
| `tokens/tokens.css` | Agent workspace `tokens/` | CSS custom properties |
| `tokens/tokens.json` | Agent workspace `tokens/` | Design Tokens Community Group format |

The live site uses `css/tokens.css` at `/Users/kyle/Documents/underchat/undersight/undersight/css/tokens.css`.

### Workflow: Change a Token Value

1. Update the value in `DESIGN.md` (the specification)
2. Update the corresponding CSS custom property in `tokens/tokens.css`
3. Update the corresponding entry in `tokens/tokens.json`
4. Copy `tokens/tokens.css` to the site's `css/tokens.css`
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
   - Reference existing images in `images/blog/` and `images/solutions/` for style consistency

2. **Download and resize**:
   ```bash
   # Resize to web-appropriate dimensions (1024px longest side)
   sips -Z 1024 downloaded-image.png

   # Create WebP variant
   sips -s format webp downloaded-image.png --out downloaded-image.webp
   ```

3. **Place in correct directory**:
   - Solution images: `images/solutions/` (named `us1.png`, `rfi2.png`, `cop3.png`, etc.)
   - Blog images: `images/blog/` (named descriptively)

4. **Update code references** if adding new images (see adding blog post or solution page sections above).

---

## Running the Dev Server

### Prerequisites

- Python 3.x
- macOS with Keychain entry for Fibery token:
  ```bash
  security add-generic-password -s mcp-credentials -a fibery-undersight -w "YOUR_TOKEN"
  ```

### Start Server

```bash
cd /Users/kyle/Documents/underchat/undersight/undersight/
python3 undersight-serve.py          # Starts on http://localhost:8088
python3 undersight-serve.py 3000     # Custom port
```

### Server Behavior

- Serves all static files from the working directory
- Proxies `/api/content` to Fibery API (2 API calls: entity query + batch doc fetch)
- Proxies `/api/file/{opaque_id}` to Fibery file downloads
- Caches content for 5 seconds (configurable via `CACHE_TTL`)
- Only logs API requests (static file requests are silent)

### Content Refresh

Content is cached for 5 seconds. To see Fibery content changes:
- Wait 5 seconds and refresh the page, or
- Restart the dev server

---

## Building for Production

### Basic Build

```bash
cd /Users/kyle/Documents/underchat/undersight/undersight/
python3 build.py
```

### Build with Security Verification

```bash
python3 build.py --verify
```

This adds a full scan of `dist/` for leaked secrets, Fibery URLs, API endpoints, and UUIDs.

### What the Build Does

1. Retrieves Fibery API token from macOS Keychain
2. Fetches all content from Fibery (entities + documents + file metadata)
3. Creates clean `dist/` directory
4. Copies all static assets (CSS, images, favicons, robots.txt, etc.)
5. Downloads Fibery file attachments to `dist/images/files/`
6. Bakes content JSON directly into `loadContent()` in `index.html`
7. Strips Fibery references from markdown content
8. Writes final `dist/index.html`

### Build Output

The `dist/` directory contains everything needed for deployment. It is fully self-contained -- no runtime API calls, no server dependencies.

---

## Deploying

### Static Host Options

Upload the contents of `dist/` to any static hosting provider:

```bash
# Cloudflare Pages
npx wrangler pages deploy dist/

# Vercel
npx vercel dist/

# Netlify
# Drag dist/ to netlify.com

# GitHub Pages
# Push dist/ contents to gh-pages branch
```

### DNS Requirements

- `undersight.ai` A/CNAME record pointing to the static host
- `legal.undersight.ai` must resolve (hosts the privacy policy)
- HTTPS must be enforced (the host handles TLS)

### Post-Deploy Verification

1. Visit `https://undersight.ai` and confirm content loads
2. Check dark mode (toggle OS setting)
3. Check mobile layout (resize or use device)
4. Verify all images load (solutions, blog, OG image)
5. Test "Book a Discovery Call" links (should open Calendly)
6. Test "Sign In" links (should go to the correct app URL)
7. Check `https://undersight.ai/robots.txt` returns correct content
8. Check `https://undersight.ai/llms.txt` returns correct content
9. Test OG image by pasting URL into LinkedIn or Twitter share preview tools

---

## Troubleshooting

### Content Not Loading (Dev Server)

**Symptom**: Hero shows the pen nib loading animation with "Loading content..."

**Causes**:
1. Dev server not running: Start with `python3 undersight-serve.py`
2. Fibery API down or token expired: Check `security find-generic-password -s mcp-credentials -a fibery-undersight -w` returns a valid token
3. Fibery workspace URL changed: Verify `WORKSPACE = "subscript.fibery.io"` in `undersight-serve.py`
4. Network issue: Check that `https://subscript.fibery.io` is reachable

**Diagnosis**: Check the terminal running `undersight-serve.py` for API error messages.

### Content Not Loading (Production)

**Symptom**: Same loading animation on the deployed site.

**Cause**: The build likely failed to bake content. The `loadContent()` function still contains `fetch('/api/content')` instead of inline data.

**Fix**: Re-run `python3 build.py --verify` and check for errors. Ensure the `_extract_function()` parser correctly found and replaced `loadContent()`.

### Images Missing

**Symptom**: Empty gray boxes where solution or blog images should appear.

**Causes**:
1. Image files not in the correct directory
2. Image path mismatch in `SOLUTION_IMAGES`, `BLOG_IMAGES`, or `SOLUTION_NARRATIVES`
3. For Fibery-hosted images: file download failed during build (check build output for "SKIPPED" warnings)

**Fix**: Verify file exists at the referenced path. Check the browser console for 404 errors.

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
- "Could not retrieve Fibery token from macOS Keychain": Add the token with `security add-generic-password -s mcp-credentials -a fibery-undersight -w "TOKEN"`
- "Could not find loadContent() function": The function signature in `index.html` changed. Update the regex pattern in `_extract_function()`.
- "HTTP error" during Fibery fetch: Check network connectivity and token validity
- Security verification failures: Run with `--verify` for details. Common: leftover Fibery URLs in markdown content

### Theme Toggle Not Working

**Known limitation**: The toggle button only works for users whose OS is in dark mode. It adds `theme-light` class to force light mode. For light-mode OS users, the toggle has no visible effect because there is no `theme-dark` class. This is a known issue documented in the adversarial review.

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
