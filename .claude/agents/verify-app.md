---
name: verify-app
description: Verify undersight website renders correctly and design system is consistent
model: sonnet
tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# Verify undersight Website

Site lives at `/Users/kyle/Documents/underchat/undersight/undersight/`.
Design system lives at the agent workspace: `projects/undersight-website/`.

## Checks

1. **Core files exist:**
   - `index.html` exists and is non-empty
   - `favicon.svg` exists

2. **HTML valid:**
   - `index.html` contains `<!DOCTYPE html>` or `<!doctype html>`
   - No broken `<link>` or `<script>` references to missing local files

3. **Brand tokens in site:**
   - Charcoal `#23262C` present in CSS
   - Amber Rust `#C97A54` present in CSS
   - Eucalyptus `#6B9E8C` present in CSS
   - Inter font family referenced

4. **Dark mode:**
   - `prefers-color-scheme` media query present in CSS

5. **Design system consistency** (if DESIGN.md exists):
   - Every hex in `tokens/tokens.css` matches `DESIGN.md`
   - `tokens/tokens.json` has matching values
   - `preview.html` exists and references `tokens/tokens.css`

6. **OpenType features:**
   - `cv01` and `ss03` referenced in CSS or token files

7. **Brand rules:**
   - "undersight" never capitalized (no "Undersight" or "UNDERSIGHT")

8. **Smoke test:**
   - Open `index.html` in browser and verify it renders (manual step)

## Known Issues

None currently documented.
