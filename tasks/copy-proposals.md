# CMS Copy Proposals — Hero & CTA (voice rewrite)

The homepage **hero headline/subtitle** and **CTA heading/subtitle** are CMS-driven
(Fibery entities `Home - Hero` and `Home - CTA`), not hardcoded in `index.html`.
This voice-rewrite branch cannot and does not touch Fibery. The proposals below are
for Kyle to paste into Fibery by hand.

Voice target (column.com register): flat, declarative, factual infrastructure claims.
No antithesis pairs ("X can't scale. Y can."), no rhetorical questions, no em-dashes,
no exclamation marks, `undersight` always lowercase.

> **Verify before pasting.** "Current" values below are read from the CMS backup fixture
> `tests/fixtures/cms-backup-2026-06-12.json` (dated 2026-06-12). Confirm they still match
> live Fibery before replacing, in case the entities changed after that snapshot.

---

## `Home - Hero` (secret `019e1de0-6b2a-71be-8361-939b60b0739a`)

**Current**
- Headline: `Manual underwriting can't scale. Agentic underwriting can.`
- Subtitle: `AI agents that intake, enrich, score, and monitor across the funding lifecycle.`

The headline is the single strongest "written by Claude" tell on the page: the
antithesis fragment-pair cadence ("X can't. Y can."). The subtitle is already close
to on-voice.

**Proposed (primary)**
- Headline: `AI agents that underwrite across the funding lifecycle.`
- Subtitle: `They intake applications, enrich and verify documents, score risk, and monitor portfolios, from first application to renewal.`

**Proposed (alternate)**
- Headline: `Underwriting infrastructure for private credit.`
- Subtitle: `AI agents intake, enrich, score, and monitor every deal across the funding lifecycle.`

---

## `Home - CTA` (secret `019e2ddc-87e1-729b-9ebf-4ab8ef280d21`)

**Current**
- Heading: `Ready to see undersight in action?`
- Subtitle: `Schedule a 30-minute discovery call. We'll walk through your workflow and show you what's possible.`
- Button: `Book a Discovery Call`

The heading is a rhetorical question — the other main tell. The subtitle is fine but
vague ("show you what's possible"); the proposals make it concrete.

**Proposed (primary)**
- Heading: `See undersight run on your deal book.`
- Subtitle: `Book a 30-minute discovery call. We will walk through your workflow and score a live application or portfolio sample.`
- Button: `Book a Discovery Call` (unchanged)

**Proposed (alternate)**
- Heading: `Book a 30-minute discovery call.`
- Subtitle: `Bring a recent application or portfolio sample. We will show what changes when the model does the first pass.`
- Button: `Book a Discovery Call` (unchanged)

---

## Note on the in-page CTA fallback

`index.html` also carries a *fallback* CTA (`#ctaTitle` / `#ctaSubtitle`) shown before
the CMS content loads. That fallback was rewritten in this branch to match the voice
target (it dropped the banned "continuous loop" phrasing). Once the `Home - CTA` entity
is updated, the CMS copy overrides the fallback at runtime; keeping the two roughly
aligned avoids a flash of off-voice copy on slow loads.
