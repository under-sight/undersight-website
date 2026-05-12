# undersight Website - Prep Checklist

## Phase 0 - Mise en Place (no blockers)

- [x] Scaffold agent workspace project (CLAUDE.md, todo.md, lessons.md)
- [x] Create Fibery tracking task (#812)
- [x] Install UI UX Pro Max skill (`uipro init --ai claude`)
- [x] Install `gws` CLI (`npm install -g @googleworkspace/cli`) - v0.8.0
- [~] Replace Google Workspace MCP with `gws` - BLOCKED: `gws` has no MCP server mode. Current Python MCP server kept.

## Phase 1 - API Keys (manual, parallel)

- [x] Get 21st.dev API key - `34783970ae89ac597`
- [x] Get Google AI API key - configured
- [x] Store keys in .mcp.json

## Phase 2 - Configure Design MCP Servers

- [x] Add 21st.dev Magic to undersight .mcp.json (also user-level via `claude mcp add`)
- [x] Add Stitch MCP to undersight .mcp.json
- [x] Add Nano Banana 2 to undersight .mcp.json
- [x] gcloud OAuth authenticated for Stitch MCP
- [x] Stitch proxy starts cleanly (no `stitch-mcp init` needed - proxy uses gcloud auth directly)

## Phase 3 - Verify

- [x] `gws --version` returns v0.8.0
- [x] UI UX Pro Max files in `.claude/skills/ui-ux-pro-max/`
- [x] Fibery task queryable (#812)
- [x] Agent workspace project complete
- [x] Stitch proxy confirmed working
- [ ] Verify all 3 design MCP servers show up in Claude Code (next session in undersight repo)

## Mise en Place - COMPLETE

Ready for design phase. Next session: open Claude Code in `/Users/kyle/Documents/underchat/undersight/` and start website design.

---

## Phase 4 - Design Tool Stack Test (2026-03-07)

Fibery task: [#814](https://adriany.fibery.io/Task_Management/Task/814) - full reference doc

- [x] Test UI UX Pro Max - design system generated, all domain searches work
- [x] Test 21st.dev Magic - component builder, inspiration, logo search all work
- [x] Test OpenAI Image Gen - brand assets generated with correct colors
- [x] Test Stitch MCP - configured but needs Stitch project first
- [ ] Nano Banana 2 - not testable from agent workspace (needs undersight project context)
- [x] Reference doc written to Fibery task #814

### Findings
- UI UX Pro Max generates good structure but colors/fonts need manual override to match brand
- 21st.dev Magic returns production-ready shadcn/ui components
- OpenAI gpt-image-1 handles brand hex colors accurately
- Stitch requires stitch.withgoogle.com project creation first

### Next Steps
- [ ] Override MASTER.md colors with brand palette (#23262C, #C97A54, #6B9E8C)
- [ ] Override MASTER.md typography with Space Grotesk + DM Sans
- [ ] Create Stitch project at stitch.withgoogle.com
- [ ] Test Nano Banana 2 from undersight project workspace
- [ ] Begin website design using validated tool workflow
