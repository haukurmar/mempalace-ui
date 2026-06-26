## Context

This is a greenfield project — no existing repo, no existing code, no existing users. The design must justify every architectural choice from scratch and pick technology that the author (Hawk) will be comfortable reasoning about based on conventions established in his other TypeScript projects.

The target environment is a single user's local machine running macOS or Linux with MemPalace v3.3.4+ already installed. The app reads `~/.mempalace/palace/chroma.sqlite3` directly and talks to the local `mempalace-mcp` server for live mutations and semantic search. There is no production deployment, no multi-tenancy, no auth — just a polished local UI that opens in a browser tab when the user runs `pnpm dev`.

Constraints:
- Must perform well on a 87K-drawer / 686 MB palace today, with headroom for 500K+
- Must not corrupt the palace under any circumstance — `mempalace mine` may be writing concurrently
- Must work even if the MCP server is offline (read-only degradation)
- Must look and feel deliberate. AI-slop layouts are unacceptable; reusable composed components on top of primitives are mandatory

Stakeholders: the author and any developer who clones the repo to use it on their own palace.

## Goals / Non-Goals

**Goals:**
- A pleasant, dense, keyboard-driven UI for browsing and curating a real-sized MemPalace palace
- Type safety end-to-end (DB schema → API → client)
- Modular monorepo where the design system is consumable independently of the app
- Foundations sturdy enough that v2 features (palace-health, palace-graph-view at scale) plug in cleanly
- A development setup that boots in under 10 seconds with `pnpm dev`

**Non-Goals (v1):**
- Multi-user / hosted operation (no auth, no tenancy, no remote palace)
- Mobile / responsive layouts below desktop breakpoints (this is a developer tool)
- Native packaging (no Electron / Tauri shell — runs as a TanStack Start app served locally)
- Localization (English-only for v1)
- Writing data outside MemPalace's MCP API (no direct SQLite mutation; only writes via `mempalace-mcp`)

## Decisions

### D1. Framework: **TanStack Start**

TanStack Start is a full-stack React framework built around TanStack Router and TanStack Query. It bundles file-based routing, server functions (type-safe client→server RPC), API routes, and SSR/streaming into one toolchain. For this project, server functions handle SQLite reads and MCP calls; the client uses TanStack Query for cache and TanStack Router for navigation.

**Why this is the right pick here:**
- **One framework, one mental model.** No separate backend process, no extra HTTP framework, no extra RPC layer. Server functions ARE the API.
- **End-to-end type safety without tRPC.** Server functions are typed by the function signature alone — no schema package, no codegen.
- **TanStack-native end-to-end.** Router + Query + Start share types and conventions; the developer experience is unusually coherent.
- **`better-sqlite3` runs inside server functions.** Same as Next.js route handlers, but with tighter integration with the route tree and TanStack Query hydration.
- **Matches the author's preference** for the TanStack ecosystem and his stated interest in trying TanStack Start on a low-stakes project.

**Alternatives considered:**
- **Next.js App Router** — solid, more battle-tested, the author's existing comfort zone. Rejected because TanStack Start delivers the same shape with TanStack-native ergonomics the author prefers, and the downside risk on a single-user developer tool is negligible.
- **Vite + React + TanStack Router + a separate Hono+tRPC backend** — what an earlier draft of this design called for. Rejected as over-engineered: introduces a separate process, a separate framework (Hono), and an extra type-safety layer (tRPC) that TanStack Start collapses into one app.
- **Remix** — capable but its design centers on form-driven mutations; this app is more graph-and-search than form-and-action.
- **Tauri / Electron** — native packaging out of scope for v1. Re-evaluate when distributing as a polished installable app.

### D2. Server runtime: **TanStack Start server functions + better-sqlite3**

All server-side work (SQLite reads, MCP RPC calls, filesystem watching, version probing) lives in TanStack Start's server functions and API routes — no separate Node server, no Hono, no tRPC.

`better-sqlite3` is the fastest sync-SQLite Node binding; perfect inside server functions since SQLite reads are CPU-bound and don't benefit from async. MCP calls go out from server functions over a JSON-RPC client (transport TBD: stdio to a child `mempalace-mcp` process, or HTTP to a port the user starts manually — research and pick during the palace-clients phase).

**Why not call MCP directly from the browser?** Two reasons:
1. We need SQLite read access for the raw-browse view; that requires Node, which TanStack Start gives us via server functions.
2. Centralizing both data sources behind server functions gives the frontend a single, type-safe contract regardless of where data actually comes from.

**Alternatives considered:**
- **TanStack Start API routes only (no server functions)** — works, but server functions are the more direct ergonomics for this RPC-style use case.
- **Direct browser-to-MCP** — would still need a separate path for SQLite, defeating the unification goal.

### D3. Graph engine: **`cosmos.gl`** for v1 — VERIFIED by 12.1 benchmark

`cosmos.gl` (the renamed/current `@cosmos.gl/graph`, successor to `@cosmograph/cosmograph`) is a WebGL force-directed graph that demonstrably handles 1M+ nodes. SVG-based force-graph approaches explicitly top out around 10K — known dead end at our scale.

**12.1 benchmark result (verified 2026-06-26, real palace, Apple M5 Pro / ANGLE Metal — hardware GPU, representative):**
- **164,062 real nodes** (the palace has grown past the spec's 87K), full zoom-to-fit, scripted pan/zoom, 1,191 frames sampled.
- **median 120.5 fps** (criterion ≥30) · mean 120 fps · **0% of frames >33ms** (criterion <10%) · p95 frame 9.4ms · max 10.4ms.
- SQL query 325ms · data load (rpc) 712ms · layout build 26ms.
- **Verdict: PASS, decisively. cosmos.gl is locked for v1; the PixiJS fallback is not needed.** Sandbox: throwaway `/graph-bench` route (deleted after this phase); rerun on other hardware via the scratch `run-bench.mjs` Playwright driver (system Chrome, real GPU).

**Alternatives considered:**
- **PixiJS + custom force layout** — more flexible, but a lot of engineering to reinvent what cosmograph gives us out of the box.
- **sigma.js + graphology** — capable, but the API is heavier and the render quality reportedly trails cosmograph at high node counts.
- **D3 force on SVG** — known dead end above ~10K.
- **regl** — too low-level for v1; revisit if cosmograph hits a wall.

### D4. Design system architecture (the anti-AI-slop layer)

Five layers, top → bottom:

1. **Tokens (`packages/design-tokens`)** — TypeScript modules exporting design tokens (colors, spacing, typography, radii, shadows, motion). Compiled to CSS variables. Tailwind config consumes the same source via `@theme`.
2. **Primitives (`packages/ui/src/primitives`)** — shadcn/ui components installed via shadcn CLI but committed to our repo and styled exclusively through tokens. shadcn → radix → us.
3. **Composed (`packages/ui/src/components`)** — named domain components: `DrawerCard`, `WingPill`, `RoomTree`, `ScopeChip`, `MetadataTable`, `ResultRow`, `FilterRuleBuilder`, `CommandBar`, `KeyboardHint`, `ProvenanceFooter`, `EmptyState`, `LoadingState`, `ErrorState`, `DrawerEditor`. Every screen uses these — no bare primitives in pages.
4. **Patterns (`packages/ui/src/patterns`)** — canonical page compositions: `ListDetailLayout`, `GraphPanelLayout`, `SettingsLayout`. New pages pick a pattern.
5. **Density modes** — comfortable / compact / dense via `data-density` on `<html>`. Tokens respond.

Documented in **Storybook** with a story per composed component covering empty, loading, error, and success states. Visual regression via `@storybook/test-runner` + Playwright snapshots.

**Alternatives considered:**
- **No tokens package, just Tailwind config** — token reuse across TS code (e.g. graph color modes) becomes painful.
- **Material UI / Chakra** — opinionated component sets that aren't easily refactorable into our own composed layer.
- **Pure shadcn without a composed layer** — exactly the AI slop we're avoiding.

### D5. Monorepo layout

```
apps/
  web/                  — TanStack Start app (UI + server functions in one)        [name: "web"]
  app-storybook/        — Storybook 8 app for the UI package                       [name: "app-storybook"]
packages/
  design-tokens/        — design tokens (CSS vars + TS exports)                    [@memui/design-tokens]
  ui/                   — primitives + composed + patterns                         [@memui/ui]
  palace-clients/       — SQLite client + MCP client + connection orchestration    [@memui/palace-clients]
  palace-types/         — shared TS types: Drawer, Wing, Room, Closet, Tunnel      [@memui/palace-types]
  config/
    biome/              — shared Biome presets (base, react-library, tanstack-start) [@memui/biome-config]
    typescript/         — shared tsconfig presets                                  [@memui/typescript-config]
```

All packages publish under the `@memui/` npm scope; apps remain unscoped. Turborepo orchestrates `dev` (parallel: `web` + `app-storybook`), `build`, `test`, `lint`, `typecheck`. pnpm workspace catalog pins TypeScript, React, and other shared deps. `@memui/palace-clients` is marked Node-only and never imported into client code paths.

### D6. Connection lifecycle

The TanStack Start app boots a server-side initialization step that:
1. Resolves the palace path (default `~/.mempalace/palace/`, override via `MEMPAL_PALACE_PATH` env)
2. Opens SQLite in read-only mode (`readonly: true`, `busy_timeout=5000`); chromadb manages the journal mode (rollback journaling — we do NOT enable WAL, since switching journal mode would persist on disk and break the writer)
3. Probes `mempalace-mcp` via `which` and a no-op JSON-RPC call. Caches the connection but doesn't fail boot if MCP is down — the UI surfaces a "MCP unavailable" banner and disables write actions.
4. Watches the palace dir on the server side; pushes change events to the client via TanStack Start's streaming response or a polling server function (final mechanism decided during the palace-connection feature phase) so TanStack Query caches invalidate transparently.

### D7. Drawer write path

Mutations go exclusively through `mempalace-mcp` (`mempalace_update_drawer`, `mempalace_delete_drawer`, `mempalace_add_drawer`). Never write to SQLite directly — risks cache divergence and HNSW corruption. If MCP is unavailable, write actions are disabled in the UI with a clear explanation.

## Risks / Trade-offs

- **better-sqlite3 native binding** → installs differently per OS/Node version. **Mitigation:** pin Node version via `.nvmrc`; document the prebuilt-binary fallback; CI matrix on macOS/Linux.
- **SQLite read while mempalace writes** → potential read inconsistency mid-mining. **Mitigation:** the `readonly: true` handle uses shared locks and chromadb's rollback-journal-based locking serializes against the writer; `busy_timeout=5000` lets brief contention wait rather than throw; UI shows a subtle "indexing" indicator when activity is detected; queries auto-refetch when activity ends.
- **cosmograph at 87K nodes** is documented but not personally verified yet. **Mitigation:** the design-system phase includes a graph-prototype task that loads the real palace and benchmarks frame rate before locking in the choice. Fallback is PixiJS.
- **MCP server may be on a different chromadb/MemPalace version than what the SQLite was written by** → drift. **Mitigation:** read schema version on connect; refuse to operate on versions older than v3.3.4 with a clear upgrade prompt.
- **MemPalace MCP API is undocumented and may break across versions.** **Mitigation:** wrap every MCP call in `palace-clients/` with version-gated codepaths; integration tests pinned to a known mempalace version.
- **Multi-tab usage** — two browser tabs both writing through the same in-process server. **Mitigation:** TanStack Query cache invalidation on mutations covers most cases; explicit reload prompt on chroma.sqlite3 change.
- **TanStack Start maturity** — younger ecosystem than Next.js, smaller community, more frequent API churn. **Mitigation:** pin TanStack Start version per release; track upstream issues; the framework's surface area used here (server functions + Router + Query) is the most stable subset; if the project hits a wall we can port to Next.js App Router with route handlers in roughly a day given the spec is framework-agnostic.
- **Storybook + TanStack Start build** — Storybook integrates fine with Vite-based builds (TanStack Start uses Vite under the hood) but needs care to avoid loading server-function modules into stories. **Mitigation:** Storybook only loads UI components, never server functions; mock data lives in `palace-types` for story fixtures.

## Migration Plan

Greenfield project — no migration needed. The only relocation is moving this OpenSpec change directory from the current monorepo's `openspec/changes/bootstrap-mempalace-ui/` into the new repo's `openspec/changes/bootstrap-mempalace-ui/` once the new repo is initialized. The `git mv` happens after the new repo's pnpm + Turborepo skeleton is committed in its first commit, so the openspec history starts fresh.

Rollback: not applicable. If the project is abandoned, no production system is affected.

## Open Questions

1. **Storybook vs Ladle vs nothing.** Storybook is the safe choice but heavy; Ladle is leaner but less battle-tested. Recommendation: **Storybook**, accept the tooling weight for the visual-regression story.
2. **Native packaging path for v2.** Tauri (Rust + WebView, smaller binaries) vs Electron (familiar, heavier). Defer the decision until v1 is shipped.
3. **Telemetry / error reporting for the author's own use.** Sentry? PostHog? Or nothing for v1? Recommendation: nothing for v1; revisit if the tool stops being a single-user developer tool.
4. **Design-system color philosophy.** The v3.0+ MemPalace branding leans cyan/purple. Should our design echo it, deliberately diverge, or stay neutral? Recommendation: neutral-but-warm with a single accent color the user can theme later. Decide in the design-system spec phase.
