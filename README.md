# undersight.ai Website

Static marketing site for undersight. Content managed via Fibery CMS.

## Quick Start (Development)

```bash
cd undersight/
python3 undersight-serve.py          # http://localhost:8088
```

The dev server proxies Fibery content and serves all static files. Content updates in Fibery appear on page refresh.

## Build for Production

```bash
python3 build.py                     # outputs to dist/
python3 build.py --verify            # build + security check
```

The build script:
1. Fetches all content from Fibery API
2. Bakes it into a static `index.html` (no runtime API calls)
3. Copies all static assets (CSS, images, favicons, robots.txt, etc.)
4. Runs security verification (no tokens, secrets, or Fibery URLs in output)

Output: `dist/` directory ready to deploy to any static host.

## Deploy

Upload `dist/` contents to your static host. Options:
- **Cloudflare Pages**: `npx wrangler pages deploy dist/`
- **Vercel**: `npx vercel dist/`
- **Netlify**: Drag `dist/` to netlify.com
- **GitHub Pages**: Push `dist/` to `gh-pages` branch

### DNS Requirements
- `undersight.ai` A/CNAME record pointing to your host
- `legal.undersight.ai` must resolve (privacy policy)
- HTTPS must be enforced (host handles this)

## Updating Content

1. Edit entities in [Fibery](https://subscript.fibery.io) > Website > Pages
2. Entity naming determines page rendering:
   - `Home - Hero` → Hero headline and subtitle
   - `Home - Who We Serve`, `Home - Metrics`, `Home - How It Works` → top homepage sections
   - `Home - Case Study: *`, `Home - Testimonial`, `Home - CTA` → lower homepage sections
   - `Solutions - *` → Solution pages (underscore, RFI, Copilot)
   - `Blog - *` → Blog posts rendered on the site
   - `Site Config` → Sign-in URL, privacy URL, email, copyright
   - `Contact Page` → Contact/CTA section text
3. Run `python3 build.py` to regenerate static files
4. Deploy `dist/`

## File Structure

```
undersight/
  index.html              Main SPA (dev version, fetches from API)
  undersight-serve.py     Dev server (Fibery proxy, :8088)
  build.py                Static site generator
  favicon.svg             Vector favicon
  favicon-*.png           Raster favicons (16/32/180/192/512)
  apple-touch-icon.png    iOS home screen icon
  manifest.json           PWA metadata
  robots.txt              Crawler permissions (all AI agents allowed)
  sitemap.xml             Page listing
  llms.txt                AI agent-readable site summary
  css/
    tokens.css            Design system tokens
    main.css              Component styles
  images/
    brand/                Logo SVGs
    solutions/            Solution page illustrations
    blog/                 Blog post images
    og-image.png          Social sharing image (1200x630)
  dist/                   Build output (deploy this)
```

## Brand Rules

- "undersight" always lowercase (company name)
- "underchat" always lowercase (product/platform name)
- Never use "merchant" (say "business owner", "applicant", "client")
- Never use "SMB" (say "small business")
- Amber Rust (#C97A54) for CTAs and interactive elements only
- Inter for headings/UI, DM Sans for body text

## Security

- Fibery API token stored in macOS Keychain (never in code)
- Production build contains zero API calls, tokens, or Fibery references
- `build.py --verify` confirms no secrets in output
- File proxy uses opaque IDs (not raw Fibery secrets)
