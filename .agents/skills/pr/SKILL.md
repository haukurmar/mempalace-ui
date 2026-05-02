---
name: pr
description: Use when the user wants to create a pull request. Triggers on "create a PR", "time for a PR", "let's do a pull request". Handles GitButler workspace mode automatically.
---

# Pull Request

Analyze branch commits and create a comprehensive pull request. Automatically detects GitButler workspace mode and uses the correct PR creation tool. Never pushes or opens without explicit user approval.

## Pre-flight reads (always)

1. `CLAUDE.md` — orchestrator rules, naming conventions
2. [`.agents/skills/gitbutler/SKILL.md`](../gitbutler/SKILL.md) — GitButler CLI workflow
3. [`.agents/skills/gitbutler/references/reference.md`](../gitbutler/references/reference.md) — full `but` command reference
4. [`.agents/skills/commit/scopes.md`](../commit/scopes.md) — scope conventions (used to phrase the PR title)

## Step 1: Detect Git Environment

**Do this FIRST, before anything else.**

```bash
git branch --show-current
```

**If output is `gitbutler/workspace`:**
- ✅ You are in **GitButler mode**
- ✅ Use `but pr new` to create PRs (handles stacked-branch targeting automatically)
- ✅ Use `but status -v` and `but branch show` to analyze branches
- ❌ DO NOT use `git checkout` or `git switch` (breaks the workspace)
- ❌ DO NOT use `gh pr create` (doesn't understand virtual-branch stacking)
- ❌ DO NOT use `git push` (use `but push` if a push is needed; only with explicit approval)

**If output is anything else:**
- ✅ You are in **Standard Git mode**
- ✅ Use `gh pr create` to create PRs
- ✅ Use `git push` to push (only with explicit approval)

## Step 2: Identify Target Branch

**Standard Git:** the current branch is the PR branch.
```bash
git branch --show-current
```

**GitButler:** ask the user which virtual branch to create the PR for, or infer from context.
```bash
but status -v    # Shows all virtual branches and stack structure
```

## Step 3: Analyze Commits

Gather all commits on the branch that aren't on the base branch.

**Standard Git:**
```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

**GitButler:**
```bash
but branch show {branch-name}       # Commits only
but branch show {branch-name} -f    # Commits with file changes
git log main..{branch-name} --oneline
git diff main...{branch-name} --stat
```

**For stacked branches**, diff against the parent branch instead of `main`:
```bash
git diff {parent-branch}...{child-branch}
```

From the commits, identify:
- Features added
- Bug fixes
- Refactoring changes
- Breaking changes or migrations

**Group related commits into logical categories** for the description — don't list every commit individually.

## Step 4: Draft PR Content

### Title

- Under 72 characters
- Clear summary of the dominant change
- Conventional-commit style if a single concern dominates the branch (e.g., `feat(web): added the raw palace browse route`); otherwise a plain summary describing the cohesive theme
- Never echo internal-only project names from outside this repo

### Description template

```markdown
## Overview

{1–3 sentences: what this PR accomplishes and why}

## Changes

{Organized by logical grouping, drawn from commit analysis — not a commit-by-commit list.}

### {Category}
- {Change description}
- {Change description}

### {Category}
- {Change description}

## Implementation Details

{Important technical decisions, patterns used, or trade-offs made. Skip if straightforward.}

## Testing

- [ ] {Verification step}
- [ ] {Verification step}

## Breaking Changes

{Any breaking changes or migration steps. Skip if none.}
```

**Adapt the template to the PR.** Not every section applies. Omit sections that don't add value. A focused PR description beats a padded one. For tiny PRs, an Overview + Testing checklist is enough.

## Step 5: Present for Approval

**Always present the draft before creating the PR.**

Show the user:
1. The PR title
2. The full description
3. The target base branch
4. The creation command that will be used

Wait for explicit user approval ("create it", "open it", "go") before executing.

## Step 6: Create the PR

**Standard Git:**
```bash
gh pr create --title "{title}" --body "$(cat <<'EOF'
{description}
EOF
)"
```

**GitButler:**
```bash
but pr new {branch-name} -m "$(cat <<'EOF'
{title}

{description}
EOF
)"
```

`but pr new` automatically sets the correct base branch:
- Bottom of stack → targets `main`
- Stacked branch → targets the branch below it

**Do NOT create intermediate files** (like `PR_DESCRIPTION.md`). Use the CLI directly with HEREDOC.

### Stacked PRs

For stacked branches, create PRs **one at a time, bottom-up**. The user merges each before requesting the next. `but pr new` handles the base-branch targeting automatically.

## Step 7: Post-Creation

After the PR is created:
- Share the PR URL with the user
- Note any follow-up actions needed
- Do NOT auto-merge or auto-update the PR after creation

## Hard Rules

- **Never push or open without explicit user approval.** Step 5 is mandatory.
- **Never use `git push`** on a `gitbutler/workspace` branch — use `but push`.
- **Never amend or rewrite** existing commits as part of opening a PR.
- **No `Co-Authored-By` lines** anywhere.
- **No internal-only references** to projects outside this repo — keep mempalace-ui standalone.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `gh pr create` in GitButler workspace | Use `but pr new` — it handles stacking automatically |
| Using `git checkout` to analyze a branch | Use `but branch show` or `git log main..branch` — never checkout |
| Creating PR without showing the user first | Always present the draft and wait for approval |
| Listing every commit as a separate change | Group related commits into logical categories |
| Creating stacked PRs top-down | Always create bottom-up — base branch first |
| Creating intermediate PR description files | Use the CLI directly with HEREDOC |
| Echoing other project names in the description | Keep mempalace-ui standalone — describe categories, not foreign repos |

## Audio alert when tasks are complete

Run `afplay /System/Library/Sounds/Submarine.aiff` at the end of tasks, or when user input is needed to proceed.
