## Why

[MemPalace](https://github.com/MemPalace/mempalace) is a local AI memory system that stores tens of thousands of "drawers" (text fragments) in a ChromaDB-backed palace organized as wings → rooms → optional closets. It exposes ~19 MCP tools and a CLI, but **no first-party graphical interface**.

The visualization tools in adjacent open-source spaces don't close the gap on real palaces. SVG-based graph approaches cap around ~10K nodes, which fails immediately at typical palace sizes. Generic ChromaDB browsers don't understand MemPalace's domain model — wings, rooms, drawers, closets, tunnels — and require a running Chroma HTTP server, so they can't read a local SQLite palace at all. Both leave users on the CLI for browse / curate / verify workflows.

At a non-trivial palace size (the author's own palace is 87,177 drawers across 3 wings, 686 MB), the CLI is the only option. There's no way to browse structurally, no way to see relationships across wings, no health visibility, no way to curate bad drawers without dropping into Python. That gap blocks MemPalace from going from "interesting tool" to "daily driver" for anyone with a real-sized palace.

This proposal bootstraps a polished, MemPalace-native UI as a standalone project: a local web app that reads SQLite directly for fast browse, talks to the MCP server for live mutations and semantic search, and is built on a deliberate design system rather than vibes-driven AI-generated UI. The design is heavily informed by the author's philosophy from prior projects: build for the platform, not just the feature; reusable composed components on top of primitives; no AI slop.

## What Changes

This is a greenfield project — every capability below is **new**.

- **New monorepo:** pnpm + Turborepo, TypeScript-first, with a tokens package, a UI package (composed components on top of shadcn/radix primitives), a data-access package (SQLite + MCP clients), and one or more app targets (framework TBD — Next.js / TanStack Start / Vite + React Router are all candidates; deferred to design.md)
- **Local-first connectivity:** read-mostly path against the user's `~/.mempalace/palace/chroma.sqlite3`; live-mutation path against the local MCP server (`mempalace-mcp`). UI must work in both modes; SQLite-only mode degrades gracefully.
- **Raw structural browse** of the entire palace (wings → rooms → drawers, including the full chromadb record per drawer) without requiring any query
- **Semantic + keyword search** with a metadata filter rule builder (visual AND/OR groups with `$and`/`$or` round-trip), saved per-wing query history
- **Multi-wing WebGL graph** with cross-wing tunnel highlighting, layout-as-force-tuning (one simulation, three force configs), and 5 color modes (Room / Recency / Size / Decay / pre-computed Cluster)
- **Drawer curation:** view full record, inline markdown edit, delete, bulk-move between wings/rooms, with a per-drawer change log
- **Context export:** select N drawers and copy / download as markdown or JSON ("context bundle" for pasting into another AI session)
- **Palace Health Score:** 0–100 with structural gap detection (orphan rooms, near-duplicates, stale wings, broken closet pointers); every finding is clickable into a filtered view
- **Design system:** documented tokens, primitive layer (shadcn/radix), composed layer with named domain components (`DrawerCard`, `WingPill`, `MetadataTable`, `ScopeChip`, etc.), and pattern layer for repeated page compositions
- **Keyboard-first UX:** command palette (`Cmd+K`), J/K/Enter/Esc navigation, key-binding registry that auto-generates a `?` cheatsheet

## Capabilities

### New Capabilities
- `palace-connection`: Connect to a local palace via SQLite (read path) and the MemPalace MCP server (mutation/search path); switch modes; surface palace identity and health at a glance.
- `raw-palace-browse`: Structural tree explorer (palace → wing → room → drawer); raw drawer detail panel showing full chromadb record, metadata, closet pointers, and provenance; works without any query or filter.
- `palace-search`: Semantic search input with relevance scoring; visual metadata filter rule builder with AND/OR groups and `$and`/`$or` round-trip parsing; per-wing persistent query history.
- `palace-graph-view`: WebGL force-directed graph with multi-wing cross-tunnel highlighting; layout-as-force-tuning (Explode / Orbit / Cluster); 5 color modes; click-to-isolate 2-hop neighborhood.
- `drawer-curation`: View, inline-edit, delete, and bulk-move drawers between wings/rooms; per-drawer additive change-log metadata; confirmation flows for destructive operations.
- `context-export`: Select drawers from any view (browse / search / graph) and export the selection as markdown or JSON, optimized for pasting into another AI session as durable context.
- `palace-health`: Compute a 0–100 score with weighted deductions; surface structural findings (orphan rooms, near-duplicates, stale wings, broken closet pointers); every finding is a clickable filter.
- `design-system`: Design tokens package; primitive layer wrapping shadcn/radix; composed layer of named domain components; pattern layer for canonical page compositions; density modes; documented in a Storybook-or-equivalent.
- `keyboard-navigation`: Command palette as the primary affordance; J/K/Enter/Esc as the navigation grammar; centralized key-binding registry that auto-generates the `?` cheatsheet.

### Modified Capabilities
None — greenfield project. No existing specs to modify.

## Impact

- **New repository.** Will live outside the current working directory once scaffolded; this OpenSpec change is being drafted here for tooling convenience and will be transplanted into the new repo's `openspec/` directory before implementation begins.
- **New monorepo dependencies:** pnpm, Turborepo, TypeScript, Tailwind, shadcn/radix, a WebGL graph engine (cosmograph or PixiJS, decided in design.md), `better-sqlite3` for the SQLite read path, an MCP client for the mutation path.
- **External integrations:** MemPalace v3.3.4+ CLI and `mempalace-mcp` server (already installed for the author's environment). Spec assumes a single local user; multi-user / hosted operation is explicitly out of scope for v1 and noted as future work.
- **No backend services.** All data lives locally in `~/.mempalace/palace/`; the UI is a thin client. No server to deploy, no tenancy, no auth.
- **No translations required for v1.** The author's philosophy from other projects emphasizes Icelandic-first translations for end-user products; this UI is a developer tool with English copy only and may add other locales later.
