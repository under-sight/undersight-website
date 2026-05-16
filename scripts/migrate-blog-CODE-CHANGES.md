# Blog Migration — Code Changes Plan

This document describes the code edits required **after** the migration script
(`scripts/migrate-blog-to-blog-db.py`) has run successfully and the 7 source
`Website/Pages` "Blog - *" entities have been replaced with proper
`Website/Blog` entries.

**Status:** PENDING. Do not execute these edits until:

1. User has added the 6 required fields to `Website/Blog` in Fibery UI
   (see migration script for the list).
2. Migration script has been run successfully (no errors, all 7 entities
   merged).
3. User has manually verified the migrated `Website/Blog` entries in Fibery.

---

## Cutover Sequence

1. **User adds schema fields** in Fibery UI:
   - `Website/Description` — rich-text (Collaboration~Documents/Document)
   - `Website/Assets` — file collection
   - `Website/Post Date` — date or date-time
   - `Website/Subtitle` — text
   - `Website/Author` — text
   - `Website/Excerpt` — text

2. **Dry-run migration** to confirm schema gate passes:
   ```bash
   python3 scripts/migrate-blog-to-blog-db.py --dry-run
   ```

3. **Live migration**:
   ```bash
   python3 scripts/migrate-blog-to-blog-db.py
   ```

4. **Manual validation** in Fibery UI: open each of the 7 `Website/Blog`
   entries and verify Description body, Assets, Post Date, Subtitle, Author,
   Excerpt, Slug, and Type (tag) look right. Cross-reference against the
   corresponding `Blog - *` source in `Website/Pages`.

5. **Code update** (see sections below). Test on dev server.

6. **Add CI schema guard** that fails the build if any `Blog - *` entity is
   still present in `Website/Pages` (prevents regressions).

7. **Deploy to dev** branch (`dev.undersight-website.pages.dev`), verify
   visually.

8. **Merge to main** for production deploy.

9. **User reviews production**, then manually deletes the 7 `Blog - *`
   source entries in `Website/Pages` plus B8 ("Test Blog") and B9 (null
   stub) in `Website/Blog` via the Fibery UI.

---

## Files to Edit

### 1. `undersight-serve.py` — dev server

**Add a 2nd query** for `Website/Blog`. Project as `_blogs` array in the
content map (similar pattern to existing `_whitepapers`).

- Query fields: `Website/name`, `Website/Slug`, `Website/Type`,
  `Website/Description` (doc), `Website/Assets`, `Website/Post Date`,
  `Website/Subtitle`, `Website/Author`, `Website/Excerpt`, `Website/PDF`.
- Sort: `Website/Post Date` desc, tie-break `fibery/creation-date` desc.
- The existing `Website/Pages` query continues to power Home, Solutions,
  SEO, Site Config, etc. — just stop using `Blog - *` entries from it.

The whitepaper-lookup query in `_capture_lead()` already targets
`Website/Blog` by name, so it requires no change.

### 2. `build.py` — static build

Mirror the same delta as `undersight-serve.py`:

- Add a 2nd query against `Website/Blog`, project into the content map
  under a `_blogs` key.
- Asset download loop (`download_fibery_files()`) needs to walk `_blogs`
  entries in addition to existing structures so blog assets get baked into
  `images/` alongside other Fibery files.
- `determine_local_path()` works as-is since it scans all entity data.

### 3. `index.html` — frontend rendering

**Lines around 887–934 (`renderContent()` blog list):**

Replace:
```js
Object.keys(data).filter(k => k.startsWith('Blog - ')).map(...)
```

with:
```js
(data._blogs || []).map(blog => ({
  title:     blog.name,
  slug:      blog.slug,
  post_date: blog.post_date,
  tag:       blog.type,
  author:    blog.author,
  subtitle:  blog.subtitle,
  excerpt:   blog.excerpt,
  body:      blog.body,    // markdown from Website/Description
  files:     blog.files,   // Website/Assets
  pdf:       blog.name,    // for whitepaper modal lookup
}))
```

Each blog object now arrives pre-structured from Fibery — no more
front-matter parsing. `parseMeta(md)` stays in use for other `Website/Pages`
content (Hero, Site Config, etc.).

**Lines 903–904 (`_caseStudyPost` and `_4dCaseStudyPost` matchers):**

These match by post title and continue to work because the Blog DB entity
names are preserved:

- `'Chat Advance Case Study'` — name unchanged
- `'4D Financing Case Study'` — renamed from `... Maybe` by migration script

`openWhitepaperModal('Chat Advance Case Study')` at index.html lines ~252,
~301 still works for the same reason.

**`openPost()` for blog posts with tag Research / Case Study:**

Set `post.pdf = post.title` so the modal's whitepaper name matches the
Fibery `Website/Blog` entity name. Already true with the new data shape.

### 4. `functions/api/whitepaper-lead.js` — Cloudflare Pages function

**No change needed.** This function already queries `Website/Blog` by name
to look up the asset and create a lead. The 4D Financing rename happens at
migration time, and the JS call site (`openWhitepaperModal('4D Financing
Case Study')`) will hit the renamed entity correctly.

### 5. CI schema guard (new)

Add to `tests/test-suite.sh` or `build.py --verify`:

```bash
# Fail build if any "Blog - *" entity remains in Website/Pages.
python3 -c "
import json, subprocess
out = subprocess.run(['/Users/kyle/bin/fibery', 'undersight', 'query',
    '--query-json', json.dumps({
        'q/from': 'Website/Pages',
        'q/where': ['q/contains', ['Website/name'], 'Blog -'],
        'q/select': {'name': ['Website/name']},
        'q/limit': 50,
    })], capture_output=True, text=True, check=True)
data = json.loads(out.stdout)
if data:
    print('GUARD FAIL: Stale Blog - * entities in Website/Pages:')
    for d in data: print(f'  - {d[\"name\"]}')
    raise SystemExit(1)
print('Schema guard OK: no stale Blog - * entities in Website/Pages')
"
```

### 6. Static asset references (no edits)

- `images/` files referenced by build.py download loop — no change (they're
  keyed by opaque hash).
- `dist/` regenerates on next build, picks up the new data layout
  automatically.
- `images/blog/src/4d-financing-v3.html` and `copilot-building-v3.html`
  (user's untracked work) — untouched.

---

## Compatibility Notes

- **`openWhitepaperModal('Chat Advance Case Study')`** at `index.html:252`
  and `:301`: keeps working because the Blog DB entity name is unchanged.
- **`_caseStudyPost` / `_4dCaseStudyPost` matchers** at `index.html:903-904`:
  keep working because Blog DB names match (after migration renames
  `... Maybe` → `4D Financing Case Study`).
- **Existing leads** already in `Website/Blog Leads` (linked via
  `Website/Blog Post` relation) keep their links intact — we're not
  recreating entities, just enriching them.

---

## Rollback Plan

If anything goes wrong post-migration:

- The 7 source `Blog - *` entities in `Website/Pages` are **left intact**
  by the migration script. Code changes can be reverted via `git revert`
  to fall back to the old path.
- The migration is purely additive on the `Website/Blog` side — running it
  again is idempotent (no destructive writes).
- Manual cleanup of `Website/Pages` entries is the **last** step and
  happens via Fibery UI after production has been validated.
