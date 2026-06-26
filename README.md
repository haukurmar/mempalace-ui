# MemPalace UI

A local, keyboard-first web interface for [MemPalace](https://github.com/MemPalace/mempalace). Browse, search, and explore a palace of tens of thousands of memories without ever dropping into the CLI.

## Why this exists

[MemPalace](https://github.com/MemPalace/mempalace) is a local AI memory system. It stores tens of thousands of "drawers" (text fragments) in a ChromaDB-backed palace, organized as **wings → rooms → drawers**, with **closets** and cross-wing **tunnels** linking related memories. It ships a CLI and ~19 MCP tools, but no first-party graphical interface.

That's fine until your palace gets real. At a non-trivial size, tens of thousands of drawers across several wings, the CLI is the only window in. There's no way to browse the palace structurally, no way to *see* how memories relate across wings, no health visibility, and no way to inspect or curate a bad drawer without dropping into Python. Generic ChromaDB browsers don't help either: they don't understand the MemPalace domain model, and most require a running Chroma HTTP server, so they can't even read a local SQLite palace.

**MemPalace UI closes that gap.** It reads your local SQLite palace directly for fast, query-free browsing, and talks to the local MCP server for semantic search and live graph relationships. It's built on a deliberate design system, composed components on top of primitives with real design tokens, and it is keyboard-first throughout.

It is a single-user, local-first developer tool. There is no backend to deploy, no tenancy, no auth. All your data stays in `~/.mempalace/palace/`.

## What it does

- **The Observatory.** The home screen renders your *entire* palace as a living constellation: every memory a star, clustered and colored by wing, drifting against deep space. Hover a wing to make its cluster bloom, click to fly into it. It's the front door, and it's alive.
- **Browse.** A structural tree explorer (wings → rooms → drawers) with virtualized lists and a full drawer-detail panel: metadata, rendered markdown (with a raw toggle), provenance, embedding summary, closets, and tunnels. Works against SQLite alone, with the MCP server offline.
- **Search.** Semantic and keyword search with relevance scores, a visual metadata **filter rule builder** (AND/OR groups that round-trip to ChromaDB `$and`/`$or` `where` syntax), and per-wing query history.
- **Graph.** A WebGL force-directed view of the whole palace (160k+ nodes at ~120fps via cosmos.gl): wing-hue coloring, five color modes, three layout modes, cross-wing tunnel highlighting, and click-to-isolate 2-hop neighborhoods.
- **Keyboard-first UX.** A `Cmd+K` command palette, `J`/`K`/`Enter`/`Esc` navigation grammar, `g`-prefix jumps (`g b` browse, `g s` search), and a `?` cheatsheet auto-generated from the keybinding registry.

> **Roadmap:** drawer curation (inline edit, delete, bulk-move), context export (select drawers, then copy/download as Markdown or JSON), and a 0–100 palace health score are designed in the spec and on the way.

## Requirements

- **Node ≥ 20** (developed on 24)
- **pnpm ≥ 10** (the repo pins `pnpm@10.33.0` via `packageManager`; `corepack enable` will pick it up)
- A local **[MemPalace](https://github.com/MemPalace/mempalace) v3.3.4+** install with a palace at `~/.mempalace/palace/`
- **`mempalace-mcp`** running, required for semantic search, graph tunnels, and live data. Browse degrades gracefully and works **SQLite-only** when MCP is offline.

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs every app target through Turborepo: the web app at http://127.0.0.1:3000 and the design-system Storybook. Turbo builds the design-token CSS as a `dev` dependency first, so a fresh clone needs no separate build step.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `MEMPAL_PALACE_PATH` | `~/.mempalace/palace` | Path to the palace directory (its `chroma.sqlite3` is opened read-only). |
| `MEMPAL_UI_PORT` | `3000` | Port for the web app. Bound to `127.0.0.1` only, never exposed on the network. |

## Project structure

A pnpm and Turborepo monorepo, TypeScript throughout.

```
apps/
  web/            TanStack Start app (the UI)
  app-storybook/  Storybook for the design system
packages/
  design-tokens/  Framework-neutral tokens, compiled to a Tailwind preset
  ui/             @memui/ui: primitives (shadcn/radix), composed components, patterns
  palace-clients/ Node-only SQLite (read) and MCP (search/mutation) clients
  palace-types/   Shared MemPalace domain types
  config/         shared TypeScript and Biome presets
```

The data path is split by design. **SQLite is the read path** (fast, query-free browse via `better-sqlite3`, opened read-only) and the **MCP server is the search and mutation path**. The UI works in both modes and degrades gracefully to SQLite-only.

## Development

```bash
pnpm check-types   # type-check every package
pnpm lint          # Biome lint
pnpm test          # unit tests (Vitest)
pnpm build         # build all packages and apps
```

The codebase uses **Biome** (not ESLint/Prettier) for linting and formatting.

## License

MIT
