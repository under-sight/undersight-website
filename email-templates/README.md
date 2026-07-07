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

**Unsubscribe status (2026-07-07):** the footer link renders
`undersight.ai/unsubscribe?e={{Email}}&t={{Unsubscribe Token}}`. The
`CMS/Unsubscribe Token`, `CMS/Unsubscribed`, `CMS/Unsubscribed At` fields exist
on CMS/Blog Leads, but nothing populates the token yet and the `/unsubscribe`
endpoint does not exist. Next phase: generate the token in
`functions/api/whitepaper-lead.js` at lead creation, add
`functions/api/unsubscribe.js` (KV suppression list + lookup), and suppress
sends for unsubscribed emails.
