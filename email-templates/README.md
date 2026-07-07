# Email Templates

Canonical source for transactional email bodies sent by Fibery automations.
The live copy lives in the Fibery automation UI (subscript.fibery.io) — **this
directory is the version-controlled source of truth**; paste from here.

## download-dispatch (blog/PDF download email)

| File | Purpose |
|------|---------|
| `download-dispatch.fibery.txt` | Exact text of the **Send Email → Message** field in the "undersight research dispatch" automation (CMS/Blog Leads → trigger: entity created). Zero-indentation Fibery/EJS format. |
| `download-dispatch.preview.html` | Browser-viewable source (indented, with `{{DOWNLOAD_TITLE}}`/`{{UNSUBSCRIBE_URL}}` placeholders). Edit this, then regenerate the fibery.txt. |

**Automation config (not in the template):**
- To: formula → lead's `CMS/Email`; Bcc: `kyle@undersight.ai`
- Subject: `Your download from undersight`
- Sender name: `undersight Research`; markdown: enabled
- Attachments: formula → `Blog Post.PDF` files
- Action 2: Update → `CMS/Sent = true`

**Formatting rules** (see docs/ARCHITECTURE.md → "Critical formatting rules for
Fibery email HTML"): zero indentation, `{! Blog Post:Name,PDF !}` preload on
line 1, `{{Field}}` templates for direct fields.

**Test gate:** `bash tests/test-email-template.sh` — run after any edit.

**Unsubscribe flow (implemented 2026-07-07):** the footer link renders
`undersight.ai/unsubscribe?e={{Email}}&t={{Unsubscribe Token}}`.

- Token: generated at lead creation (`functions/api/whitepaper-lead.js`,
  `undersight-serve.py`, `worker/index.js`) into `CMS/Unsubscribe Token`.
- Endpoint: `functions/unsubscribe.js` → GET confirm page (side-effect-free),
  POST marks every lead for the address `Unsubscribed=true` + `Unsubscribed At`.
- Suppression: `whitepaper-lead` checks the `Unsubscribed` flag in Fibery
  before creating a lead — suppressed addresses get a generic OK and no email.
  Fibery is the single source of truth (no KV suppression list; the KV
  namespace is only used for rate limiting).
- Tests: `bash tests/test-unsubscribe.sh` (dev server on :8088 with
  `FIBERY_SPACE="CMS Staging"`).
- Legacy emails sent before token generation have `t=` empty — the POST-form
  confirm path still honors those unsubscribes.
