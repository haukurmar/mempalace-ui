---
name: verification
description: Verification workflow for mempalace-ui — per-task hygiene every developer agent runs before reporting done, and the per-phase loop the orchestrator runs before asking for commit approval. Use whenever finishing a task or a phase.
---

# Verification

The verification workflow has two layers. Developer agents own the **per-task** layer; the orchestrator owns the **per-phase** layer. Don't conflate them.

## Per-task — every developer agent runs this before reporting done

You are responsible for leaving clean state. The orchestrator does NOT re-verify your individual task. If `check-types` or `lint` fails on your changed code, you fix it or you explicitly report the failure back — don't paper over it.

1. **Implement only the scope of the task.** No scope creep, no premature abstractions, no surrounding cleanup, no speculative scaffolding.
2. **Run `pnpm check-types`** for the package(s) you touched. If you touched cross-package consumers (e.g., `@memui/ui` types consumed by `apps/web`), run it repo-wide. Read the full output — never pipe `tsc` through `grep`, it hides errors and produces false-clean.
3. **Run `pnpm lint`** for the same scope. Read the full output. Fix every warning.
4. **Run `pnpm test`** if your change adds or touches tested code. Otherwise skip.
5. **Mark the task `[x]`** in the relevant `openspec/changes/<change>/tasks.md` block. Checkbox = real progress.
6. **Report a short summary** to the orchestrator covering:
   - What you built (1–2 sentences)
   - Which spec scenarios it satisfies
   - Any deliberate punts (with reasons)
   - Any failures you couldn't fix yourself

## Per-task — what NOT to do

- ❌ Run `git commit` or `but commit` — never. Commits are orchestrator-driven, behind explicit user approval.
- ❌ Run `git push` or `but push` — never.
- ❌ Dispatch other agents. You are the implementer; you do not delegate.
- ❌ Refactor or rename code outside the task's scope.
- ❌ Add dependencies without surfacing the choice to the orchestrator first.
- ❌ Mark `[x]` if `check-types` or `lint` is failing.

## Per-phase — the orchestrator runs this once when all tasks in a phase are `[x]`

Runs **repo-wide**, not per-package, to catch cross-package breaks (a type used in `@memui/ui` consumed wrongly by `apps/web`, a Biome-flagged primitive import that slipped past per-package checks, etc.).

1. **`pnpm check-types`** — no `--filter`, full repo. Read full output, fix every error.
2. **`pnpm lint`** — no `--filter`, full repo. Read full output, fix every warning.
3. **`pnpm test`** — no `--filter`, full repo. Read full output, fix every failure.
4. **Dispatch `review-agent`** against the phase's changed files. Apply BLOCKERs; consider WARNs; ignore NITs unless cheap.
5. **If any review fixes touched code, re-run steps 1–3.** Convergence required.
6. **Wait for explicit user approval** before committing. Do NOT auto-commit. The user must say "commit", "let's commit", or equivalent.
7. **Dispatch `commit-agent`** (it auto-detects GitButler workspace mode and reads the commit + gitbutler skills).
8. **Verify content actually landed** — run `but diff <commit>~ <commit>` (or equivalent) to confirm the diff matches what was intended. File presence in `git show --stat` is not enough.

## Per-phase — what NOT to do

- ❌ Skip steps 1–3 because "the developer agent already did them per task." Per-task checks run on partial state; the per-phase loop catches integration breaks.
- ❌ Pipe `tsc` / lint / test through `grep`. Always read raw output.
- ❌ Auto-commit. Always wait for explicit approval.
- ❌ Push without explicit approval, even after a successful commit.

## Audio alert when tasks are complete

Run `afplay /System/Library/Sounds/Submarine.aiff` at the end of tasks, or when user input is needed to proceed.
