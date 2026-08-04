# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: underwriters, credit analysts, and operations leads at MCA (merchant cash advance) and RBF (revenue-based financing) funders — confirmed by Kyle 2026-08-04 as the audience the site leads with. Their situation: high submission volume where each submission is an application plus 3–4 bank statements, and manual review is the bottleneck between intake and a funding decision.

Secondary (umbrella): private credit funds and institutional capital allocators evaluating underwriting infrastructure.

Site visitors specifically: decision-makers at these funders evaluating whether to book a discovery call; a smaller stream downloads whitepapers (lead capture).

## Product Purpose

undersight is AI underwriting infrastructure: agents that intake, enrich, score, and monitor deals across the funding lifecycle. It exists because manual underwriting can't scale with submission volume. Success for a customer is faster, more consistent funding decisions without adding headcount; success for this site is a booked discovery call.

## Positioning

Agentic underwriting with determinism and human control as the trust mechanism — deterministic scorecards, runtime scorecard generation, and a human-in-the-loop co-pilot — rather than a black-box "AI approves your deals" pitch. The published stance is augmentation, not automation. Beachhead: proven in MCA/RBF (AFB pilot, Chat Advance and 4D Financing case studies); private credit is the umbrella category.

## Operating Context

- A submission = application + 3–4 bank statements; parsing/analysis of those documents is the entry point (deliberately priced as a loss-leader).
- Customer workflows: intake → enrich → score → monitor; bank-data connectivity via Plaid; chat-native intake exists in production (Chat Advance).
- Product docs live at documentation.underchat.ai (the site's /docs redirects there).
- Site content (hero copy, case studies, blog, contact) is managed in Fibery CMS (subscript workspace, CMS space) and baked to static HTML at build time; CMS edits reach production in ~15 min via cron builds.

## Capabilities and Constraints

- Product lineup (confirmed unchanged 2026-08-04): **underscore** (underwriting API), **underchat agent** (autonomous chat intake agent), **underchat co-pilot** (human-in-the-loop review co-pilot). Three solution pages, one each.
- Site is a statically-baked SPA; production has no runtime API calls. The build extracts `loadContent()` verbatim — its shape is frozen.
- Conversion surfaces: "Book a Discovery Call" (Calendly) as primary CTA; whitepaper download modal with email lead capture (Cloudflare Turnstile-protected) as secondary.
- The word "undersight" is always lowercase — test-enforced.

## Brand Commitments

- Brand kit v2.0: graphite neutrals + amber-rust accent (+ eucalyptus for positive/after states), Inter (headlines/UI) + DM Sans (body), OpenType `cv01, ss03` on Inter, light-first editorial with dark mode. Status per Kyle 2026-08-04: **evolvable within reason** for the redesign — extensions (new accents, type-scale changes) are allowed where the design earns them; this is not a rebrand and the identity stays recognizable.
- Voice: precise, evidence-led, no hype; "client" not "merchant" in AFB-adjacent contexts.

## Evidence on Hand

- Case studies: Chat Advance (71% deal-cycle cut, 3.1x throughput, 22% more booked, $0 added headcount) and 4D Financing — PDFs in `whitepaper/`, bodies as CMS "Home - Case Study:" entities.
- Whitepapers: deterministic-scorecards, institutional-capital, runtime-scorecard-generation (PDFs in `whitepaper/`); cash-flow underwriting explainer at `resources/cash-flow-underwriting.html`.
- 7 published blog posts (CMS-owned).
- A testimonial block exists on the current home page.
- Absences future work must not fabricate: no public pricing, no customer logo wall, no additional named customers or benchmarks beyond the two case studies.

## Product Principles

1. Lead with the proven beachhead — MCA/RBF evidence up front, category umbrella second.
2. Trust is earned through determinism and human control, not AI mystique.
3. Real numbers from real deployments; never invent proof.
4. The site's one job is the discovery call; everything else feeds it.
5. Content is CMS-owned; design frames it without hard-coding it.

## Accessibility & Inclusion

Dark mode (`prefers-color-scheme`) and `prefers-reduced-motion` support are required and test-enforced. No other product-specific requirement established.
