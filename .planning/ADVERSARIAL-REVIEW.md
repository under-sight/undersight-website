# Adversarial Review: undersight.ai Website

**Date:** 2026-05-12
**Reviewer:** Claude (automated adversarial audit)
**Scope:** `/Users/kyle/Documents/underchat/undersight/undersight/index.html`, Fibery API content at `localhost:8088/api/content`, all linked CSS

---

## P0 -- Critical

### P0-1: Missing `--color-text-muted` token causes invisible body text

**File:** `index.html` line 18; `css/tokens.css` (entire file)

The inline CSS defines `--mid: var(--color-text-muted)` (line 18), and `--mid` is used for subtitle text, paragraph text, card descriptions, and stat labels throughout the page. However, `--color-text-muted` is **never defined in `css/tokens.css`**, which is the only CSS file the page loads (line 11). The token exists in `css/palette.css` (line 31) but that file is not linked.

This means `--mid` resolves to nothing. Text styled with `color: var(--mid)` will inherit from the parent, which happens to be `var(--dark)` / `var(--color-text-secondary)` on body. So it works by accident in light mode -- but the _intended_ muted/secondary hierarchy is broken. In dark mode via `prefers-color-scheme`, `--color-text-secondary` maps to `--color-dark-text-muted` (#D1D5DB), so muted and secondary text become the same color, eliminating visual hierarchy.

**Fix:** Add `--color-text-muted: var(--color-cloud-zinc);` to the `:root` block in `tokens.css` (light mode) and `--color-text-muted: var(--color-dark-text-muted);` to the dark mode override block. Alternatively, load `palette.css` before `tokens.css`.

---

### P0-2: Sign-in links point to staging environment

**File:** `index.html` lines 658, 668

Both the desktop and mobile "Sign In" buttons hardcode:
```html
href="https://staging.app.underchat.ai/login"
```

The Fibery Site Config also stores this staging URL. This exposes:
1. The `staging` subdomain to production visitors.
2. The `underchat.ai` domain (internal product name) rather than `undersight.ai`.
3. The JS at line 1001 updates only the desktop link (`signInLink`), leaving the mobile link (line 668) permanently hardcoded to staging.

**Fix:** Update both links to production URL. Make the JS update the mobile sign-in link as well.

---

### P0-3: Hardcoded hex colors break dark mode

**File:** `index.html`

| Line | Code | Problem |
|------|------|---------|
| 364 | `border: 1px solid #ddd` | `.sol-visual-box` border stays light gray in dark mode |
| 576 | `color: var(--pw, #fff)` | `--pw` is never defined; falls back to hardcoded `#fff` |
| 590 | `color: var(--pw, #fff)` | Same undefined variable |
| 594 | `color: var(--cz, #D1D5DB)` | `--cz` is never defined; falls back to hardcoded gray |
| 603 | `color: var(--cz, #D1D5DB)` | Same |

The `#ddd` border on line 364 will appear as a visible light border on dark backgrounds. The `--pw` and `--cz` variables are orphaned abbreviations that never got defined -- they work via fallback but violate the "no hardcoded hex" rule.

**Fix:** Replace `#ddd` with `var(--pale)`. Define `--pw` and `--cz` properly or replace with existing token references (`var(--color-on-accent)` and `var(--color-cloud-zinc)`).

---

### P0-4: Blog content has wrong industry vertical

**Fibery entities:**
- `Blog - Why AI underwriting is not about replacing underwriters`: References "specialty insurance" (2x), which is a different industry than the homepage positioning of "alternative finance" (MCA, revenue-based financing, factoring).
- `Blog - The RFI bottleneck`: References "carrier" and "loss runs" -- insurance-specific terminology that does not apply to alternative finance.

The homepage says "Built for alternative finance. Revenue-based financing, MCA, and factoring." but the blog content discusses specialty insurance carriers. A visitor will notice this contradiction immediately.

**Fix:** Rewrite blog content to reference alternative finance / MCA / funding terminology consistently. Replace "carrier" with "funder", "loss runs" with "bank statements" or "position schedules", and remove "specialty insurance" references entirely.

---

### P0-5: "underchat" brand name leaks into customer-facing content

**Fibery entities:**
- `Blog - Building an underwriting copilot`: "underchat Co-pilot was designed around the actual workflow" -- uses internal product name "underchat" in customer-facing blog copy.
- `Blog - How Chat Advance funded a declined deal in 5 minutes`: "underchat enriched the data automatically" -- same issue.

The product name visible to customers should be "undersight", not "underchat".

**Fix:** Replace "underchat Co-pilot" with "undersight Copilot" and "underchat enriched" with "undersight enriched" in the Fibery content.

---

## P1 -- Important

### P1-1: Stats are unsourced and potentially misleading

**File:** `index.html` lines 772-774

```html
<div class="stat-num">71%</div><div class="stat-label">Reduction in deal time</div>
<div class="stat-num">22%</div><div class="stat-label">More booked receivables</div>
<div class="stat-num">650<span> bps</span></div><div class="stat-label">Loss ratio reduction</div>
```

These stats have no attribution, no footnote, no "based on" qualifier. A skeptical fund manager will ask:
- 71% reduction compared to what baseline? Over what sample?
- 22% more booked receivables -- measured how? Over what time period?
- 650 bps loss ratio reduction -- what portfolio, what vintage?

Additionally, the "How it works" section at line 721 claims "30% faster screening" while the Copilot solution description in Fibery claims "30% faster screening, 20-30% more approvals." These are different metrics from the 71%/22%/650bps stats bar, creating confusion about which numbers to believe.

**Fix:** Either add qualifiers (e.g., "Up to 71% reduction in deal time*" with a footnote citing the source) or replace with more defensible claims. Reconcile the 30% and 71% figures.

---

### P1-2: Contact page is orphaned (no navigation path)

**File:** `index.html` lines 882-889

`<section class="page" id="page-contact">` exists and contains content, but no navigation link points to it. The nav bar has Solutions, Docs, Blog -- but no Contact. The only way to reach it would be by calling `navigate('contact')` in the console.

**Fix:** Either add a "Contact" link to the nav, or remove the orphaned page entirely and rely on the CTA sections and Calendly links.

---

### P1-3: Email address inconsistency between Fibery and hardcoded HTML

**File:** `index.html` lines 825, 887, 1089; Fibery `Site Config`

The Fibery Site Config specifies `Contact Email: contact@undersight.ai`. The JS correctly updates the contact page email (line 1003-1006). However:

- Line 825 (homepage CTA): hardcoded `kyle@undersight.ai`, never updated by JS
- Line 1089 (solution page CTAs, generated by JS): hardcoded `kyle@undersight.ai`
- Line 887 (contact page): updated by JS to `contact@undersight.ai`

Result: The homepage shows `kyle@undersight.ai`, the contact page shows `contact@undersight.ai`.

**Fix:** Make all email references pull from the Site Config, or update the hardcoded instances to match.

---

### P1-4: Inline `<style>` duplicates external CSS, creating maintenance drift

**File:** `index.html` lines 12-624

The page contains 612 lines of inline CSS that duplicates virtually everything in `css/main.css`. The inline CSS uses different variable naming conventions (e.g., `--mid`, `--dark`, `--pale`, `--light` vs the token-based names in `main.css`). Only `tokens.css` is loaded as an external stylesheet; `main.css`, `palette.css`, and `fonts.css` exist but are unused.

This creates a maintenance hazard: changes to `main.css` have no effect, and the inline CSS uses shorthand aliases that obscure the design system.

**Fix:** Remove the inline `<style>` block and link `css/main.css` instead. Ensure `main.css` is the single source of truth for all component styles.

---

### P1-5: Theme toggle is broken for light-mode-default users

**File:** `index.html` line 1197-1199

```js
function toggleTheme() {
    document.documentElement.classList.toggle('theme-light');
}
```

The toggle adds/removes `theme-light`. The `tokens.css` defines:
- Default: light mode
- `@media (prefers-color-scheme: dark)`: dark mode
- `html.theme-light`: force light mode

For a user whose OS is in light mode: toggling `theme-light` on does nothing (already light). Toggling it off does nothing (still light). There is no `theme-dark` class defined, so the toggle has zero effect for the majority of users.

**Fix:** Implement a proper dark/light toggle using both `theme-light` and `theme-dark` classes, with the dark class overriding to dark tokens.

---

### P1-6: Nav logo uses `onclick` on a `<div>` -- not keyboard-accessible

**File:** `index.html` line 631

```html
<div class="nav-logo" onclick="navigate('home')">
```

A `<div>` is not focusable or activatable via keyboard. Screen reader users and keyboard-only users cannot navigate home via the logo. Same issue with:
- Line 764: `<span class="cs-link" onclick="openCaseStudy()">` -- not keyboard-accessible
- Line 874: `<div class="back" onclick="navigate('blog')">` -- not keyboard-accessible
- Line 895: `<button onclick="toggleTheme()">` -- this one is fine (it's a `<button>`)

**Fix:** Change the logo `<div>` to `<a href="#home">` or `<button>`. Change the case study `<span>` to `<a>` or `<button>`. Change the back `<div>` to `<a>` or `<button>`. Add `tabindex="0"` and `role="button"` if keeping `<div>`/`<span>`.

---

### P1-7: Solution detail pages have no back navigation

**File:** `index.html` lines 1073-1091 (JS-generated solution pages)

Solution detail pages (underscore, Agentic RFI, Copilot) are generated dynamically. None include a back link or breadcrumb. The blog post page has a back link (line 874), but solution pages do not. A user who clicks into a solution page must use the nav bar to return home.

**Fix:** Add a back link or breadcrumb (e.g., "Solutions / underscore") at the top of each solution detail page.

---

### P1-8: "$20B annual volume across 250 originators" is an unqualified market claim

**File:** `index.html` line 782

```html
<p>Revenue-based financing, MCA, and factoring. $20B annual volume across 250 originators.</p>
```

This reads as if undersight processes $20B annually, which is a market-size claim. If this is a market size figure, it needs clarification (e.g., "in a $20B annual market"). If it's a platform metric, it's extraordinary for a startup and will invite scrutiny.

**Fix:** Clarify whether this is undersight's volume or the addressable market. Add appropriate qualification.

---

### P1-9: Solution dropdown descriptions get truncated to 60 characters with no semantic meaning

**File:** `index.html` line 1037

```js
ddItem.innerHTML = `${title}<span class="dd-sub">${desc.substring(0, 60)}${desc.length > 60 ? '...' : ''}</span>`;
```

The dropdown subtitle is hard-truncated at 60 chars, which may cut mid-word. For example, "API-first agentic and ML risk scoring for small business por..." is meaningless.

**Fix:** Truncate at the last complete word within 60 chars, or increase the limit. Better: use a dedicated short description field in Fibery.

---

## P2 -- Nice to Fix

### P2-1: No `<meta name="description">` tag

**File:** `index.html` line 5-6

The page has no meta description. Search engines will auto-generate one from body text, which will likely be the skeleton loading placeholder or truncated hero text.

**Fix:** Add `<meta name="description" content="AI agents that intake, enrich, score, and monitor across the funding lifecycle. Built for alternative finance.">`.

---

### P2-2: No Open Graph / social sharing tags

**File:** `index.html` `<head>`

Missing `og:title`, `og:description`, `og:image`, `twitter:card` tags. Links shared on LinkedIn, Twitter, or Slack will render as plain text with no preview.

**Fix:** Add standard Open Graph and Twitter Card meta tags.

---

### P2-3: Copyright year is hardcoded to 2026

**File:** `index.html` line 895

The fallback copyright says "2026 undersight" and the Fibery content also says "2026". This will become stale.

**Fix:** Generate the year dynamically with `new Date().getFullYear()`.

---

### P2-4: rgba() color values hardcoded in inline CSS

**File:** `index.html`

Multiple `rgba()` values are hardcoded in the inline styles rather than using token variables:

| Line | Value | Context |
|------|-------|---------|
| 90 | `rgba(0,0,0,0.08)` | Dropdown shadow |
| 128 | `rgba(0,0,0,0.06)` | Mobile menu shadow |
| 210-212 | `rgba(201,122,84,0.08)` etc. | Hero background gradients |
| 486 | `rgba(0,0,0,0.06)` | Nav scroll shadow |
| 490 | `rgba(0,0,0,0.06)` | Card hover shadow |
| 503 | `rgba(201,122,84,0.25)` | Button hover shadow |
| 512 | `rgba(201,122,84,0.15)` | Form focus ring |
| 597 | `rgba(255,255,255,0.1)` | Case study border |
| 609 | `rgba(201,122,84,0.1)` | Case study tag background |

These violate the "no hardcoded colors" rule in CLAUDE.md. The shadow tokens exist in `tokens.css` but aren't used by the inline CSS.

**Fix:** Replace with token variables (`--shadow-subtle`, `--shadow-medium`, etc.) or define new alpha tokens.

---

### P2-5: Blog page has no header/title

**File:** `index.html` lines 863-869

The blog page renders directly into a grid with no page heading:
```html
<section class="page" id="page-blog">
  <div class="container" style="padding-top:48px;">
    <div class="blog-grid" id="blogGrid"></div>
  </div>
</section>
```

Every other page (Docs, Contact, Solution detail) has a header. Blog just jumps into cards.

**Fix:** Add a `<div class="section-header">` with "Blog" or "Insights" as a heading.

---

### P2-6: `DM Sans` loaded but weight `510` not available

**File:** `index.html` line 10, `tokens.css` line 98

Google Fonts loads `DM Sans:wght@400;500;700`. The design system specifies `--weight-ui: 510` for UI elements, but DM Sans from Google Fonts only includes 400, 500, and 700. The Inter variable font can render 510 (it supports full weight range), but DM Sans cannot. Body text set in DM Sans at weight 510 would snap to 500.

The inline CSS uses `font-weight: 500` directly for nav and UI elements (which use Inter), so this is not a visible issue -- but the token value 510 and the font capabilities are mismatched for the body font.

**Fix:** Either load DM Sans with variable weight support or ensure 510 is only applied to Inter elements.

---

### P2-7: Docs cards are not interactive (no onclick/href)

**File:** `index.html` lines 851-858

The docs cards (Getting Started, underscore API, etc.) have `class="card"` which applies `cursor: pointer` and hover effects, but no `onclick` or `href`. Clicking them does nothing.

**Fix:** Either make them link to actual doc sections or remove the pointer cursor and hover effects.

---

### P2-8: Case study graphic has `flex: 0 0 480px` causing mobile overflow

**File:** `index.html` line 576

```css
.case-study-graphic { flex: 0 0 480px; ... }
```

On screens narrower than ~480px, this will overflow or be cut off. The mobile override at line 621 sets `flex: none` which fixes it, but the breakpoint is 768px. Between 480px and 768px on a landscape phone or small tablet, the flex-basis of 480px could still cause issues if combined with padding/borders.

**Fix:** Add `max-width: 100%` to `.case-study-graphic` or adjust the breakpoint.

---

### P2-9: No loading state or error handling for blog images

**File:** `index.html` line 1111-1114

Blog card thumbnails are set via inline `background:url(...)`. If the image fails to load, the user sees an empty gray box with no fallback text (the `thumbContent` variable is empty when an image URL exists).

**Fix:** Add an `onerror` handler or use `<img>` elements with fallback alt text instead of CSS backgrounds.

---

### P2-10: `prefers-reduced-motion` only covers reveal animations

**File:** `index.html` lines 477-479

The reduced motion media query disables `.reveal` and `.reveal-stagger` animations, but does not disable:
- Hero bar draw animation (line 527)
- Page fade transitions (line 534)
- Card hover transforms (lines 489-490, 499-500)
- Button hover transforms (lines 502-507)

**Fix:** Extend the `prefers-reduced-motion` block to disable all motion.

---

### P2-11: SVG logo has no accessible text

**File:** `index.html` line 632

The SVG logo inline has no `<title>` element and no `aria-label`. The text "undersight" next to it is not semantically associated with the logo.

**Fix:** Add `<title>undersight logo</title>` inside the SVG, and `role="img" aria-label="undersight logo"` on the SVG element.

---

### P2-12: Fibery workspace URL visible in server source

**File:** `undersight-serve.py` line 21

```python
WORKSPACE = "subscript.fibery.io"
```

The Fibery workspace domain `subscript.fibery.io` and the database name `Website/Database 1` are visible in the server source. While not directly accessible to site visitors (it's server-side), this is an information leak if the source is ever exposed.

The token retrieval via macOS Keychain (`security find-generic-password`) is properly secured and not exposed to the client. The `/api/content` endpoint does not leak the Fibery token. The file proxy validates secrets against an allowlist.

**Fix:** Low priority. Move workspace config to environment variables for defense in depth.

---

### P2-13: `legal.undersight.ai` link may be a dead URL

**File:** `index.html` line 896

```html
<a id="footerPrivacy" href="https://legal.undersight.ai" target="_blank">Privacy Policy</a>
```

No verification was possible without fetching the URL, but `legal.undersight.ai` is an unusual subdomain for a privacy policy. If this is not yet configured, the link leads nowhere.

**Fix:** Verify the URL is live. Consider hosting the privacy policy at `undersight.ai/privacy` instead.

---

### P2-14: Hero subtitle text may be rendered as empty

**File:** `index.html` line 997

```js
document.getElementById('heroSubtitle').textContent = hero._body || '';
```

The `parseMeta` function puts all non-metadata lines into `_body`. For the hero content, the body is the subtitle line. If the Fibery content format changes slightly (e.g., extra blank line), `_body` could be empty, showing no subtitle.

**Fix:** Add a hardcoded fallback subtitle for resilience.

---

### P2-15: `$0 Manual CaC` label is jargon

**File:** `index.html` line 757

```html
<div class="num">$0</div><div class="label">Manual CaC</div>
```

"CaC" is not a standard acronym. It likely means "Customer Acquisition Cost" (CAC) but is misspelled. Even "CAC" is jargon that many visitors won't understand without context.

**Fix:** Spell it out: "Manual Acquisition Cost" or "Manual Cost" or simply "Labor Cost."

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| P0 | 5 | Missing CSS token, staging URLs, hardcoded colors, wrong industry in blog, internal brand name leak |
| P1 | 9 | Unsourced stats, orphaned pages, email mismatch, accessibility, broken toggle |
| P2 | 15 | Missing SEO tags, rgba hardcodes, jargon, missing error states |

**Most urgent:** Fix P0-1 (missing token), P0-2 (staging URLs), and P0-4/P0-5 (content inconsistencies) before any investor or customer sees the site.
