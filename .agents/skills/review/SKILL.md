---
name: review
description: Convention review methodology for mempalace-ui. Use to audit changed files against project conventions before commits.
---

# Review

You audit changed files against mempalace-ui's project conventions. You return an issue list. You do NOT modify code — the orchestrator decides what to fix.

## Pre-flight reads (always)

1. `CLAUDE.md` — orchestrator rules and conventions
2. `.agents/docs/frontend/react-patterns.md` — TypeScript and React conventions to enforce
3. `.agents/skills/commit/scopes.md` — commit-message conventions (when reviewing commit messages)
4. The relevant capability spec under `openspec/changes/<change>/specs/<capability>/spec.md` — acceptance scenarios the changes claim to satisfy

## Inputs

You receive a list of changed file paths and (when relevant) the spec scenarios the change is supposed to implement. Check `but status` and `but diff` (or `git diff`) yourself if you need additional context.

## Convention checklist

For each changed file, verify:

### TypeScript & React
- Arrow functions, not `function` declarations
- `FC` from React, not `React.FC`
- `import type` used for type-only imports
- Props destructured in the function body, not in the args
- Named exports for components (not default, except framework-required pages)
- No inline event handlers — handlers are named arrow functions

### Design system
- No raw hex codes or arbitrary Tailwind values outside `@memui/design-tokens`
- No bare primitive imports outside `@memui/ui` itself (`packages/ui/src/primitives/*` is local-only)
- Pages consume composed components from `@memui/ui`, never primitives directly
- Every new composed component has a `.stories.tsx` neighbor with empty / loading / error / success states

### Architecture
- `@memui/*` workspace imports — never relative cross-package paths
- `@memui/palace-clients` is Node-only and not imported into client code paths
- No direct SQLite writes anywhere; mutations flow through `mempalace-mcp`
- New deps added to the workspace `catalog:` (not pinned per-package) when shared

### Component composition
- Multi-state components extract Loading/Error/Empty into sibling files
- Lists use dedicated Item components — no inline JSX in `.map()`
- Components over ~100 lines are flagged for extraction
- Forms use Zod with `z.infer` for the type, validation centralized in a hook

### Commit & task hygiene (when applicable)
- Commit messages follow `type(scope): summary` with the intent paragraph + bullets
- Scope drawn from `.agents/skills/commit/scopes.md`
- Task checkboxes in `tasks.md` actually marked `[x]` for completed work
- No `Co-Authored-By` lines

### Scope discipline
- Changes match the task's scope — no surrounding refactors, no premature abstractions
- New files justified by the spec or task; no speculative scaffolding

## Output

Return a short, ordered issue list. For each issue:

```
[severity] <file>:<line> — <what's wrong> — <what to do>
```

Severities: `BLOCKER` (must fix before commit), `WARN` (should fix), `NIT` (optional). Group BLOCKERs first.

If everything is clean, say so explicitly: `Clean — N files reviewed, no issues.`

## Audio alert when tasks are complete

Run `afplay /System/Library/Sounds/Submarine.aiff` at the end of tasks, or when user input is needed to proceed.
