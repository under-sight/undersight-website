# skeleton-v3 - product-index-first homepage (Option E)

**Status:** proposal. Mockup lives at `docs/mockups/skeleton-v3.html` (self-contained,
opens with any static server or `file://`). Nothing here is wired to production yet.

**Premise.** The current homepage follows the canonical AI landing-page skeleton
(hero -> stats -> personas -> how-it-works -> solution rows -> case tiles -> testimonial
-> CTA). column.com instead leads with a **product index**: a dense, text-first
taxonomy of everything the platform does, enumerated like a table of contents, before
any narrative persuasion. Option E ports that grammar onto undersight while keeping the
brand's editorial "underwriting file" language (hairline rules, mono folio labels,
dual accents, the decision-ledger hero exhibit).

**New skeleton (5 sections, down from 8):**

```
hero (decision-ledger exhibit, unchanged concept)
  +- ledger totals strip (product performance specs, mono)
01 · product index   (three products as a ruled taxonomy tree with sub-capabilities)
02 · proof           (one-line customer outcomes woven with real numbers -> case files)
03 · CTA (compact)
footer-as-full-index (every route enumerated)
```

The move collapses four narrative bands (personas, how-it-works, solution rows, case
tiles + testimonial) into two dense reference bands (product index, proof). It trades
storytelling for scannability: a returning operator can find the exact capability or
case file in one screen, the way column.com's index works.

---

## 1. Section-by-section mapping (old -> new)

| # | Current homepage section | `data-content-entity` | Fate in skeleton-v3 | New home |
|---|---|---|---|---|
| Hero | `.hero-split` + `.hv-ledger` decision ledger | `Home - Hero` | **Keep** (concept unchanged; copy + CTAs re-pointed) | `hero` |
| Stats bar | 71% / 22% / 650bps ledger totals | `Home - Metrics` | **Split.** Product-performance numbers (38s, 150+, <3s, ~6min) move to a thin hero-totals strip; customer-outcome numbers (71 / 22 / 650) move into Proof. | `hero-totals` + `proof` |
| Who We Serve | 3 persona cards (Funds / Brokerages / Marketplaces) | `Home - Who We Serve` | **Absorb.** Persona becomes a one-line `for funds / for brokerages / for marketplaces` meta-label on each product entry. The standalone section is deleted. | `product-index` (`.pentry-for`) |
| How It Works | 4-step loop (intake -> enrich -> score -> decide) | `Home - How It Works` | **Absorb / demote.** The four steps are re-expressed as sub-capabilities distributed across the three products (intake -> underchat, enrich/score -> underscore, decide -> copilot). No dedicated band. | `product-index` (`.subcap`) |
| Solutions | alternating `.solrow` rows, rendered into `#homeSolutions` | `Solutions - *` | **Replace.** Becomes the product-index taxonomy: name + tag + claim + a 4-item sub-capability tree per product. Mini-graphics dropped in favor of text density. | `product-index` (`.pentry`) |
| Case studies | 2-up `.cs-tile` grid (Chat Advance, 4D) | `Home - Case Study: Chat Advance`, `Home - Case Study: 4D Financing` | **Replace.** Each tile becomes one proof line: statement + outcome numeral + cite + "read the file" PDF link. | `proof` (`.proof`) |
| Testimonial | Josh James pull quote band | `Home - Testimonial` | **Fold in.** Attribution rides the 4D proof line's cite (`Josh James, Director, 4D Financing`). No dedicated band. | `proof` (`.proof-cite`) |
| CTA | `.cta-band` + static Calendly week/slot mock | `Home - CTA` | **Keep, compact.** Same heading/subtitle contract; the elaborate week-grid + slots mock shrinks to a 3-row spec card. | `cta` |
| Footer | 4-col link footer | (static markup) | **Expand** into a full site index: Products (with routes) / Proof / Resources / Account + legal row enumerating every route. | `footer` |

Net: **8 sections -> 5**; three CMS-narrative bands (Who We Serve, How It Works,
Testimonial) lose their dedicated sections but their content is redistributed, not lost.

---

## 2. Content facts reused (all from the live site, verbatim)

- **Products (lowercase):** underscore (risk scoring, for funds), underchat (client
  engagement, for brokerages), copilot (deal-book grading, for marketplaces).
- **Performance:** 38s median decision, 150+ metrics per file, <3s API response,
  ~6 min median intake.
- **Outcomes:** 71% deal-cycle reduction (Chat Advance), 650 bps loss reduction (4D
  Financing), 22% more booked receivables (aggregate), 30% faster screening.
- **Hero ledger exhibit:** FILE 2214 / Riverside Cafe LLC, composite 742 approve,
  "underwritten by underscore in 38s" (byte-identical to production `.hv-ledger`).
- **Sub-capabilities** are drawn from the real solution pages: underscore
  (API + batch, bank PDFs, scorecards, portfolio monitoring), underchat (web/email/
  SMS/Slack, doc collection, guardrailed, package assembly), copilot (ML 0.62 baseline
  + agentic +0.22 adjustment, deal triage, transaction analysis, 12 sources cited,
  human-in-the-loop) - from `SOLUTION_PILLS`, `solutionMiniGraphic`, and
  `SOLUTION_NARRATIVE_*` in `index.html`.
- **People/customers:** Josh James (Director, 4D Financing), Chat Advance (pilot).

---

## 3. Fibery entities & contracts each new section consumes

| New section | Fibery entity (`data-content-entity`) | Fields used | Renderer today | Change needed |
|---|---|---|---|---|
| `hero` | `Home - Hero` | `_title` (2-clause, accent split), `_body` | `renderContent` hero block | none - reuse as is |
| `hero-totals` | `Home - Metrics` (or `Home - How It Works` step-meta) | four performance numerals + labels | none (currently the stats band renders 71/22/650 from static markup, not Fibery) | new: a `renderHeroTotals()` reading four `metric`/`label` pairs, OR keep static (numbers are product-spec, low churn) |
| `product-index` | `Solutions - underscore`, `Solutions - underchat agent`, `Solutions - AI Underwriting Copilot` | `_title`, `Tag`, `_claim`, `_body` first para; **sub-caps** need a new repeatable field | `renderContent` `SOLUTION_MAP` loop -> `#homeSolutions` | **rework** the loop body: emit a `.pentry` (meta + `.subtree`) instead of a `.solrow`. `for <persona>` label needs a `Persona`/`Segment` field (today it is hard-coded Funds/Brokerages/Marketplaces). Sub-caps need a `Capabilities` sub-list (name + desc + tag) on each Solutions entity, or a per-product `SUBCAP_MAP` const mirroring `SOLUTION_PILLS`. |
| `proof` | `Home - Case Study: 4D Financing`, `Home - Case Study: Chat Advance`, `Home - Testimonial`, `Home - Metrics` (22%) | headline stat, one-line statement, cite (name/role/company), PDF asset name | `renderHomeCaseStudy(data, entity, innerId)` -> `.cs-tile` internals | **rework** into `renderProofLine()`: parse a `Statement` + `Stat` + `Stat Label` + `Cite` per case entity; the Testimonial entity contributes the 4D cite. PDF link reuses the existing whitepaper-modal path (`openWhitepaperModal('4D Financing Case Study')`). |
| `cta` | `Home - CTA` | `Heading` / `Subtitle` (fallback `_title`/`_body`) | `renderContent` CTA block | none - same ids/fields; only the aside markup shrinks |
| `footer` | `Site Config` (Sign In URL, Privacy Policy URL, Contact Email, Calendly URL, Copyright) + `Solutions - *` (route labels) + CMS/Blog (Blog link) | URLs + copyright | `renderContent` Site Config block populates `#signInLink`, `#footerPrivacy`, `#footerCopy`, `.contact-email-link`, Calendly hrefs | **light** - add the enumerated route columns to static markup; keep the four id/class hooks Site Config writes into |

Entities that **lose their dedicated section but keep their CMS record** (so nothing
needs deleting in Fibery): `Home - Who We Serve`, `Home - How It Works`,
`Home - Testimonial`. Their copy is redistributed into product-index sub-caps and proof
cites. If we want them to keep driving content, `Who We Serve` -> a `Persona` field on
each Solutions entity, `How It Works` -> the sub-cap descriptions, `Testimonial` -> the
proof cite. Otherwise they become orphaned CMS records (safe, just unused).

---

## 4. JS contracts - survive vs. need work

The mockup is static, but the real `index.html` renders from `/api/content`. Here is
what the restructure does to each contract in `renderContent` / `loadContent`.

### Survives unchanged (do not touch)
- `async function loadContent()` - untouched (build.py brace-matches it).
- `function renderContent(data)` - stays the single entry point; only its section
  bodies change.
- Element ids consumed by `renderContent`: `heroTitle`, `heroSubtitle`, `ctaTitle`,
  `ctaSubtitle`, `signInLink`, `footerPrivacy`, `footerCopy`, `contactTitle`,
  `contactSubtitle`, `blogGrid`, `blogFilters`, `solutionsDropdown`, `mobileSolutions`.
  The mockup preserves the ones that live on the homepage (`heroTitle`, `heroSubtitle`,
  `ctaTitle`, `ctaSubtitle`) and the Site-Config footer hooks.
- Nav/dropdown contract: `solutionsDropdown` + `mobileSolutions` are still populated by
  the `SOLUTION_MAP` loop; the dropdown is orthogonal to the homepage body change.
- Global onclick fns (all preserved): `navigate`, `openWhitepaperModal`,
  `submitWhitepaperEmail`, `closeWhitepaperModal`, `openCaseStudy`, `open4DCaseStudy`,
  `toggleMobileNav`, `closeMobile`, `toggleTheme`, `filterBlog`, `cookieConsent`.
  Proof "read the file" links reuse `openWhitepaperModal(...)` / `openCaseStudy()`.
- Detail-page renderers `renderUnderscorePage` / `renderUnderchatPage` /
  `renderCopilotPage` - untouched; the product index links into them via `navigate()`.

### Needs work
| Contract | Today | skeleton-v3 |
|---|---|---|
| `#homeSolutions` loop body | builds `.solrow` alternating rows + `solutionMiniGraphic()` | build `.pentry` (meta + `.subtree`). `solutionMiniGraphic()` and `SOLUTION_PILLS` become unused on home (keep for detail pages or delete). Add sub-cap source (new `Capabilities` field or `SUBCAP_MAP` const). |
| `data-content-entity="Home - Who We Serve"` | rendered as persona cards (currently static markup, not JS-populated) | attribute removed from home; persona folds to `.pentry-for`. |
| `data-content-entity="Home - How It Works"` | static 4-step markup | attribute removed from home; steps fold into sub-cap copy. |
| `renderHomeCaseStudy()` + `caseStudyChatAdvanceInner` / `caseStudy4DFinancingInner` ids | injects into `.cs-tile` bodies | replace with `renderProofLine()` writing `.proof-stmt` / `.proof-num` / `.proof-cite`. The two inner ids change to `proof-4d` / `proof-chatadvance` (or keep ids, change the container). |
| `data-content-entity="Home - Testimonial"` | pull-quote band | removed; cite text moves into the 4D proof line. |
| Stats band (71/22/650, static) | inline markup under hero | 71/22/650 relocate to `proof`; 38s/150+/<3s/~6min form the new `hero-totals` strip. |
| Footer markup | 4 columns | 5 enumerated columns + legal row (static; Site-Config id hooks unchanged). |

### CSS contract notes (production `css/main.css`, not touched by this proposal)
Implementing against the real file must keep the invariants in
`tests/design-editorial.sh`: `.hv-ledger` styled + present in `index.html`,
`.hero-overlay-cta` + `.hero-kicker` present, folio eyebrows (`01 &middot;`),
`.btn` squared to `--rounded-xs`, `.btn-primary` keeps `background-color` + literal
`#C97A54` before `var()` + `-webkit-appearance:none`. The mockup mirrors all of these
so its CSS can be lifted with minimal edits. Dead selectors the editorial branch already
burned down (`.stats-bar`, `.testimonial-section`, `.how-timeline`, `.sol-visual-box`,
`.case-study-inner`) stay dead - this restructure does not resurrect them; it removes
`.solrow` / `.cs-tile` / `.testimonial-band` / `.serve-*` usage from the home body,
which is a further burn-down, not new surface.

---

## 5. Routes enumerated (footer-as-full-index)

Every route the site exposes, now surfaced in the footer:

| Route | Type | Footer column |
|---|---|---|
| `/` | internal (`navigate('home')`) | brand logo |
| `/underscore` | internal | Products |
| `/underchat` (alias `/rfi`) | internal | Products |
| `/copilot` | internal | Products |
| `/blog`, `/blog/<slug>` | internal | Proof / Resources |
| `/contact` | internal | Resources |
| `https://documentation.underchat.ai/` | external | Resources |
| `https://staging.app.underchat.ai/login` | external | Account |
| `https://legal.undersight.ai` | external | Account / legal row |
| `https://calendly.com/d/cym7-q65-cht/discovery` | external | Resources |
| `https://www.linkedin.com/company/undersight-ai/` | external | Account |
| `mailto:contact@undersight.ai` | mailto | Account |
| case-study PDFs | whitepaper modal | Proof |

External links carry a mono `ext` superscript; internal routes carry a mono `/route`
sub-label so the footer doubles as a route map.

---

## 6. Honest effort estimate (against real `index.html` + `css/main.css`)

Assumes the editorial redesign branch (`agent/claude/…-column-redesign`) as the base.

| Work item | Size | Notes / risk |
|---|---|---|
| CSS: port `.pentry` / `.subtree` / `.subcap` grammar into `main.css` via existing tokens | **M** | Lift from the mockup; must use `--color-rule` / `--space-*`, no raw hex, keep reduced-motion coverage. |
| CSS: port `.proof` grammar; retire `.cs-tile` / `.testimonial-band` / `.serve-*` / `.solrow` home usage | **M** | Net CSS *reduction*; watch the `rgba(255` budget (<=20) and the `.stats-bar`-style dead-selector greps. |
| CSS: `hero-totals` strip + compact CTA aside | **S** | Small, mostly layout. |
| CSS: footer 5-col index | **S** | Additive; collapse rules already exist. |
| JS: rewrite `#homeSolutions` loop body -> `.pentry` + `.subtree` | **M** | Straightforward, but needs the sub-cap data source decided (field vs const). |
| JS: `renderHomeCaseStudy` -> `renderProofLine` (x2) + fold Testimonial cite | **M** | Reuses `getContent`/`parseMeta`; new tiny parser for statement/stat/cite. |
| JS: `hero-totals` (static, or a 4-pair renderer) | **S** | Static is defensible; numbers are product specs, not churny CMS copy. |
| Fibery: add `Persona`/`Segment` + `Capabilities` (name/desc/tag) to the three `Solutions - *` entities | **M** | Schema + content entry; the highest-touch dependency. If we start with a `SUBCAP_MAP` const, this drops to **S** and Fibery work is deferred. |
| Fibery: mark `Home - Who We Serve` / `How It Works` / `Testimonial` as unused (or repoint) | **S** | Records stay; only wiring changes. Decide keep-vs-orphan. |
| Tests: extend `tests/design-editorial.sh` for the new grammar (`.pentry`, `.proof`, product-index present in `index.html`) and re-green the dead-selector list | **S** | Mirror the existing check style. |
| QA: nav anchors, mobile 390 stack, PDF-modal wiring, deep-link routing unaffected | **S** | Mockup already validated 390px + desktop layout + dual-accent roles. |

**Rough total: ~2.5-3.5 focused days** for a TDD implementation (tests first per the
repo mandate), of which the schedule-critical path is the Fibery `Capabilities` field
decision. Shipping with a `SUBCAP_MAP` const first (Fibery deferred) makes a 1.5-2 day
first cut viable and keeps the CMS migration out of the critical path.

**Biggest risks / open questions**
1. **Sub-cap source of truth.** A `Capabilities` sub-list per Solutions entity is the
   clean answer but is real CMS schema work; a code-side `SUBCAP_MAP` unblocks the
   layout immediately. Recommend const-first, migrate later.
2. **Density vs. persuasion.** The index is scannable but drops the narrative ramp
   (personas -> how-it-works -> proof). First-time visitors get less hand-holding; this
   is the column.com trade and should be A/B'd against the current narrative build.
3. **Orphaned CMS entities.** Who We Serve / How It Works / Testimonial stop driving a
   section. Decide whether to repoint (into `.pentry-for` / sub-caps / proof cite) or
   accept them as dormant records.
4. **SEO / above-the-fold.** Leading with a taxonomy over a value-prop narrative changes
   the crawlable copy order; confirm the hero + first product entry still carry the
   primary keywords the current H2 sequence covers.
