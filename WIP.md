# undersight.ai -- Work in Progress

Last updated: 2026-05-14

Use this as a session entry point. Each item has context, effort, affected files, and dependencies so you can pick up where the last session left off.

---

## P0 -- Ship Blockers

These must be fixed before any prospect or investor sees the site.

### 1. Production deployment (DNS, CNAME, hosting)

The site is not live at undersight.ai. The dev server runs locally via `undersight-serve.py` and `build.py` generates a static `dist/` directory, but no hosting is configured.

- **What to do:** Configure hosting (Cloudflare Pages, Vercel, or Netlify), set up CNAME for `undersight.ai`, deploy `dist/` contents, verify SSL
- **Effort:** Medium
- **Files:** `dist/`, DNS provider, hosting platform config
- **Dependencies:** All other P0 items should be fixed first so the deployed site is clean
- **Ref:** Task #23 (completed planning but not execution)

### 2. Staging URL leak -- "Sign In" links point to `staging.app.underchat.ai`

Both desktop and mobile "Sign In" buttons hardcode `https://staging.app.underchat.ai/login`. This exposes the staging environment and the internal `underchat` brand name to visitors.

- **What to do:** Replace both Sign In `href` values with the production URL. Update JS to patch the mobile link from Fibery config too (currently only patches desktop). If no production sign-in exists yet, remove the Sign In button or link to a waitlist page.
- **Effort:** Quick
- **Files:** `index.html` (lines 112, 122), JS `renderContent` function
- **Dependencies:** Production auth URL must exist (Clerk integration)
- **Ref:** ADVERSARIAL-REVIEW P0-2

### 3. Blog content references wrong industry

Two blog posts reference "specialty insurance," "carriers," and "loss runs" -- terminology from a different vertical than the homepage's "alternative finance" positioning. A visitor reading the blog after the homepage will notice this immediately.

- **What to do:** Edit the Fibery blog entities: replace "specialty insurance" with "alternative finance," "carrier" with "funder," "loss runs" with "bank statements" or "position schedules"
- **Effort:** Medium (content editing, not code)
- **Files:** Fibery CMS entities: `Blog - Why AI underwriting is not about replacing underwriters`, `Blog - The RFI bottleneck`
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P0-4

### 4. "underchat" brand name in customer-facing blog content

Two blog posts use "underchat" (the internal product name) instead of "undersight." Customers should never see "underchat."

- **What to do:** Find/replace in Fibery: "underchat Co-pilot" -> "undersight Copilot", "underchat enriched" -> "undersight enriched"
- **Effort:** Quick
- **Files:** Fibery CMS entities: `Blog - Building an underwriting copilot`, `Blog - How Chat Advance funded a declined deal in 5 minutes`
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P0-5

### 5. Hardcoded hex colors break dark mode

`main.css` has `#fff` in the case study section and `rgba()` with raw color values in the header backdrop. These do not adapt in dark mode.

- **What to do:** Replace `color: #fff` with `var(--color-on-accent)` in `.case-study-graphic` and `.cs-num`. For the header backdrop `rgba(255, 255, 255, 0.92)` / `rgba(26, 29, 33, 0.92)`, define `--color-header-backdrop` tokens in light/dark blocks
- **Effort:** Quick
- **Files:** `css/main.css` (lines 55, 58, 615, 629)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P0-3, CRITIQUE-AUDIT CSS section

---

## P1 -- High Impact

Should fix soon. These noticeably improve quality but are not blocking launch.

### 6. Replace fake-text solution images (cop3, rfi3)

Two solution screenshots (`cop3.png` and `rfi3.png`) still contain placeholder/fake text that will look unprofessional to prospects.

- **What to do:** Regenerate these images with real product UI text, or use the design skills (`/frontend-design` + `skills/png-export`) to produce new screenshots. WebP variants also need regeneration.
- **Effort:** Medium
- **Files:** `images/solutions/cop3.png`, `images/solutions/cop3.webp`, `images/solutions/rfi3.png`, `images/solutions/rfi3.webp`
- **Dependencies:** Access to product UI or mock data
- **Ref:** Task #26 (marked completed but images may still need QA)

### 7. Stats bar claims are unattributed

"71% reduction in deal time," "22% more booked receivables," and "650 bps loss ratio reduction" appear with only an 11px disclaimer. Enterprise fund managers will push back on unattributed stats.

- **What to do:** Add specificity: "across N deployments since [month]" or "based on Chat Advance pilot data." Add asterisk + footnote. Reconcile the 30% claim in "How it works" with the 71% in the stats bar.
- **Effort:** Quick (content change)
- **Files:** `index.html` (stats-bar section, line ~225-230)
- **Dependencies:** Kyle to confirm approved phrasing
- **Ref:** ADVERSARIAL-REVIEW P1-1, CRITIQUE persona 1

### 8. Docs page is a dead end

Clicking "Docs" shows a Clerk sign-in gate backed by a `confirm()` dialog. Behind it are placeholder cards with no links and no content. A developer who finds the Docs link will bounce.

- **What to do:** Either (a) populate with real API documentation behind Clerk auth, (b) replace with a "coming soon" page with email capture, or (c) remove "Docs" from the nav until ready
- **Effort:** Large (if building real docs), Quick (if removing/placeholder)
- **Files:** `index.html` (`page-docs` section), nav links
- **Dependencies:** Clerk auth integration (Task #36 adjacent), actual API reference content
- **Ref:** CRITIQUE persona 3 (developer score 4/10 on docs findability)

### 9. Blog images are PNG (WebP exists but unused)

Blog and solution images are served as PNG. WebP versions exist in the same directories but the HTML references only `.png` files. This is ~2-3MB of unnecessary weight.

- **What to do:** Update `BLOG_IMAGES` and `SOLUTION_IMAGES` maps in `index.html` JS to reference `.webp` files. Add `<picture>` elements with PNG fallback for older browsers. Update `SOLUTION_NARRATIVES` image paths.
- **Effort:** Medium
- **Files:** `index.html` (JS image maps around lines 447-475), `build.py` (if it transforms image paths)
- **Dependencies:** None -- WebP files already generated (Task #30)
- **Ref:** CRITIQUE-AUDIT P2-11

### 10. No customer logos, team section, or social proof

Trust signals scored 5/10 in the critique. No customer logos, no team page, no named testimonials, no SOC 2 badge, no investor logos. For enterprise fintech, this is table stakes.

- **What to do:** Add a "Trusted by" logo bar (even 2-3 logos). Add a minimal "Founded by" section with LinkedIn link. The Chat Advance logo was planned but not yet added.
- **Effort:** Medium
- **Files:** `index.html` (new section after stats bar or before CTA), `css/main.css` (new styles), `images/` (logo assets)
- **Dependencies:** Chat Advance logo asset, permission to use customer names
- **Ref:** Task #36, CRITIQUE dimension 9

### 11. Chat Advance logo and Macy badge not added

The case study references Chat Advance but has no logo. The AI intake agent "Macy" is mentioned but has no visual identity on the page.

- **What to do:** Add Chat Advance logo to the case study graphic section. Add Macy badge/avatar near intake agent references.
- **Effort:** Quick (once assets exist)
- **Files:** `index.html` (case study section), `images/` (new assets)
- **Dependencies:** Logo/badge assets need to be created or obtained
- **Ref:** Task #36

### 12. Keyboard accessibility failures

Three types of non-focusable interactive elements: `.sol-row-link` (span + onclick), `.blog-card` (div + onclick), nav dropdown (no keyboard open/close). These are invisible to keyboard and screen reader users.

- **What to do:** Change `<span class="sol-row-link" onclick="...">` to `<a>` or `<button>`. Add `tabindex="0"`, `role="button"`, and keydown handlers to blog cards. Add Enter/Space/Escape handling to nav dropdown.
- **Effort:** Medium
- **Files:** `index.html` (JS template generation in `renderContent`), `css/main.css` (ensure focus styles cover new elements)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P1-6, CRITIQUE-AUDIT keyboard accessibility

### 13. Theme toggle broken for light-mode users

The `toggleTheme()` function only toggles `theme-light` class. For users whose OS is in light mode, this does nothing. There is no `theme-dark` class defined.

- **What to do:** Implement proper toggle: add a `theme-dark` class with all dark overrides (mirroring the `prefers-color-scheme: dark` block), store preference in `localStorage`, toggle between `theme-light` and `theme-dark`
- **Effort:** Medium
- **Files:** `css/tokens.css` (add `html.theme-dark` block), `index.html` (rewrite `toggleTheme()`)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P1-5

### 14. Email address inconsistency

Homepage CTA shows `contact@undersight.ai` but JS-generated solution page CTAs hardcode `contact@undersight.ai` separately. The Fibery Site Config is the intended source of truth but not all instances pull from it.

- **What to do:** Make all email references use the Fibery Site Config value, or update all hardcoded instances to match
- **Effort:** Quick
- **Files:** `index.html` (CTA sections, solution page template in JS)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P1-3

### 15. Back button navigation needs testing

The SPA uses hash-based routing. Browser back/forward behavior may be inconsistent. Solution detail pages have no back link or breadcrumb.

- **What to do:** Test all navigation paths: home -> solution -> back, home -> blog -> post -> back, deep-link to hash -> back. Add back links to solution detail pages. Consider adding `popstate` event listener for proper history handling.
- **Effort:** Medium
- **Files:** `index.html` (navigation JS, solution page template)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P1-7

### 16. Contact page is orphaned

The contact page exists (`page-contact`) but no navigation link points to it. The only way to reach it is `navigate('contact')` in the console.

- **What to do:** Either add "Contact" to the nav bar, or remove the page entirely and rely on the CTA sections and Calendly links throughout the site
- **Effort:** Quick
- **Files:** `index.html` (nav section, or remove `page-contact`)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P1-2

---

## P2 -- Nice to Have

Polish items for future iterations.

### 17. Wire up analytics/tracking

No analytics on the site. Cannot measure traffic, conversion (discovery call clicks), or engagement.

- **What to do:** Add privacy-respecting analytics (Plausible, Fathom, or Cloudflare Web Analytics). Track: page views, CTA clicks, blog reads, time on page.
- **Effort:** Quick (script tag + dashboard setup)
- **Files:** `index.html` (script in head), `build.py` (preserve in static build)
- **Dependencies:** Choose analytics provider, update privacy policy

### 18. Clerk auth integration for Docs

The Docs page currently uses a `confirm()` dialog to simulate Clerk authentication. Production needs real Clerk integration.

- **What to do:** Add Clerk JS SDK, implement sign-in flow, gate docs content behind auth, handle session state
- **Effort:** Large
- **Files:** `index.html` (docs section, head scripts), possibly a new `docs/` directory for actual content
- **Dependencies:** Clerk account setup, auth URL (relates to P0 #2)

### 19. Market claim needs qualification

"$20B annual volume across 250 originators" reads ambiguously -- could be mistaken for undersight's volume rather than the addressable market.

- **What to do:** Rephrase to "in a $20B annual market with over 250 originators" or similar. Add source citation if available.
- **Effort:** Quick
- **Files:** `index.html` (line ~237)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P1-8

### 20. Remove unused hero.png

`images/hero.png` (991KB) exists in the images directory but is not referenced anywhere in the HTML. Dead weight.

- **What to do:** Delete `images/hero.png`. Verify it is not referenced in `build.py` or any other file.
- **Effort:** Quick
- **Files:** `images/hero.png`
- **Dependencies:** None
- **Ref:** CRITIQUE-AUDIT P2-10

### 21. Clean up duplicate CSS files

`css/palette.css` and `css/fonts.css` duplicate token definitions from `css/tokens.css`. They are not linked in the HTML but are served statically and could cause confusion.

- **What to do:** Verify these files are truly unused, then delete them. If any code references them, consolidate into `tokens.css`.
- **Effort:** Quick
- **Files:** `css/palette.css`, `css/fonts.css`
- **Dependencies:** Verify no references in build.py or other tooling
- **Ref:** CRITIQUE-AUDIT technical audit section 1

### 22. Add `<picture>` elements for responsive images

Solution and blog images should use `<picture>` with `<source type="image/webp">` and `<img>` PNG fallback for proper progressive enhancement.

- **What to do:** Update JS template rendering to emit `<picture>` elements instead of plain `<img>` tags
- **Effort:** Medium
- **Files:** `index.html` (JS rendering functions)
- **Dependencies:** WebP images must exist (they do)

### 23. Intermediate breakpoints (tablet)

Only one breakpoint at 768px. Between 768px-1024px, some layouts (case study, solution rows) may look cramped.

- **What to do:** Add media queries at ~1024px for tablet landscape. Test on iPad dimensions.
- **Effort:** Medium
- **Files:** `css/main.css`
- **Dependencies:** None
- **Ref:** CRITIQUE dimension 8

### 24. JSON-LD structured data enhancements

Missing: `logo` property on Organization, `sameAs` for social profiles, `url` on Offer entities, more precise `foundingDate`.

- **What to do:** Add `"logo": "https://undersight.ai/images/brand/logo-horizontal-line-primary.svg"`, `"sameAs": ["https://linkedin.com/company/undersight-ai"]`, and `"url"` to each Offer.
- **Effort:** Quick
- **Files:** `index.html` (JSON-LD blocks in head)
- **Dependencies:** None
- **Ref:** CRITIQUE-AUDIT section 8

### 25. Verify legal.undersight.ai is live

The footer Privacy Policy links to `https://legal.undersight.ai`. If this subdomain is not configured, the link is dead.

- **What to do:** Check if the URL resolves. If not, either set up the subdomain or host the privacy policy at `undersight.ai/privacy`.
- **Effort:** Quick (if redirecting) / Medium (if creating policy page)
- **Files:** DNS config, possibly new `privacy.html`
- **Dependencies:** Legal content
- **Ref:** ADVERSARIAL-REVIEW P2-13

### 26. `footerPrivacy` null reference in JS

The JS references `document.getElementById('footerPrivacy')` but the element has no `id="footerPrivacy"` attribute. Silent null reference.

- **What to do:** Add `id="footerPrivacy"` to the privacy link `<a>` in the footer, or remove the JS reference.
- **Effort:** Quick
- **Files:** `index.html` (footer section, renderContent JS)
- **Dependencies:** None
- **Ref:** CRITIQUE-AUDIT console errors section

### 27. Extend prefers-reduced-motion coverage

The media query covers scroll reveals and hover transforms but misses the hero bar draw animation in some edge cases, and JS-triggered page transitions.

- **What to do:** Audit all `animation` and `transition` properties. Ensure the reduced-motion block disables everything.
- **Effort:** Quick
- **Files:** `css/main.css` (prefers-reduced-motion block)
- **Dependencies:** None
- **Ref:** ADVERSARIAL-REVIEW P2-10

### 28. Docs cards are non-interactive

The docs grid cards have `cursor: pointer` and hover effects but no `onclick` or `href`. Clicking them does nothing.

- **What to do:** Either make them link to future doc sections, or remove pointer cursor and hover from `.card` when used in the docs context.
- **Effort:** Quick
- **Files:** `index.html` (page-docs section), `css/main.css` (.card styles)
- **Dependencies:** Docs content strategy
- **Ref:** ADVERSARIAL-REVIEW P2-7

---

## P3 -- Wishlist

Aspirational items for future iterations.

### 29. Comparison table for solutions

An ops leader evaluating all three products has to click into each detail page individually. A side-by-side feature matrix would help.

- **What to do:** Add a comparison section to the home page or a dedicated `/compare` route
- **Effort:** Medium
- **Files:** `index.html` (new section), `css/main.css` (table styles)
- **Dependencies:** Feature list finalization

### 30. SPA routing for SEO

Hash-based routing (`#blog`, `#underscore`) is not crawlable by search engines. Blog posts in particular would benefit from real URLs.

- **What to do:** Consider migrating to a static site generator (Astro, 11ty) or implementing server-side rendering for blog posts. Alternatively, use `build.py` to generate individual HTML pages per blog post.
- **Effort:** Large
- **Files:** Architecture-level change
- **Dependencies:** Hosting that supports multiple routes

### 31. About/Team page

No team page exists. Trust signals scored 5/10. A minimal "Founded by [name]" section with LinkedIn link would help.

- **What to do:** Create a team section or page with founder bio, company mission, and optional advisor/investor mentions
- **Effort:** Medium
- **Files:** `index.html` (new page section), `images/` (headshots)
- **Dependencies:** Photo assets, approved bios

### 32. Pricing page or spec sheet

Operations leaders evaluating vendor fit need pricing, SLA, data residency, and integration requirements. Currently all roads lead to "Book a Discovery Call."

- **What to do:** Add a pricing page with tiers or a downloadable one-pager/spec sheet
- **Effort:** Large
- **Files:** New page or downloadable PDF
- **Dependencies:** Pricing strategy finalization

### 33. Second case study (direct fund deployment)

The Chat Advance case study is marketplace-focused. A fund manager may not see themselves in it.

- **What to do:** Create a case study for direct fund deployment use case
- **Effort:** Large (requires customer data/permission)
- **Files:** Fibery CMS, `index.html` (case study section)
- **Dependencies:** Customer willing to be referenced

### 34. Blog image error handling

Blog thumbnails use CSS `background-image`. If the image fails to load, the user sees an empty gray box.

- **What to do:** Switch to `<img>` elements with `onerror` fallback, or add fallback text/icon in the background
- **Effort:** Quick
- **Files:** `index.html` (blog rendering JS)
- **Dependencies:** None

### 35. Nav dropdown keyboard support

The solutions dropdown opens on hover only. Keyboard users cannot open/close it.

- **What to do:** Add Enter/Space to open, Escape to close, arrow keys to navigate items
- **Effort:** Medium
- **Files:** `index.html` (JS), `css/main.css` (focus states for dropdown items)
- **Dependencies:** None

### 36. Add `theme-color` meta tag to HTML

Currently only in `manifest.json`. Adding `<meta name="theme-color">` improves browser chrome coloring.

- **What to do:** Add `<meta name="theme-color" content="#23262C">` to `<head>` with a dark mode variant
- **Effort:** Quick
- **Files:** `index.html`
- **Dependencies:** None

---

## Quick Reference: What to Do Next

If picking this up in a new session, the recommended order is:

1. **Fix P0 #2-5** (quick content/code fixes) -- 30 min total
2. **Fix P1 #7** (stats attribution) -- 10 min, content decision
3. **Fix P1 #12** (keyboard a11y) -- 30 min
4. **Fix P1 #9** (WebP images) -- 20 min
5. **Deploy** (P0 #1) -- depends on hosting choice
6. **Run test suite:** `bash tests/test-suite.sh` to validate

The test suite at `tests/test-suite.sh` validates most of these items automatically. Run it against `localhost:8088` after each batch of fixes.
