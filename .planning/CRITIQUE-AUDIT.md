# undersight.ai UX Critique & Technical Audit

**Date:** 2026-05-12
**File reviewed:** `/Users/kyle/Documents/underchat/undersight/undersight/dist/index.html`
**CSS reviewed:** `/Users/kyle/Documents/underchat/undersight/undersight/dist/css/main.css`

---

## Part 1: UX Critique

### Persona 1: Fund Manager (Jeremy)

| Question | Score | Notes |
|----------|-------|-------|
| Can I understand what undersight does within 5 seconds? | **7/10** | The headline "Manual underwriting can't scale. Agentic underwriting can." is sharp and establishes the problem/solution frame instantly. The subtitle "AI agents that intake, enrich, score, and monitor across the funding lifecycle" adds clarity. However, the word "agentic" may not resonate with non-technical fund managers. A term like "AI-powered" or "automated" would land faster. |
| Can I find the discovery call booking in under 10 seconds? | **9/10** | "Book a Discovery Call" is in the nav as a primary CTA button (amber rust, high contrast). It appears in nav, mobile menu, bottom CTA section, footer, and each solution detail page. Easy to find from any scroll position. |
| Do the stats feel credible? | **6/10** | "71% reduction in deal time," "22% more booked receivables," "650 bps loss ratio reduction" are bold claims. The disclaimer "Based on measured outcomes across active customer deployments" appears in 11px muted text below -- easy to miss. No named customer, no time period, no methodology link. A fund manager's CRO will push back on unattributed stats. Consider adding "across N deployments since [date]" or linking to a methodology page. |
| Would I share this site with my CRO? | **6/10** | The design quality would pass. The content is substantive (the whitepaper blog post on institutional capital is strong). But the "staging" Sign In URL (`staging.app.underchat.ai`) undermines credibility immediately. A CRO clicking "Sign In" and seeing a staging environment signals early-stage immaturity. The docs section also uses a `confirm()` dialog for simulated auth, which should never ship to production. |

**Persona 1 Average: 7.0/10**

---

### Persona 2: Operations Leader

| Question | Score | Notes |
|----------|-------|-------|
| Can I compare the three products? | **7/10** | The home page solutions section uses a clean horizontal layout with image + text for each product (underscore, Agentic Client RFI, AI Underwriting Copilot). Tags differentiate them (Risk Scoring, Client Intake, Copilot). However, there is no comparison table or feature matrix. An ops leader evaluating fit across products has to click into each detail page individually. A side-by-side comparison view would strengthen this. |
| Do the solution detail pages explain enough to evaluate fit? | **6/10** | Each detail page follows a narrative scroll pattern (3 steps with screenshots), plus a markdown body with prose. The content is clear but thin on specifics. No pricing, no integration requirements, no SLA information, no data residency details. An operations leader evaluating vendor fit needs this. The CTAs all funnel to a discovery call, which is appropriate for enterprise sales, but some self-serve spec sheet or one-pager download would help. |
| Is the case study convincing? | **7/10** | The Chat Advance case study is well-structured: problem (auto-declined deal), solution (agentic intake), result (two offers in 5 minutes). The embedded graphic with numbered steps and stats (24/7, 60s, $0, 2 offers) is visually effective. Weakness: it is a marketplace use case, not a fund use case. An operations leader at a fund may not see themselves in this story. Adding a second case study for direct fund deployment would strengthen credibility. |

**Persona 2 Average: 6.7/10**

---

### Persona 3: Developer

| Question | Score | Notes |
|----------|-------|-------|
| Can I find the docs? | **4/10** | "Docs" is in the main nav, which is good. But clicking it shows a lock gate with "Sign In to View Docs" that uses a browser `confirm()` dialog to simulate Clerk auth. In production this is Clerk-gated, but the current deployed version has zero actual documentation behind the gate -- just placeholder cards ("Getting Started," "underscore API," etc.) with no links, no content, no API reference. A developer who signs in will find nothing. This is a significant gap. |
| Is the API positioning clear? | **6/10** | The underscore solution page mentions "RESTful API with Python and Node.js SDKs" and "API-first integration." The JSON-LD structured data describes underscore as "API-first agentic and ML risk scoring." The positioning is present but scattered. There is no dedicated "For Developers" or "API" entry point. The docs gate creates a dead end. |
| Does the whitepaper demonstrate technical depth? | **8/10** | The "Unlocking Institutional Capital for Mid-Tier MCA Funds" blog post is genuinely strong. It references the Matthews framework, includes structured analysis tables, discusses ABS tranching and securitization pricing, and positions undersight as infrastructure rather than software. This would hold up in a technical diligence conversation. The markdown-to-HTML rendering handles tables, which is a good signal. |

**Persona 3 Average: 6.0/10**

---

### Dimension Scores (1-10)

| # | Dimension | Score | Notes |
|---|-----------|-------|-------|
| 1 | First impression / visual quality | **8/10** | Clean, professional, restrained. The Inter + DM Sans pairing works well. Amber rust accent is used sparingly and effectively. The hero gradient is subtle. No stock photos, no cluttered layout. Feels like a serious fintech site, not a template. |
| 2 | Clarity of value proposition | **7/10** | "Manual underwriting can't scale. Agentic underwriting can." is a strong positioning statement. The "How it works" timeline reinforces it. The three-product structure is clear. Deducted points because "agentic" is jargon and the subtitle could be punchier. |
| 3 | Information architecture | **6/10** | The SPA hash-routing works but has drawbacks: no real URL structure for SEO, sitemap entries are hash-based fragments (will not be crawled), and browser back/forward behavior may be inconsistent. The nav structure (Solutions dropdown, Docs, Blog) is logical. The home page flows well: hero > how it works > solutions > case study > stats > who we serve > CTA. Missing: About/Team page, Pricing page, a real developer portal. |
| 4 | Content quality and credibility | **7/10** | Blog posts are substantive and well-written. The whitepaper is genuinely detailed with external references (Edgar Matthews, Enova, Kapitus). The case study has concrete numbers. Deducted for: unattributed stats, no team bios, no named customers, no logos or social proof. For a company founded 7 months ago, the content punches above its weight. |
| 5 | Call-to-action effectiveness | **8/10** | "Book a Discovery Call" is the primary CTA, consistently placed: nav, bottom of home, each solution page, footer, contact page. Amber rust button is visually distinct. The secondary "Or email us at contact@undersight.ai" gives an alternative for people who avoid calendly. No pushy popups or interrupts. |
| 6 | Visual consistency | **7/10** | Token system is well-implemented. Inter for headings, DM Sans for body, JetBrains Mono for data. 510 weight for UI elements. Border-radius consistent. Amber rust reserved for CTAs and accents. Minor inconsistencies: some inline styles use hardcoded `#fff` and `#999` (see technical audit). The `fonts.css` and `palette.css` files duplicate some token definitions from `tokens.css` -- potential for drift. |
| 7 | Typography and readability | **8/10** | Type hierarchy is clear: 48px hero, 28px section heads, 18-20px card titles, 14-15px body. OpenType features (`cv01`, `ss03`) applied consistently. Line heights are generous (1.6-1.8 for body). Letter spacing tightened on display sizes. The DM Sans body text is legible and clean. One nitpick: the 11px muted labels are at the lower limit of readability. |
| 8 | Responsive design | **7/10** | Media queries at 768px handle mobile well: single column, adjusted padding, stacked cards. The mobile menu works. Solution rows stack vertically. The case study splits into stacked layout. Missing: intermediate breakpoints (tablet), fluid typography scaling, explicit touch target sizing (some links are small text without padding). |
| 9 | Trust signals | **5/10** | Significant gaps. No customer logos. No team page. No named testimonials. No security certifications (SOC 2, etc.). No "backed by" investor logos. The "staging" Sign In URL actively undermines trust. The privacy policy links to `legal.undersight.ai` (separate domain -- good). The LinkedIn link is present in the footer. For enterprise fintech selling to funds, trust signals are table stakes. This is the weakest dimension. |
| 10 | Overall "would I engage" factor | **7/10** | The site communicates competence and domain knowledge. The content demonstrates genuine understanding of alternative finance. The design is professional without being generic. The single-CTA focus (discovery call) is appropriate for enterprise sales. A qualified prospect would book the call. A tire-kicker would bounce -- which may be intentional. |

**Overall Dimension Average: 7.0/10**

---

## Part 2: Technical Audit

### 1. CSS Token Usage (No Hardcoded Hex)

**Result: PARTIAL PASS -- 4 issues**

`main.css` uses token variables extensively, but has these hardcoded values:

| File | Line | Value | Issue |
|------|------|-------|-------|
| `main.css:55` | `header` | `rgba(255, 255, 255, 0.92)` | Should use `rgba(var(--color-paper-white-rgb), 0.92)` or equivalent token |
| `main.css:58` | `header (dark)` | `rgba(26, 29, 33, 0.92)` | Hardcoded dark bg RGBA instead of token reference |
| `main.css:615` | `.case-study-graphic` | `color: #fff` | Should use `var(--color-on-accent)` or similar |
| `main.css:629` | `.cs-num` | `color: #fff` | Same issue |

Inline styles in `index.html` also use `#fff` (lines 612, 662) and `#999` (lines 666-668). These are JS-generated template literals, harder to tokenize but still a violation of the design system rule.

The `rgba()` values throughout `main.css` for shadows and overlays are acceptable -- CSS doesn't support `rgba(var(--token), alpha)` natively without color-mix or custom property decomposition. These are correctly using the brand color channel values.

**palette.css and fonts.css duplicate tokens from tokens.css** -- these files define overlapping `--color-*` and `--font-*` variables. This creates a maintenance risk where values could drift. Only `tokens.css` is the source of truth; `palette.css` and `fonts.css` appear to be legacy files that should either be removed or converted to pure utility class files.

---

### 2. Keyboard Accessibility

**Result: FAIL -- 3 issues**

| Issue | Severity | Location |
|-------|----------|----------|
| `.sol-row-link` is a `<span>` with `onclick` -- not keyboard focusable | P1 | Line 552 (JS template), home page solutions |
| `.blog-card` uses `div.onclick` -- not keyboard focusable, no role="button" | P1 | Line 608 (JS), blog grid |
| `.nav-dropdown-trigger` has no keyboard interaction for dropdown open/close | P2 | Lines 98-108, nav |

The `<span class="sol-row-link" onclick="navigate(...)">` elements are completely inaccessible to keyboard users. They need to be `<button>` or `<a>` elements with `tabindex="0"` and `keydown` handlers.

Blog cards are clickable `div` elements with no keyboard affordance. Need `tabindex="0"`, `role="button"`, and `keydown` handler for Enter/Space.

Focus states are properly defined (`:focus-visible` with amber rust outline), so elements that are focusable look correct.

---

### 3. Alt Text on Images

**Result: PASS (conditional)**

All `<img>` elements in the codebase use dynamic `alt` attributes set from content data:
- Solution images: `alt="${title}"` (line 544, 561)
- Blog hero images: `alt="${post.title}"` (line 672)
- SVG logos: have `role="img"` and `aria-label`/`<title>` elements

The logo SVGs in header and footer both have proper `role="img"`, `aria-label`, and `<title>` elements. This is correctly done.

Note: `images/hero.png` (991KB) exists in dist but is not referenced anywhere in the HTML. May be unused.

---

### 4. Console Errors (JS Analysis)

**Result: FAIL -- 2 issues**

| Issue | Severity | Location |
|-------|----------|----------|
| `_origNavigate` reference in `openCaseStudy()` fallback (line 706) should be `navigate` | P2 | The fallback `_origNavigate('blog')` is called if `_caseStudyPost` is null, but `_origNavigate` was reassigned before this code runs. While it still works (it references the original function), this is confusing. |
| `footerPrivacy` element referenced in JS (line 495) does not exist in HTML | P1 | `document.getElementById('footerPrivacy')` will return null. The privacy link in the footer is a plain `<a>` tag with no ID. This produces a silent null reference that would throw on `config['Privacy Policy URL']` being truthy. |

The content is currently inlined (not fetched from Fibery), so the `loadContent()` function does not make a network request. The `try/catch` handles render failures gracefully.

---

### 5. prefers-reduced-motion

**Result: PASS**

Lines 670-676 of `main.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal-stagger > .sol-row { opacity: 1; transform: none; transition: none; }
  .hero-bar { animation: none; width: 48px; }
  .page { transition: none; }
  .card, .blog-card, .btn-primary, .btn-ghost, .sol-row,
  .sol-row-img img, .serve-card { transition: none !important; transform: none !important; }
}
```

This correctly disables all animations and transitions when the user prefers reduced motion. Scroll reveals are disabled, the hero bar animation is removed, page transitions are disabled, and hover transforms are removed.

---

### 6. Dark Mode Token Swap

**Result: PASS with caveats**

`tokens.css` correctly implements dark mode via `@media (prefers-color-scheme: dark)` (lines 202-228), swapping all semantic aliases:
- Background: `--color-bg` swaps from paper white to dark bg (#1A1D21)
- Text: `--color-text` swaps from graphite-900 to white
- Borders: swap to `rgba(255, 255, 255, 0.1)`
- Shadows: deepen appropriately

`main.css` line 58 handles the header backdrop: `header { background: rgba(26, 29, 33, 0.92); }` -- this is a hardcoded dark mode override, acceptable for the transparency effect but ideally should use a token.

The `html.theme-light` override class (lines 232-248 in tokens.css, line 60 in main.css) correctly restores light mode when toggled manually.

**Caveat:** The `palette.css` file has its own `@media (prefers-color-scheme: dark)` block that overrides `--color-surface` and `--color-text-muted` with different semantic meanings than `tokens.css`. If both files are loaded, the cascade order could cause unexpected behavior. Since `tokens.css` is loaded first and `main.css` references its semantics, `palette.css` appears unused in production but is still served.

---

### 7. Meta Tags

**Result: PASS**

All required meta tags present:

| Tag | Status | Value |
|-----|--------|-------|
| `<title>` | Present | "undersight \| AI Underwriting for Alternative Finance" |
| `<meta name="description">` | Present | Good length (168 chars), keyword-rich |
| `<meta name="viewport">` | Present | Correct responsive settings |
| `<link rel="canonical">` | Present | https://undersight.ai |
| `og:type` | Present | "website" |
| `og:title` | Present | Matches page title |
| `og:description` | Present | Slightly different from meta desc (includes stats), good |
| `og:image` | Present | Points to /images/og-image.png (37KB, exists in dist) |
| `og:image:width/height` | Present | 1200x630 (correct OG dimensions) |
| `twitter:card` | Present | "summary_large_image" |
| `twitter:title` | Present | Matches |
| `twitter:description` | Present | Shorter version |
| `twitter:image` | Present | Same as OG image |

Missing but recommended: `twitter:site` (no Twitter handle), `og:locale`, `theme-color` meta tag (present only in manifest.json).

---

### 8. JSON-LD Structured Data

**Result: PASS with minor issues**

Two JSON-LD blocks present:

1. **Organization** (lines 32-64): Valid schema with name, url, description, foundingDate, contactPoint, and three Offer entities. The `industry` property is not a standard Schema.org property for Organization (should be a text description or use `naics`). The `slogan` property is valid.

2. **WebSite** (lines 66-74): Valid minimal schema.

Minor issues:
- `foundingDate: "2025-10"` -- Schema.org expects ISO 8601 format. "2025-10" is valid but "2025-10-01" would be more precise.
- No `logo` property on the Organization schema.
- No `sameAs` property for social profiles (LinkedIn is in the footer but not in structured data).
- Offer entities lack `url` properties linking to the solution pages.

---

### 9. Favicon Suite

**Result: PASS**

| Asset | Size | Status |
|-------|------|--------|
| `favicon.svg` | SVG | Present (392 bytes) |
| `favicon-16.png` | 16x16 | Present |
| `favicon-32.png` | 32x32 | Present |
| `apple-touch-icon.png` | 180x180 | Present |
| `favicon-180.png` | 180x180 | Present (duplicate of apple-touch-icon?) |
| `favicon-192.png` | 192x192 | Present (in manifest) |
| `favicon-512.png` | 512x512 | Present (in manifest) |
| `manifest.json` | -- | Present with correct icon references |

The HTML references SVG, 32px, 16px, and apple-touch-icon. The manifest.json references 192px and 512px. This covers all major platforms.

---

### 10. Security: No Secrets in dist/

**Result: FAIL -- 2 issues**

| Issue | Severity | Details |
|-------|----------|---------|
| Staging URL exposed | P1 | `https://staging.app.underchat.ai/login` appears twice in the HTML (nav Sign In link, mobile menu Sign In link). This exposes the staging environment URL to the public internet. Even if Clerk gates access, the URL itself reveals infrastructure details. |
| Fibery references in HTML comments | P3 | Comments like `<!-- populated from Fibery -->` (lines 105, 119, 324) reveal the CMS platform used. Low risk but unnecessary information disclosure. |

No API keys, tokens, or credentials found. No `.env` files. No Fibery API URLs (data is inlined, not fetched). The content data is embedded directly in the JS (line 636), which is the correct approach for a static build.

---

## Summary: Priority Issues

### P0 (Ship-blockers)

1. **Staging URL in production**: Replace `https://staging.app.underchat.ai/login` with the production sign-in URL.
2. **`footerPrivacy` null reference**: The JS references `document.getElementById('footerPrivacy')` but the element has no ID. Will throw if `config['Privacy Policy URL']` is truthy.

### P1 (Fix before sharing with prospects)

3. **Keyboard accessibility**: `sol-row-link` spans and `blog-card` divs with `onclick` are not keyboard-accessible. Use `<button>` or `<a>` elements.
4. **Docs page is a dead end**: The Clerk gate leads to placeholder cards with no content. Either populate with real docs or remove the Docs nav link until ready.
5. **Trust signals**: Add customer logos, team photos, or at minimum a "Founded by [name]" section.
6. **Stats attribution**: Add specificity to the metric claims (customer count, time period, methodology).

### P2 (Polish before launch)

7. **Hardcoded colors**: Replace `#fff` and `#999` in main.css and inline JS with token variables.
8. **Remove duplicate CSS files**: `palette.css` and `fonts.css` duplicate tokens -- consolidate or remove.
9. **Dropdown keyboard support**: Nav dropdown needs Enter/Space/Escape keyboard handlers.
10. **Hero image unused**: `images/hero.png` (991KB) is in dist but unreferenced -- remove to save bandwidth.
11. **Blog file images are large**: Three blog illustration PNGs in `images/files/` are 2MB+ each. Consider compressing or serving WebP versions (WebP versions exist for solution and blog images but are not used in the HTML).
12. **Remove Fibery comments**: Strip `<!-- populated from Fibery -->` from production HTML.

### P3 (Nice to have)

13. **Intermediate breakpoints**: Add tablet breakpoint (768-1024px).
14. **JSON-LD enhancements**: Add `logo`, `sameAs`, and Offer `url` properties.
15. **Add `<meta name="theme-color">` to HTML** (currently only in manifest.json).
16. **SPA routing**: Consider whether hash-based routing hurts SEO for blog content. Each blog post could benefit from a real URL for search indexing.

---

## Scorecard Summary

| Category | Score |
|----------|-------|
| Persona 1: Fund Manager | 7.0/10 |
| Persona 2: Operations Leader | 6.7/10 |
| Persona 3: Developer | 6.0/10 |
| **Persona Average** | **6.6/10** |
| Dimension Average | 7.0/10 |
| Technical Audit Pass Rate | 6/10 checks passed cleanly |
| **Overall Readiness** | **6.8/10 -- needs P0 and P1 fixes before prospect-facing use** |
