# Multi-Agent Git Workflow

This repo should be cloned outside iCloud, Google Drive, Dropbox, or any other
sync folder. Git metadata must stay local and fully hydrated.

## Directory Layout

Use this layout on the local machine:

| Purpose | Path |
| --- | --- |
| Workspace root | `/Users/kyle/LocalDev/undersight` |
| Canonical clone | `/Users/kyle/LocalDev/undersight/undersight-website` |
| Agent worktrees | `/Users/kyle/LocalDev/undersight/undersight-website-worktrees/<agent-task>` |
| Old/synced copies | `/Users/kyle/Documents/undersight-website`, `/Users/kyle/My Drive (kyle@undersight.ai)/undersight-website`, `/Users/kyle/repos/undersight-website` |

The canonical clone tracks `origin/dev`. Treat it as the coordination point,
not as an editing workspace.

## Session Start

From the canonical clone:

```bash
cd /Users/kyle/LocalDev/undersight/undersight-website
git checkout dev
git fetch origin
git pull --ff-only origin dev
git worktree prune
```

Then create one worktree per agent task:

```bash
./scripts/new-agent-worktree.sh agent-a homepage-cms
./scripts/new-agent-worktree.sh agent-b lead-capture
```

Each worktree gets its own branch from the canonical local `dev` branch after
that branch has been updated from `origin/dev`:

```text
agent/<agent>/<timestamp>-<task>
```

## Agent Rules

1. One agent edits one worktree.
2. No agent edits the canonical clone directly.
3. No two agents own the same files unless explicitly coordinated.
4. Each agent commits only its own files.
5. Each agent runs the relevant tests before handoff.
6. Every branch rebases or merges latest `origin/dev` before final push.

## Integration

For a branch that is ready:

```bash
cd /Users/kyle/LocalDev/undersight/undersight-website-worktrees/<agent-task>
git fetch origin
git merge origin/dev
python3 build.py --verify
bash tests/test-suite.sh
git push -u origin HEAD
```

Then open a PR into `dev`, or merge locally from the canonical clone:

```bash
cd /Users/kyle/LocalDev/undersight/undersight-website
git checkout dev
git pull --ff-only origin dev
git merge --no-ff <branch-name>
python3 build.py --verify
bash tests/test-suite.sh
git push origin dev
```

Prefer PRs when multiple agents have active branches. Use direct local merges
only when you are intentionally acting as the integrator.

## Cleanup

After the branch lands:

```bash
cd /Users/kyle/LocalDev/undersight/undersight-website
git worktree remove /Users/kyle/LocalDev/undersight/undersight-website-worktrees/<agent-task>
git branch -d <branch-name>
git fetch origin --prune
git worktree prune
```
