# Repo-Specific Commit Conventions

This file contains commit conventions specific to this repository. The main `SKILL.md` handles the universal workflow.

## Scope Conventions

When specifying a scope in the commit message:

- **For packages:** Use the package folder name (the directory under `packages/`, NOT the `@memui/`-scoped npm name). First letter of the summary after the colon is lowercase.
- **For apps:** Use the app folder name in lowercase.
- **For repo-wide changes** (workspace config, root tooling, monorepo plumbing, CI, openspec docs that aren't tied to one package): use `repo`.

## Available Scopes

### Apps (`apps/`)

| Scope           | Folder                |
|-----------------|-----------------------|
| `web`           | `apps/web`            |
| `app-storybook` | `apps/app-storybook`  |

### Packages (`packages/`)

| Scope               | Folder                       | Published as              |
|---------------------|------------------------------|---------------------------|
| `design-tokens`     | `packages/design-tokens`     | `@memui/design-tokens`    |
| `ui`                | `packages/ui`                | `@memui/ui`               |
| `palace-clients`    | `packages/palace-clients`    | `@memui/palace-clients`   |
| `palace-types`      | `packages/palace-types`      | `@memui/palace-types`     |
| `biome-config`      | `packages/config/biome`      | `@memui/biome-config`     |
| `typescript-config` | `packages/config/typescript` | `@memui/typescript-config` |

### Special scopes

| Scope     | Use for |
|-----------|---------|
| `repo`    | Workspace config, Turborepo, root tooling, root-level scripts, monorepo plumbing |
| `ci`      | GitHub Actions / CI workflow changes |
| `specs`   | OpenSpec proposals, designs, tasks, capability specs (committed under `docs(specs)`, since these are authoring docs, not features) |
| `docs`    | Top-level README, CONTRIBUTING, journal docs (`docs/journal/*`) |

## Examples

```
feat(web): added the raw palace browse route

Users need a structural tree-and-table view of the palace that works
without an active MCP connection. Browse is the default landing view.

- Implemented /browse, /browse/$wing, and /browse/$wing/$room routes
- Wired RoomTree sidebar with virtualized drawer tables
- Added drawer detail slide-over consuming sqliteClient reads only
```

```
fix(palace-clients): resolved WAL read-only handle leak

A long-running session would leak SQLite handles when the palace
directory was deleted and recreated mid-session, blocking subsequent
reads until restart.

- Closed the better-sqlite3 handle on filesystem-watch eject events
- Re-opened lazily on the next read with WAL mode reapplied
- Added a regression test against a synthetic palace fixture
```

```
feat(design-tokens): added compact and dense density variants

Power users running the app on a single 27-inch screen wanted more
information density without losing legibility.

- Authored compact and dense token sets keyed by data-density
- Generated CSS custom property variants from the same TS source
- Verified Tailwind preset surfaces the new density tokens
```

```
chore(repo): scaffolded pnpm workspace and Turborepo pipelines

First commit after the openspec draft. Establishes the monorepo
foundation referenced by every subsequent task.

- Added pnpm-workspace.yaml with apps/* and packages/* globs
- Pinned shared deps in the workspace catalog
- Wired turbo.json with dev, build, test, lint, typecheck pipelines
```

```
docs(specs): updated bootstrap-mempalace-ui design and tasks

Captured the @memui/ scope decision, apps/web rename, and the
Storybook split into its own app (apps/app-storybook).

- Rewrote D5 monorepo layout with @memui-scoped package names
- Updated tasks 1.2, 3.x, 7.1 to reflect the new structure
- Removed obsolete tasks 1.6 and 1.7
```

## Additional Rules

- Always include both a summary (header) and a body description
- Body should explain the "why" — not just list what changed
- Past tense, header under 72 chars, body lines under 80 chars
- If working on a feature from Linear, reference the issue number in the body
- For multi-package changes that aren't truly repo-wide, prefer the most-affected scope and mention the others in the body
