# Content Inventory — undersight.ai Website

**Captured:** 2026-05-17  
**Scope:** Main index.html + supplementary pages (solutions, whitepaper, preview, under-construction)  
**Purpose:** Cross-reference Fibery entities, identify hardcoded sections, flag migration debt

---

## 1. Migration Debt — index.html Sections

| Section Name | Lines | Fibery Entity | Status | Image Refs |
|---|---|---|---|---|
| Home - Hero | 126–157 | `Home - Hero` | **Fibery-driven** (getContent L2030) | `/images/brand/logo-horizontal-line-primary.svg` |
| Home - Who We Serve | 159–180 | `Home - Who We Serve` | **Hardcoded—NO entity** | none |
| Home - Metrics (71% / 22% / 650bps) | 182–187 | `Home - Metrics` | **Hardcoded—NO entity** | none |
| Home - How It Works | 189–215 | `Home - How It Works` | **Hardcoded—NO entity** | none |
| Home - Solutions (grid of 3) | 216–245 | mapped via `SOLUTION_MAP` loop (L2074) | **Fibery-driven** (Solutions entities rendered) | varies by solution |
| Home - Testimonial (Josh James quote) | 247–257 | `Home - Testimonial` | **Hardcoded—NO entity** | none |
| Home - Case Study: Chat Advance | 229–244 | `Home - Case Study: Chat Advance` | **Fibery-entity-exists** (L2063, renderHomeCaseStudy) | `data-content-entity="..."` attr (L229) |
| Home - Case Study: 4D Financing | 260–275 | `Home - Case Study: 4D Financing` | **Fibery-entity-exists** (L2064, renderHomeCaseStudy) | `data-content-entity="..."` attr (L260) |
| Home - CTA | 277–283 | `Home - CTA` | **Hardcoded—NO entity** | none |
| Footer | 352–392 | `Footer` | **Hardcoded—NO entity** | `/images/brand/logo-horizontal-line-primary.svg` (implied in nav) |
| SEO meta tags (og:image, twitter:image) | 1–50 | `SEO` | **Hardcoded—NO entity** | `/images/og-image.png` (hardcoded URLs) |
| Contact Page (gated docs) | 294–316 | `Contact Page` | **Hardcoded—NO entity** | none |
| Docs Page | 294–316 | `Docs Page` | **Hardcoded—NO entity** (Clerk gate UI) | none |
| Solutions - underscore | 288 | `Solutions - underscore` | **Fibery-driven** (dynamic section, renderSolution L2074+) | varies (from renderSolution) |
| Solutions - underchat agent | 289 | `Solutions - underchat agent` | **Fibery-driven** (dynamic section) | varies (from renderSolution) |
| Solutions - AI Underwriting Copilot | 291 | `Solutions - AI Underwriting Copilot` | **Fibery-driven** (dynamic section) | varies (from renderSolution) |
| Blog list & detail view | 321–333 | from `data._blogs._data` (L2167+) | **Fibery-driven** (loop over Website/Blog) | varies (from asset attachments) |

**Total migration-debt rows:** 17

---

## 2. Other Pages

| File | Purpose | Content Source | Migration Status |
|---|---|---|---|
| `preview.html` | **Design system preview** — Local component/token showcase (dark/light theme toggle); **not a content page** | Hardcoded (design tokens in `tokens/tokens.css`; sidebar nav; component examples) | **Static** — no Fibery integration needed |
| `under-construction.html` | **Coming-soon fallback** — Placeholder landing page (logo, "undersight" cursive reveal, email signup CTA) | Hardcoded (plain HTML + JS timeline for writing animation) | **Static** — no Fibery integration |
| `solutions/copilot-review.html` | **Design review page** — UI review frame for copilot solution with sticky banner, section markers (Fibery vs hardcoded flags) | Mixed: hardcoded structure; review overlay; embedded component examples | **Review artifact** — likely not production |
| `whitepaper/chat-advance.html` | **PDF export template** — A4-formatted multi-page case study (cover + content sections, print-friendly CSS) | Hardcoded HTML structure; static body copy; likely tied to `Website/Blog` post slug `chat-advance` | **Needs mapping** — if fetching from Fibery Blog entity, link to PDF field |
| `whitepaper/chat-advance-hero.html` | **Hero component preview** — Isolated hero section (logo, title, date, CTA buttons) for chat-advance case study | Hardcoded HTML; static copy (likely excerpt from main whitepaper) | **Candidate for entity** — could pull from `Website/Blog[chat-advance].Description` |
| `dist/index.html` | **Built/compiled artifact** — Distribution copy of main index.html (post-build from build.py) | Generated from `index.html` template + Fibery data fetch | **Auto-generated** — do not edit directly |

---

## 3. Image Inventory

### `/images/blog/` — Case Study & Research Assets
- **Count:** 32 files (mix of `.png`, `.webp`)
- **Representative files:** `chat-advance.png`, `4d-financing.png`, `4d-workflow.png`, `institutional-capital.webp`, `chat-advance-overview.webp`, `rfi-bottleneck.png`, `ai-underwriting.png`
- **Purpose:** Hero images, step graphics, case-study inlines — tied to `Website/Blog` post attachments via `Website/Assets` and `Website/PDF` fields

### `/images/brand/` — Logo & Identity System
- **Count:** 6 files (all `.svg`)
- **Representative files:** `logo-horizontal-primary.svg`, `logo-horizontal-reversed.svg`, `logo-horizontal-line-primary.svg`, `wordmark-primary.svg`, `icon-primary.svg`
- **Purpose:** Branding, nav logos, footer logos — referenced in nav bar (line 66) and footer (implied)

### `/images/solutions/` — Product UI Screenshots & Step Graphics
- **Count:** 39 files (mix of `.png`, `.webp`, `.svg`, `.html` source files)
- **Representative files:** `cop1.png`, `cop2.png`, `rfi1.png`, `rfi2.png`, `rfi-card.png`, `copilot-step2.webp`, `copilot-step3.webp`, `underscore-card.html`
- **Purpose:** Solution-page product mockups, step-by-step UI flows, integration cards — rendered in dynamic Solutions pages via `renderSolution()`
- **Note:** Includes `.html` source files (copilot-step2.html, etc.) — likely used to generate `.png`/`.webp` exports

### `/images/` Root
- **Count:** 2 files (`og-image.png`, other root-level assets)
- **Purpose:** OG image for social sharing (referenced in SEO meta tags, line ~30)

**Total image files:** 79

---

## 4. Hardcoded Sections Needing Fibery Entities

The following sections are **hardcoded inline** in index.html but **DO have Fibery entities** (per schema audit) that are **not being used**:

1. **`Home - Who We Serve`** (L159–180)  
   - Hardcoded 3-card grid with roles: Funds, Brokerages, Marketplaces  
   - Fibery entity exists but not fetched; recommend mapping to entity

2. **`Home - Metrics`** (L182–187)  
   - Hardcoded 71% / 22% / 650bps stats bar  
   - Fibery entity exists; could be stored as rich-text fields on entity

3. **`Home - How It Works`** (L189–215)  
   - Hardcoded 4-step timeline: application → enrichment → scoring → decision  
   - Fibery entity exists; recommend mapping to entity with step substruct

4. **`Home - Testimonial`** (L247–257)  
   - Hardcoded Josh James quote from 4D Financing  
   - Fibery entity exists; recommend fetching quote + attribution

5. **`Home - CTA`** (L277–283)  
   - Hardcoded "Ready to see undersight in action?" + Calendly link + email  
   - Fibery entity exists; recommend storing copy + links on entity

6. **`Footer`** (L352–392)  
   - Hardcoded 4-column nav grid (Solutions, Resources, Connect, logo)  
   - Fibery entity exists; recommend fetching footer nav items + copy

7. **`SEO`** (meta tags, ~L30)  
   - Hardcoded og:image, twitter:image URLs  
   - Fibery entity exists; could store meta tag values

8. **`Contact Page`** (L294–299)  
   - Hardcoded Clerk gate UI + button  
   - Fibery entity exists; if routing to different page structure, map there

9. **`Docs Page`** (L302–316)  
   - Hardcoded 6-card grid (Getting Started, APIs, Webhooks, SDKs, etc.)  
   - Fibery entity exists; recommend fetching from entity if content changes

---

## Next Steps

1. **Wire hardcoded sections:** Modify `renderPage()` or add `renderSection()` to fetch from Fibery entities for Who We Serve, Metrics, How It Works, Testimonial, CTA, Footer.

2. **Verify SEO entity:** Confirm `Website/Pages[SEO]` holds meta tag values; if so, update meta rendering to call `getContent()`.

3. **Consolidate solution images:** Review `/images/solutions/src/*.html` files — determine if these should be regenerated from design tool or cached as artifacts.

4. **Blog asset linking:** Ensure `Website/Blog` entity's `Website/Assets` and `Website/PDF` fields are properly attached for lead-magnet flow.

5. **Whitepaper templates:** Map `whitepaper/chat-advance.html` to `Website/Blog[chat-advance]` entity; pull body copy from rich-text field.

