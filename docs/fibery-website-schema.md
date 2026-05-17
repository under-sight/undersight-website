# Fibery `Website` Space — Read-Only Schema Audit

**Workspace:** `subscript.fibery.io`
**Space:** `Website` (id `8ca89d10-4e40-11f1-8986-1bf5d7e9a055`, color `#E72065`, status `app/installed`, version `1.0.0`)
**Captured:** 2026-05-17
**Method:** `fibery subscript dbs / describe / query / automation list / view list / button list / schema dump` (read-only)

> Purpose: complete inventory so a parallel `CMS Staging` space can be safely mirrored without dropping fields, enums, relations, automations, or views.

---

## Executive overview

The `Website` space contains **7 user-facing databases** and **6 internal enum sub-types**. Some Fibery internal naming still reflects the original "Whitepapers / Whitepaper Leads" intent (now renamed `Blog` / `Blog Leads` in titles, but the older labels persist in view names). One legacy view `"Database 1s"` still uses the Fibery default name on `Website/Pages`.

**There is no dedicated `Website/Site Config` or `Website/Assets` database.** Both are represented differently than the existing `build.py` audit suggested:

- "Site Config" is **a single section-row inside `Website/Pages`** (entity id `019e1de0-d5f4-713d-aafc-77760809f236`, public-id `17`), not its own type.
- Assets are **per-entity file collections** (`Website/Assets` field on Pages and Blog, `Website/Logo` on Integrations, `Website/PDF` on Blog, `Website/Preview` on Animations) — not a separate database.

**`Website/Pages` is section-level**, not page-level. Entity names like `Home - Hero`, `Home - CTA`, `Solutions - underchat agent`, `Footer`, `SEO`, `Site Config`, `Contact Page`, `Docs Page` confirm each row is a granular section/block of a larger rendered page.

---

## Databases (types) in `Website`

| Type | Domain? | Entities | Granularity | Notes |
|---|---|---|---|---|
| `Website/Pages` | yes | **23** | section-level | Sections like `Home - Hero`, `Footer`, `SEO`, also a `Site Config` row |
| `Website/Blog` | yes | **9** | per-post | Mix of Case Study / Research / Insight (one `Test Blog`, one blank) |
| `Website/Blog Leads` | yes | **33** | per-lead | Many are `test@example.com` / `agent@undersight.ai` smoke tests |
| `Website/Integrations` | yes | **12** | per-logo | Plaid, QuickBooks, Xero, Salesforce, Ocrolus, Yodlee, MX, LendSaaS, Onboard, Receivabull, Gmail, Slack |
| `Website/Deployments` | yes | **4** | per-env target | undersight.ai (live), pages.dev variants (inactive/live) |
| `Website/Animations` | yes | **2** | per-animation | `Pen Nib Eye Blink`, `Cursive Writing Reveal` |
| `Website/Emails` | yes | **2** | per-template | `Research Dispatch` (Active), `Research Dispatch (Dark Variant)` (Draft) |

Plus 6 enum sub-types (see "Enums" section).

---

## 1. `Website/Pages` — section-level page blocks

- **Type id:** `8ca8eb30-4e40-11f1-8986-1bf5d7e9a055`
- **Entity count:** 23
- **Granularity:** section-level (each entity is a Hero / CTA / Footer / etc. block, not a whole route)
- **Mixins:** `fibery/rank-mixin`, `Collaboration~Documents/ReferencesMixin`

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/Name` | `fibery/text` | title field, secured |
| `Website/Description` | rich-text (`Collaboration~Documents/Document`) | required, main content body |
| `Website/Assets` | `fibery/file` (collection) | image/file attachments per section |
| `Website/Integrations` | relation → `Website/Integrations` (M:M, collection) | `relation` id `e9c00a52-6da8-45ac-ac13-ac38fc04d759` — Pages can reference Integrations and vice versa |
| `Collaboration~Documents/References` | collection | references mixin |
| `fibery/id`, `fibery/public-id`, `fibery/creation-date`, `fibery/modification-date`, `fibery/rank`, `fibery/created-by` | system | standard |

### Sample entity names (all 23)
`Home - Hero`, `Solutions - underscore`, `Solutions - underchat agent`, `Solutions - AI Underwriting Copilot`, `Blog - Why AI underwriting is not about replacing underwriters`, `Blog - The RFI bottleneck`, `Blog - Building an underwriting copilot`, `Contact Page`, `Site Config`, `Blog - How Chat Advance funded a declined deal in 5 minutes`, `Blog - Unlocking Institutional Capital for Mid-Tier MCA Funds`, `Blog - From Deterministic Scorecards to Agentic Credit Assessments`, `Docs Page`, `Blog - How 4D Financing gets institutional-grade underwriting with a 2-person team`, `Home - Who We Serve`, `Home - How It Works`, `Home - Metrics`, `Home - Case Study: Chat Advance`, `Home - Testimonial`, `Home - Case Study: 4D Financing`, `Home - CTA`, `Footer`, `SEO`

> **Pattern:** `{Route} - {Section Name}` for hero/section blocks; standalone names (`Footer`, `SEO`, `Site Config`, `Contact Page`, `Docs Page`) for cross-route singletons.

---

## 2. `Website/Blog` — long-form posts

- **Type id:** `019e29c7-e222-7085-8493-d0c26c4e4bc8`
- **Entity count:** 9 (7 real posts, 1 `Test Blog`, 1 blank)
- **Granularity:** per-post

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/name` | `fibery/text` | title (lowercase `name`) |
| `Website/Subtitle` | `fibery/text` | |
| `Website/Excerpt` | `fibery/text` (multi-line) | |
| `Website/Author` | `fibery/text` | |
| `Website/Slug` | `fibery/text` | URL slug, used by build.py |
| `Website/Post Date` | `fibery/date` | |
| `Website/Version` | `fibery/int` | |
| `Website/Description` | rich-text doc, required | post body |
| `Website/Assets` | `fibery/file` collection | hero images, inline images |
| `Website/PDF` | `fibery/file` collection | downloadable PDF (used by lead-magnet flow) |
| `Website/Type` | single-select enum → `Website/Type_Website/Blog` | `Case Study` / `Research` / `Insight` |
| `Website/Leads` | relation → `Website/Blog Leads` (1:N, collection) | inverse of `Website/Blog Post` on Leads — relation id `f6f299d1-9333-4160-aa40-e8cffeea5eb0` |

### Sample posts
| Name | Slug | Type | Date |
|---|---|---|---|
| Chat Advance Case Study | `chat-advance` | Case Study | 2026-05-08 |
| 4D Financing Case Study | `4d-financing` | Case Study | 2026-02-18 |
| From Deterministic Scorecards to Agentic Credit Assessments | `agentic-scorecards` | Research | 2026-01-22 |
| Unlocking Institutional Capital for Mid-Tier MCA Funds | `institutional-mca-capital` | Research | 2025-12-12 |
| Why AI underwriting is not about replacing underwriters | `ai-augmentation-not-automation` | Insight | 2025-11-20 |
| The RFI bottleneck | `rfi-bottleneck` | Insight | 2026-02-18 |
| Building an underwriting copilot | `building-underwriting-copilot` | Insight | 2026-03-12 |

---

## 3. `Website/Blog Leads` — gated-download email captures

- **Type id:** `019e28e6-1769-728f-99f4-74afb9ae3604`
- **Entity count:** 33 (mostly test rows from QA: `test@example.com`, `agent@undersight.ai`, `<script>@x.com` injection test, `foo..bar@x.com`, etc.)
- **Granularity:** per-lead-submission

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/Name` | `fibery/text` | **formula-backed** title — resolves to `fibery/public-id` (e.g. `"115"`, `"116"`); `readonly`, formula id `019e28e6-1769-7291-a7b1-cc2197aeebfe` |
| `Website/Email` | `fibery/text` (ui/type `email`) | |
| `Website/Sent` | `fibery/bool` | required, default `false` — automation flips this to `true` after dispatch |
| `Website/Blog Post` | relation → `Website/Blog` (N:1, single, collection?=false) | inverse of `Website/Leads` on Blog |
| `Website/Requested At_10ti78k_deleted` | `fibery/date-time` | **soft-deleted column** (still present in schema) |
| `Website/Source_0q35pxz_deleted` | `fibery/text` | **soft-deleted column** |

> **Surprise:** two `_deleted` suffixed legacy columns are still in the schema. Mirror them only if you want exact parity; otherwise drop in `CMS Staging`.

---

## 4. `Website/Integrations` — third-party logos

- **Type id:** `019e3444-5c4e-7225-be9c-1b6e5d83ed4b`
- **Entity count:** 12
- **Granularity:** per-vendor

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/name` | `fibery/text` | title (lowercase `name`) |
| `Website/Rank` | `fibery/int` | manual sort order (Plaid=10, QuickBooks=20, ... Slack=120) |
| `Website/Logo` | `fibery/file` collection | logo file(s) |
| `Website/Used On Pages` | relation → `Website/Pages` (M:M, collection) | inverse of `Website/Integrations` on Pages — same relation id `e9c00a52-...` |

### All 12 entities (in rank order)
Plaid, QuickBooks, Xero, Salesforce, Ocrolus, Yodlee, MX, LendSaaS, Onboard, Receivabull, Gmail, Slack.

---

## 5. `Website/Deployments` — env tracking + test results

- **Type id:** `019e2ccc-1b13-7116-bb1c-202d0a97744a`
- **Entity count:** 4
- **Granularity:** per-deployment-target

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/name` | `fibery/text` | title |
| `Website/URL` | `fibery/text` (ui/type `url`) | |
| `Website/Commit` | `fibery/text` | git sha |
| `Website/Content Hash` | `fibery/text` | content fingerprint |
| `Website/Deployed At` | `fibery/date` | |
| `Website/Last Test At` | `fibery/date-time` | |
| `Website/Test Count` | `fibery/text` | (stored as text, not int — likely a "passed/total" string) |
| `Website/Infrastructure` | `fibery/text` | |
| `Website/Site Mode` | `fibery/text` | (e.g. CMS / Static / Hybrid) |
| `Website/Documentation` | rich-text doc, required | |
| `Website/Notes` | rich-text doc, required | second doc field |
| `Website/Environment` | single-select enum | `staging` / `production` / `preview` |
| `Website/Status` | single-select enum | `live` / `inactive` / `archived` |
| `Website/Test Results` | single-select enum | `passed` / `failed` / `skipped` |

### All 4 entities
| Name | Env | Status | URL |
|---|---|---|---|
| Production - pages.dev | production | inactive | https://undersight-website.pages.dev |
| undersight.ai - Production | production | **live** | https://undersight.ai |
| Dev - Full Site | staging | **live** | https://dev.undersight-website.pages.dev |
| www.undersight.ai - Production | production | inactive | https://www.undersight.ai |

---

## 6. `Website/Animations` — motion design catalog

- **Type id:** `019e2cd4-a22d-72ed-954d-f70a8427fb04`
- **Entity count:** 2
- **Granularity:** per-animation

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/name` | `fibery/text` | title |
| `Website/Description` | rich-text doc, required | |
| `Website/Preview` | `fibery/file` collection | preview gif/mp4 |
| `Website/Type` | single-select enum | `micro-interaction` / `page-transition` / `loading` / `decorative` / `brand` |
| `Website/Status` | single-select enum | `active` / `concept` / `deprecated` |

### Entities
- `Pen Nib Eye Blink` — brand, active
- `Cursive Writing Reveal` — loading, active

---

## 7. `Website/Emails` — transactional/marketing email templates

- **Type id:** `019e32f5-1a91-726d-955d-759d1a6f6ec2`
- **Entity count:** 2
- **Granularity:** per-template

### Fields
| Field | Type | Notes |
|---|---|---|
| `Website/name` | `fibery/text` | title |
| `Website/Subject` | `fibery/text` | |
| `Website/From` | `fibery/text` | sender name |
| `Website/Channel` | `fibery/text` | (e.g. `Email`) |
| `Website/Status` | `fibery/text` | (free-text, NOT an enum: values seen `Active`, `Draft`) |
| `Website/Description` | rich-text doc, required | body/preview |

### Entities
- `Research Dispatch` — subject `Your Download From undersight`, status `Active`
- `Research Dispatch (Dark Variant)` — same subject, status `Draft`

> **Surprise:** `Website/Status` here is **plain text**, not an enum (unlike on Deployments/Animations). Inconsistent w/ rest of space.

---

## Enums (single-select sub-types)

All enums have `enum/color` + `enum/icon` (emoji) + `enum/name`.

| Enum type | Parent | Values |
|---|---|---|
| `Website/Type_Website/Blog` | Website/Blog | `Case Study`, `Research`, `Insight` |
| `Website/Environment_Website/Deployments` | Website/Deployments | `staging`, `production`, `preview` |
| `Website/Status_Website/Deployments` | Website/Deployments | `live`, `inactive`, `archived` |
| `Website/Test Results_Website/Deployments` | Website/Deployments | `passed`, `failed`, `skipped` |
| `Website/Type_Website/Animations` | Website/Animations | `micro-interaction`, `page-transition`, `loading`, `decorative`, `brand` |
| `Website/Status_Website/Animations` | Website/Animations | `active`, `concept`, `deprecated` |

---

## Relations summary

| From → To | Cardinality | Notes |
|---|---|---|
| `Website/Pages` ↔ `Website/Integrations` | **M:M** | Pages → `Website/Integrations` (collection); Integrations → `Website/Used On Pages` (collection); relation id `e9c00a52-6da8-45ac-ac13-ac38fc04d759` |
| `Website/Blog` → `Website/Blog Leads` | **1:N** | Blog → `Website/Leads` (collection); Leads → `Website/Blog Post` (single); relation id `f6f299d1-9333-4160-aa40-e8cffeea5eb0` |

No other cross-database relations exist. Animations, Deployments, and Emails are standalone islands.

---

## Automations (Fibery rules)

**Total: 1 rule across the entire Website space.**

### `undersight research dispatch` — on `Website/Blog Leads`
- **Status:** `AUTO`, **enabled: true**; last run `2026-05-17 16:34:51Z` `COMPLETED`
- **Trigger:** entity `created` (any new Blog Lead row)
- **Actions (in order):**
  1. **`email-app: Send Email`**
     - **To:** formula → `triggeredEntity.Website/Email`
     - **Bcc:** `kyle@undersight.ai`
     - **Sender name:** `undersight Research`
     - **Subject:** `Your Download From undersight`
     - **Message:** large HTML email template (branded `undersight research` masthead, "What undersight does" 4-row breakdown, `Book a walkthrough` CTA → `calendly.com/kyle-undersight/30min`)
     - **Files:** formula resolves `triggeredEntity → Website/Blog Post → Website/PDF` (attaches the PDF tied to the linked blog post)
     - **In Reply To:** `contact@undersight.ai`
     - **Use markdown:** true
  2. **`fibery: Update`** → sets `Website/Sent = true` on the just-created lead (field id `019e2c68-fc2d-7110-8f9d-d330ddf4356c`)

> One-line summary: *On new `Website/Blog Leads` → send branded PDF email (attached from the linked Blog Post) + bcc Kyle + flip `Sent=true`.*

**No automations on:** Pages, Blog, Integrations, Deployments, Animations, Emails.
**No buttons** exist on any Website type.

---

## Views

**Total: 13 views in the Website space** — all unfiltered (no `q/where` clauses). Default sort by rank/title.

| View name | Database | Type | Filter | Sort |
|---|---|---|---|---|
| `Database 1s` | Website/Pages | grid | none | by rank (`8cae4263-...`) |
| `Default` | Website/Pages | form | none | — |
| `Whitepapers` | Website/Blog | grid | none | by `019e29c7-...0088` (likely Post Date or rank) |
| `List` | Website/Blog | list | none | default |
| `Default` | Website/Blog | form | none | — |
| `Whitepaper Leads` | Website/Blog Leads | grid | none | by `019e28e6-...7292` |
| `Default` | Website/Blog Leads | form | none | — |
| `Deployments` | Website/Deployments | grid | none | by `019e2ccc-...7119` |
| `Default` | Website/Deployments | form | none | — |
| `Animations` | Website/Animations | grid | none | by `019e2cd4-...72f0` |
| `Default` | Website/Animations | form | none | — |
| `Emails` | Website/Emails | grid | none | by `019e32f5-...7270` |
| `Default` | Website/Emails | form | none | — |

> **Surprises in views:**
> - `"Database 1s"` is the Fibery default name — never renamed for the primary Pages grid.
> - `"Whitepapers"` / `"Whitepaper Leads"` view names persist even though the underlying types were renamed to `Website/Blog` / `Website/Blog Leads`.
> - **`Website/Integrations` has zero views** (no grid, no form). Editing happens via the open-database direct view only.

---

## Mirror checklist for `CMS Staging`

When cloning to `CMS Staging`, the following must be created (in this order to satisfy dependencies):

1. **7 domain types** — Pages, Blog, Blog Leads, Integrations, Deployments, Animations, Emails.
2. **6 enums** — Blog Type, Deployments Environment / Status / Test Results, Animations Type / Status. (Recreate values; Fibery will assign new ids.)
3. **2 cross-type relations** — Pages↔Integrations (M:M), Blog→Blog Leads (1:N).
4. **All scalar/rich-text/file fields** — note 4 rich-text fields total: Pages.Description, Blog.Description, Deployments.Documentation, Deployments.Notes, Animations.Description, Emails.Description (6 rich-text fields).
5. **1 formula field** — Blog Leads.Name = `fibery/public-id` (recreate via `schema create-formula`).
6. **1 automation** — `undersight research dispatch` (Email + flip `Sent`). Will need new file-formula expression because relation/field ids will change.
7. **Views** — Decide whether to mirror the legacy names (`Whitepapers`, `Whitepaper Leads`, `Database 1s`) or rename for clarity in staging (recommended: rename to `Pages`, `Blog`, `Blog Leads`).
8. **Decide on the two `_deleted` columns on Blog Leads** — skip (cleaner staging) or carry over for byte-perfect parity.
9. **Decide on `Emails.Status`** — currently free-text; opportunity to upgrade to an enum (`Active`, `Draft`, `Archived`) during the mirror.

---

## Notes for `build.py` reconciliation

Existing audit assumed `Website/Pages`, `Website/Blog`, `Website/Blog Leads`, `Website/Integrations`, `Website/Deployments`, `Website/Assets`, `Site Config`.

**Reality:**
- `Website/Assets` is **not a database** — it's a `fibery/file` collection field present on Pages, Blog (as `Website/Assets`), Integrations (as `Website/Logo`), Blog (as `Website/PDF`), and Animations (as `Website/Preview`).
- `Site Config` is **not a database** — it's a single row in `Website/Pages` (public-id `17`).
- Two databases not in the prior audit: **`Website/Animations`** (2 entities) and **`Website/Emails`** (2 templates). The Email DB drives the automation message body indirectly (the automation hardcodes the HTML — Emails entries appear to be a parallel reference catalog, not the live source of truth).
