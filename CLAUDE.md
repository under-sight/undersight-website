# undersight Website

## Purpose

The marketing site for undersight.ai: one static single-page app plus a few standalone pages, built from content kept in this repo and served on Railway. Its one job is the discovery call. Every booking CTA links to https://cal.com/adriany/quick-connect, and `/book` 302-redirects there. The site has no forms, no lead capture and no server-side API.

Voice and positioning: `SOUL.md`. Product context and evidence on hand: `PRODUCT.md`. Visual system: `DESIGN.md`.

## Repo Map

| What | Path |
| --- | --- |
| Site copy, blog posts, integrations, Site Config | `content/content.json` |
| Images and files the content references | `images/files/` |
| Single-page app (renders the content map) | `index.html` |
| Workshop offer page (`/workshop`) | `resources/workshop.html` |
| Cookie consent banner | `resources/consent.js` |
| Static site builder | `build.py` |
| Static server for Railway and local preview | `serve.mjs` |
| Markdown negotiation helpers | `md-negotiation.mjs` |
| Redirect and rewrite rules | `_redirects` |
| Response header rules | `_headers` |
| Container build | `Dockerfile` |
| CI | `.github/workflows/ci.yml` |
| Uptime probe | `.github/workflows/health-check.yml` |
| Styles | `css/main.css`, `css/tokens.css` |
| Design tokens (source) | `tokens/tokens.css`, `tokens/tokens.json` |
| Component preview catalog | `preview.html` |
| Case study and research PDFs (not deployed) | `whitepaper/` |
| Architecture and runbook | `docs/ARCHITECTURE.md`, `docs/MAINTENANCE.md` |

`docs/BUILD-LOG.md` and `WIP.md` are historical records; leave them as they are.

## Content

`content/content.json` is the only content source. It maps each entity name to `{content, files}`, where `content` is the entity's markdown and `files` lists `{name, type, url}` entries pointing into `images/files/`. Three synthetic keys hold lists in a `_data` array: `_blogs` (blog posts), `_integrations` (the integration strip) and `_whitepapers` (case study and research titles with slugs).

Every content change is a pull request:

- Edit copy: change the entity's `content` string in `content/content.json`.
- Add a blog post: append an object to `_blogs._data` with the same keys as the existing posts, and put its images in `images/files/`.
- Add an image or file: place it in `images/files/` and add a `files` entry whose `url` is `images/files/<name>`.
- Take the site down for maintenance: set `**Production Mode:** under-construction` in the `Site Config` entity. A production build then ships `under-construction.html` in place of the site. `**Dev Mode:**` is read by builds without `--env=production` and only recorded.

`data-content-entity` is a contract: an element that carries it renders its copy from the named entity, never from fallback text in the markup.

## Build and Preview

```bash
python3 build.py                              # bake dist/ from content/content.json
python3 build.py --env=production --verify    # production build plus output scan
node serve.mjs                                # serve dist/ on http://localhost:8080
```

Open http://localhost:8080 after `python3 build.py && node serve.mjs`. The unbuilt `index.html` fetches `/api/content`, which no server answers, so always preview `dist/`. `PORT` sets the port (Railway sets 8080) and `SITE_ROOT` overrides the served directory. `dist/` is gitignored.

`serve.mjs` answers `/healthz`, applies `_redirects` (3xx redirects first, then static files with directory `index.html` and `.html` pretty URLs, then 200 rewrites ending in the `/* /index.html` SPA fallback), applies `_headers`, serves per-page markdown on `Accept: text/markdown` or a `.md` URL, and gzips text responses over 1 KB.

## Tests

CI (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`. Run the same suite locally before pushing:

```bash
python3 tests/build-from-repo.test.py
python3 tests/md-pages.test.py
bash tests/build-validation.sh
node --test tests/*.test.mjs
bash tests/test-suite.sh
```

`tests/test-suite.sh` builds `dist/` and starts `serve.mjs` on :8088 when nothing answers there. `tests/nav-e2e.mjs`, `tests/visual-regress.mjs` and `tests/link-check.sh` are run by hand.

## Ship

1. Branch off `origin/main` and open a pull request against `main`. There is no `dev` branch or dev environment.
2. CI must be green before merge.
3. Railway builds the `Dockerfile` and deploys on every push to `main`. The build stage (`python:3.12-slim`) runs `python3 build.py --env=production --verify`; the runtime stage (`node:22-alpine`) runs `node serve.mjs`.
4. Verify the deploy: `curl -s https://undersight.ai/healthz` returns `ok`, and the changed page renders on https://undersight.ai.

DNS for undersight.ai is on Cloudflare and points at the Railway service. The old Cloudflare Pages project stays in place, unused, as a rollback target. `health-check.yml` probes https://undersight.ai every 15 minutes and opens a GitHub issue on real downtime or when the under-construction page is live.

## Design Rules

1. `DESIGN.md` is the source of truth; `tokens/tokens.css` and `tokens/tokens.json` derive from it. A value added to one goes into all three. The live site loads `css/tokens.css`, which currently differs from `tokens/tokens.css`; carry a token change into both.
2. No hardcoded hex in components. Reference token variables.
3. Inter carries `font-feature-settings: 'cv01', 'ss03'`.
4. UI weight is `510`, not 500: buttons, nav, labels.
5. Amber Rust is reserved for CTAs, active states and interactive elements, never decoration.
6. New component patterns go into `preview.html` first.
7. "undersight" and "underchat" are always lowercase. `tests/test-suite.sh` fails on "Undersight" or "UNDERSIGHT".
8. Dark mode (`prefers-color-scheme` plus the `theme-dark` and `theme-light` classes) and `prefers-reduced-motion` are required.

## Known Issues

- Sign In links point to `https://app.underchat.ai/login`; `tests/test-suite.sh` asserts no `staging.app.underchat.ai` reference remains in `index.html`.
- `/docs` 302-redirects to https://documentation.underchat.ai/.
- The display font is still Inter; a separate display face is undecided.

## Learnings

Session notes: `tasks/lessons.md`.
