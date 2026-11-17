# undersight.ai Website

The static marketing site for undersight.ai. Content lives in `content/content.json` and `images/files/`; `build.py` bakes it into `dist/`, and `serve.mjs` serves `dist/` on Railway.

## Run Locally

```bash
python3 build.py && node serve.mjs   # http://localhost:8080
```

Requires Python 3.12 and Node 22. No credentials or environment variables are needed. `PORT` changes the port and `SITE_ROOT` changes the served directory.

## Build

```bash
python3 build.py                              # dist/ from content/content.json
python3 build.py --env=production --verify    # production build plus output scan
```

The build copies `css/`, `images/` and `resources/` plus the root static files into `dist/`, bakes the content map into `index.html` and `resources/workshop.html`, and writes the sitemap, `llms.txt`, `llms-full.txt`, BlogPosting JSON-LD and one markdown file per page.

## Update Content

Edit `content/content.json`, add any new images under `images/files/`, and open a pull request against `main`. Entity names, file entries and the blog post shape are described in `CLAUDE.md` and `docs/MAINTENANCE.md`.

## Test

```bash
python3 tests/build-from-repo.test.py
python3 tests/md-pages.test.py
bash tests/build-validation.sh
node --test tests/*.test.mjs
bash tests/test-suite.sh
```

CI runs the same commands on every pull request and every push to `main`.

## Deploy

Railway builds the `Dockerfile` and deploys on every push to `main`. The build stage runs `python3 build.py --env=production --verify`; the runtime stage runs `node serve.mjs` and answers `/healthz`. DNS for undersight.ai is on Cloudflare.

## Brand Rules

- "undersight" and "underchat" are always lowercase.
- Never "merchant" (say "business owner", "applicant" or "client") and never "SMB" (say "small business").
- Amber Rust is for CTAs and interactive elements only. Colors come from `css/tokens.css`, never hardcoded hex.
- Inter for headings and UI, DM Sans for body text.
