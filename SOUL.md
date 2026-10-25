# undersight soul

Read this before writing site copy. Every line below is copied or closely paraphrased from `PRODUCT.md`, `.impeccable.md`, `llms.txt`, `README.md`, `DESIGN.md`, `docs/MAINTENANCE.md` and the undersight brand kit v2.0. `PRODUCT.md` holds the fuller product context and the evidence on hand.

## Purpose

undersight is AI underwriting infrastructure: agents that intake, enrich, score and monitor deals across the funding lifecycle. It exists because manual underwriting can't scale with submission volume. Success for a customer is faster, more consistent funding decisions without adding headcount. Success for this site is a booked discovery call; the site's one job is the discovery call, and everything else feeds it. (`PRODUCT.md`)

## Audience

- Primary: underwriters, credit analysts and operations leads at MCA (merchant cash advance) and RBF (revenue-based financing) funders. A submission is an application plus 3 to 4 bank statements, and manual review is the bottleneck between intake and a funding decision. (`PRODUCT.md`)
- Secondary: private credit funds and institutional capital allocators evaluating underwriting infrastructure. (`PRODUCT.md`)
- Site visitors: decision-makers at these funders deciding whether to book a discovery call. A smaller stream downloads whitepapers through lead capture. (`PRODUCT.md`)
- What they bring: they evaluate hundreds of deals daily, are time-constrained, and need tools they can trust with high-stakes credit decisions. (`.impeccable.md`)
- Developers evaluating API integration go to the product docs at documentation.underchat.ai. (`.impeccable.md`, `llms.txt`)
- The brand kit names the audience as brokers, funds and funding marketplaces. (brand kit v2.0)

## Voice

- Precise and evidence-led, no hype: "Real numbers from real deployments; never invent proof." (`PRODUCT.md`)
- Professional yet approachable, confident, tech-forward. (brand kit v2.0, `.impeccable.md`)
- Three words: "Intelligent. Precise. Trustworthy." Persona: "The insightful analyst who sees what others miss." (`.impeccable.md`)
- Clarity over cleverness: a fund manager scanning the site should understand what undersight does within 5 seconds. (`.impeccable.md`)
- Human control: "Trust is earned through determinism and human control, not AI mystique." Example: "The underwriter still makes the call." (`PRODUCT.md`, `llms.txt`)
- Qualified numbers: stats carry a qualifier such as "Based on measured outcomes across active customer deployments". (`docs/MAINTENANCE.md`)

## Positioning

One line: "AI underwriting infrastructure for private credit." (`llms.txt`). Brand tagline: "AI Underwriting for Alternative Finance". (brand kit v2.0)

undersight sells agentic underwriting with determinism and human control as the trust mechanism: deterministic scorecards, runtime scorecard generation and a human-in-the-loop co-pilot, set against a black-box "AI approves your deals" pitch. The published stance is "augmentation, not automation." The site leads with the proven beachhead in MCA and RBF and treats private credit as the umbrella category. The lineup is underscore (underwriting API), underchat agent (autonomous chat intake agent) and underchat co-pilot (human-in-the-loop review co-pilot), with one solution page each. (`PRODUCT.md`)

## Refusals

- No invented proof: no public pricing, no customer logo wall, no named customers or benchmarks beyond the two case studies. (`PRODUCT.md`)
- No metric without a named source: "Real numbers with named sources only". (`DESIGN.md`)
- No black-box "AI approves your deals" pitch. (`PRODUCT.md`)
- No "merchant": say "business owner", "applicant" or "client". (`README.md`, `.impeccable.md`, `PRODUCT.md`)
- No "SMB": say "small business". (`README.md`, `.impeccable.md`)
- No capitals on the names: "undersight" and "underchat" are always lowercase. `tests/test-suite.sh` enforces the undersight rule. (`README.md`, `PRODUCT.md`)
- No em dashes in copy. (`.impeccable.md`, `docs/MAINTENANCE.md`)
- No specialty-insurance or insurance-specific terms; the product is for private credit. (`docs/MAINTENANCE.md`)
