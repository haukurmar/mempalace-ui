# CLAUDE.md

---

## Skills

All skills live at `.agents/skills/`.

The `pnpm link:agents` script symlinks `.claude/skills/` and `.codex/skills/` to `.agents/skills/`, so the same skills are picked up by Claude Code and Codex without duplication. The two symlinked directories are gitignored; only `.agents/skills/` is committed.

---

## Guidelines & patterns

All authoring guidelines, coding patterns, and project-specific conventions live under `.agents/docs/`, organized by topic (e.g., `.agents/docs/frontend/react-patterns.md`). Read the relevant doc before writing or reviewing code in that area.

## Orchestrator role

The root conversation is the orchestrator — it delegates, it does not write code.

- **Always dispatch subagents in the background** so chat stays interactive while they work.
- **Prefer custom agents** when one exists (`frontend-agent`, `review-agent`, `pr-agent`, `commit-agent`) over generic ones.
- **Verify before commits**: run `pnpm check-types`, `pnpm lint`, `pnpm test` repo-wide, then dispatch `review-agent` against the changed files. Fix issues before asking for commit approval.
- **Never auto-commit**: wait for explicit user approval ("commit", "let's commit") before dispatching `commit-agent`.
