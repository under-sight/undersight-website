# Type identity exploration — display face for undersight.ai

**Branch:** `agent/opus/<ts>-type-explore` (proposal — review, do not auto-merge)
**Date:** 2026-07-11
**Context:** DESIGN.md has carried Inter as the display/UI face since day one, with the display face effectively "TBD." Inter is the default-est AI-product font; the goal is a face that kills that default feel while suiting an underwriting-ledger brand (precise, editorial, trustworthy, data-forward). DM Sans (body) and SF Mono (data) stay.

---

## Candidates compared

All three are self-hostable, on Google Fonts, and ship as **variable fonts** — so an arbitrary `font-weight: 510` (the brand's UI convention) resolves natively on every one. Verified live against `fonts.googleapis.com/css2` on 2026-07-11.

| | **Schibsted Grotesk** ✅ pick | Familjen Grotesk | Instrument Sans |
|---|---|---|---|
| **Weight range** | `400 900` (variable) — widest headroom; 510 UI + 600 head + 700–900 hero all on one axis | `400 700` (variable) | `400 700` (variable) + italic + `font-stretch:100%` width axis |
| **Character @ 64px** | Confident editorial grotesk. Even color, moderate contrast, tight-but-open apertures; large x-height holds at hero scale and stays legible small. Distinctive `a`, `g`, `t` foot, `R` leg, spurred `G`. Reads *designed*, not default. | Warmer, quirkier humanist-grotesk. Angular terminals, more playful `a`/`g`/`k`. Strong personality but less institutional gravitas — leans startup-friendly over ledger-serious. | Cleaner, more neutral/tech grotesk, slightly narrow/efficient. Versatile for UI, but sits closest to the "safe grotesk" zone — kills the Inter-default feel the *least*. |
| **Mono pairing (SF Mono)** | Even proportions + clean lining, near-tabular numerals sit naturally beside SF Mono in ledger rows — tonal match, no fight. | Warmth creates a larger contrast against SF Mono's neutrality; workable as deliberate contrast but less seamless in dense data. | Closest in neutrality to SF Mono → least tonal distinction; risks the two reading as one undifferentiated system. |
| **cv/ss features** | Does **not** expose Inter-style `cv01`/`ss03`; identity lives in the default glyphs. The retained `font-feature-settings` string is inert (harmlessly ignored). | Ships some stylistic alternates, but not the Inter `cv01`/`ss03` set; not relied on here. | Minimal stylistic-set surface; not relied on here. |
| **Pedigree fit** | Commissioned by the **Schibsted news group** — an editorial/publishing lineage that maps directly onto the "underwriting *file* / decision *ledger*" concept. | Type-foundry release, no domain resonance. | Agency-commissioned (Instrument), tech-brand resonance. |

> Note on `cv01`/`ss03`: the test suite greps `main.css` for `'cv01'` and `'ss03'`, and the brand's prior identity leaned on them. None of the three grotesks implement those exact features, so the declaration is **kept present (test-compat + future-proof) but inert**. This is called out in `css/tokens.css`, `css/main.css`, and DESIGN.md. If a face is ratified, decide whether to keep or retire the string.

---

## Pick: Schibsted Grotesk

Rationale, in order of weight:

1. **Best "un-defaults" the brand with the right register.** It escapes Inter decisively, but toward *editorial authority* rather than *startup quirk* (Familjen) or *another neutral grotesk* (Instrument). For a private-credit underwriting product, authority + precision is the target register.
2. **Widest weight axis (400–900).** One variable file covers 510 UI, 600 headings, 700 hero — and leaves 800–900 headroom for future display moments. Familjen/Instrument top out at 700.
3. **Numerals pair cleanliest with SF Mono.** The homepage leans hard on data exhibits (the decision-ledger card, metric readouts). Schibsted's near-tabular lining figures tonally match SF Mono without the two collapsing into one voice.
4. **Publisher pedigree matches the concept.** The "underwriting file" / "decision ledger" motif wants a news-desk grotesk, not a tech-brand one.

Preserved contracts: weight **510** works (variable axis); **DM Sans** body unchanged; **SF Mono** data unchanged; `display=swap` kept; Inter retained as a metric-close fallback if the webfont fails.

---

## What changed on this branch

- **`index.html` `<head>`** — Google Fonts URL swaps `Inter:wght@400;500;600;700` → `Schibsted+Grotesk:wght@400..900` (variable range so 510 resolves); DM Sans and `display=swap` unchanged; Inter dropped from the fetch.
- **`css/tokens.css` + `tokens/tokens.css`** (kept in sync) — added `--font-display`; repointed `--font-sans` to Schibsted Grotesk (Inter → first fallback). Body/mono tokens untouched.
- **`css/main.css`** — display/heading tier (`h1–h4`) → `var(--font-display)`; nav/button/label tier → `var(--font-sans)`. `font-feature-settings: 'cv01','ss03'` retained on both (inert).
- **`DESIGN.md`** — short "Type exploration" note under Typography.

Not touched (deliberately out of scope for this proposal): `tokens/tokens.json` `fontFamily` strings, the DESIGN.md Type Scale `Font` column, and scattered hardcoded `'Inter'` literals on micro-labels in `main.css` (blog date/meta, post-body `th`, tags) and `index.html` inline styles. Everything token-driven has already moved; these hardcoded remnants are the follow-up sweep if ratified.

---

## Evidence (screenshots — gitignored, not committed)

Run dirs under `tests/visual-baselines/` in this worktree:

- **Before (Inter):** `tests/visual-baselines/before-inter/` — `light-1440--hero.png`, `light-1440--full-page.png`
- **After (Schibsted), light-1440:** `tests/visual-baselines/after-schibsted/` — hero + full-page
- **After (Schibsted), full pack:** `tests/visual-baselines/schibsted-full/` — 54 shots: light+dark × 1440+390 × (default + reduced-motion), per section + full page

Rendered-font verification: the capture script reads back computed `font-family` on the hero `h1` — before = `Inter, …`; after = `"Schibsted Grotesk", Inter, …`, with `document.fonts.ready` awaited before shooting. Only console message during capture is a pre-existing empty-`sitekey` Turnstile error, identical before and after (not introduced by this change).

Re-capture (committed reproducer): `node tests/visual-regress.mjs <outDir>` (full pack). The light-1440 hero/full-page pair was captured with a worktree-local helper (`tests/type-explore-capture.mjs`, not committed) that additionally reads back the computed `h1` font-family; re-create it from this note if needed.

---

## What Kyle must decide

1. **Ratify the face?** Schibsted Grotesk, or fall back to Familjen Grotesk (warmer) / Instrument Sans (safer) / keep Inter. Compare `before-inter/` vs `after-schibsted/` hero + full-page.
2. **If ratified, approve the follow-up sweep:** update `tokens/tokens.json` `fontFamily` strings, the DESIGN.md Type Scale `Font` column, the "Display is Inter" principle wording, and convert the remaining hardcoded `'Inter'` micro-label literals to `var(--font-sans)`.
3. **`cv01`/`ss03` string:** keep as inert future-proofing, or retire it (and drop the test grep) since the new face ignores it.
4. **Inter fallback:** keep `'Inter'` in the stacks as a metric-close fallback, or drop to system stack for a clean break.
