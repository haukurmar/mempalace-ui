# CLAUDE.md

---

## Skills

All skills live at `.agents/skills/`.

The `pnpm link:agents` script symlinks `.claude/skills/` and `.codex/skills/` to `.agents/skills/`, so the same skills are picked up by Claude Code and Codex without duplication. The two symlinked directories are gitignored; only `.agents/skills/` is committed.

---

## Guidelines & patterns

All authoring guidelines, coding patterns, and project-specific conventions live under `.agents/docs/`, organized by topic (e.g., `.agents/docs/frontend/react-patterns.md`). Read the relevant doc before writing or reviewing code in that area.
