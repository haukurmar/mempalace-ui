## 1. Monorepo bootstrap

- [ ] 1.1 Initialize the new repository (separate from this drafting repo) with `pnpm init` and `git init`, commit a baseline `.gitignore`, `README.md`, and license
- [x] 1.2 Create the pnpm workspace at `pnpm-workspace.yaml` with globs `apps/*`, `packages/*`, and `packages/**/*` (the double-star is required because the config packages live at `packages/config/biome` and `packages/config/typescript`). Define a `catalog:` block pinning shared external deps (`typescript`, `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-start`, `tailwindcss`); each `package.json` references catalog entries with `"<dep>": "catalog:"`. Internal monorepo packages reference each other via `workspace:*`. All packages publish under the `@memui/` npm scope (`@memui/design-tokens`, `@memui/ui`, `@memui/palace-clients`, `@memui/palace-types`, `@memui/biome-config`, `@memui/typescript-config`); apps remain unscoped (`web`, `app-storybook`). pnpm runs with isolated installs (the default `node-linker: isolated`).
- [x] 1.3 Install Turborepo and create `turbo.json` with `dev`, `build`, `test`, `lint`, `typecheck` pipelines
- [ ] 1.4 Add `packages/config/typescript/` (`@memui/typescript-config`) with `base.json`, `react-app.json`, `node-app.json` presets
- [ ] 1.5 Add `packages/config/biome/` (`@memui/biome-config`) with shared presets `base.json`, `react-library.json`, and `tanstack-start.json` (each `extends` the next up the chain); configure rules that flag raw hex codes / arbitrary Tailwind values; consumers reference the appropriate preset from their local `biome.json`

## 2. Design tokens package

- [ ] 2.1 Scaffold `packages/design-tokens/` with `package.json`, tsconfig extending `@memui/typescript-config/base.json`, and a `src/` entry point
- [ ] 2.2 Author color tokens (semantic + palette) as a TypeScript module with neutral-warm base + single accent (final color decision in `04-design-system-spec` follow-up)
- [ ] 2.3 Author spacing, typography, radii, shadow, and motion token modules
- [ ] 2.4 Build a `generate-css.ts` script that emits CSS custom properties from the TS modules into `dist/tokens.css`
- [ ] 2.5 Wire the same source into a Tailwind preset exported from `packages/design-tokens/tailwind.preset.ts`
- [ ] 2.6 Add a vitest unit test that asserts every token in TS has a matching CSS variable in the generated file
- [ ] 2.7 Add density-mode token variants keyed by `[data-density="compact"]` and `[data-density="dense"]`

## 3. UI package skeleton + Storybook app

- [ ] 3.1 Scaffold `packages/ui/` (`@memui/ui`) with `package.json`, tsconfig, and `src/{primitives,components,patterns,index.ts}` directories
- [ ] 3.2 Scaffold `apps/app-storybook/` with Storybook 8 (Vite builder); configure it to consume `@memui/design-tokens` CSS globally and to surface every story file under `packages/ui/src/`
- [ ] 3.3 Install shadcn/ui CLI and configure it to write into `packages/ui/src/primitives/`
- [ ] 3.4 Install primitives needed for v1: `Button`, `Dialog`, `Popover`, `Command`, `Sheet`, `Tooltip`, `DropdownMenu`, `Input`, `Select`, `Toggle`, `Toast`, `Separator`, `ScrollArea`
- [ ] 3.5 Replace every hex/arbitrary value in installed primitives with token references; verify the lint rule passes
- [ ] 3.6 Add a Biome lint rule that forbids importing from `packages/ui/src/primitives/*` outside of `packages/ui` itself
- [ ] 3.7 Add `@storybook/test-runner` + Playwright snapshot config for visual regression inside `apps/app-storybook/`

## 4. Composed component layer

- [ ] 4.1 Build `EmptyState`, `LoadingState`, `ErrorState` with stories covering their canonical messaging
- [ ] 4.2 Build `KeyboardHint` (renders a key combo as styled `<kbd>` chips) with stories
- [ ] 4.3 Build `WingPill` and `ScopeChip` (small badges showing wing or room scope) with stories
- [ ] 4.4 Build `MetadataTable` (the canonical key-value rendering used everywhere drawer metadata appears) with stories for nested objects and large value counts
- [ ] 4.5 Build `ProvenanceFooter` (timestamp, source path, mining mode) with stories
- [ ] 4.6 Build `DrawerCard` (compact card representation used in selection, search results, neighborhood panels) with stories
- [ ] 4.7 Build `ResultRow` (search result row with snippet, scores, breadcrumb) with stories
- [ ] 4.8 Build `RoomTree` (recursive tree component for the sidebar) with stories for empty / single-wing / many-wing palaces
- [ ] 4.9 Build `FilterRuleBuilder` (visual AND/OR groups with type-aware operators; round-trips to `$and`/`$or` JSON) with stories
- [ ] 4.10 Build `CommandBar` (the `Cmd+K` palette shell — registers actions, shows history; integrated with keyboard registry from task group 11)
- [ ] 4.11 Build `DrawerEditor` (markdown editor with live preview, used in edit + add) with stories
- [ ] 4.12 Verify a precommit check fails when a composed component lacks a `.stories.tsx` neighbor

## 5. Pattern layer

- [ ] 5.1 Build `ListDetailLayout` (sidebar tree + main list + slide-over detail panel)
- [ ] 5.2 Build `GraphPanelLayout` (full-canvas graph + bottom-anchored drawer panel + floating control cluster)
- [ ] 5.3 Build `SettingsLayout` (left-nav + right pane)
- [ ] 5.4 Document each pattern's intended use in a Storybook docs page

## 6. Shared types and clients

- [ ] 6.1 Scaffold `packages/palace-types/` with `Drawer`, `Wing`, `Room`, `Closet`, `Tunnel`, `Provenance`, `EmbeddingSummary` interfaces matching MemPalace v3.3.4 schema
- [ ] 6.2 Scaffold `packages/palace-clients/` (Node-only — never imported into client code paths) with two clients: `sqliteClient` (better-sqlite3, read-only WAL) and `mcpClient` (JSON-RPC over the local mempalace-mcp stdio or HTTP transport — research and pick)
- [ ] 6.3 Implement `getDrawer`, `listDrawersByRoom`, `listWings`, `listRooms`, `getStatus`, `getDrawerEmbeddingSummary` in `sqliteClient`
- [ ] 6.4 Implement `searchSemantic`, `updateDrawer`, `deleteDrawer`, `addDrawer`, `findTunnels` in `mcpClient`
- [ ] 6.5 Add a `connect()` orchestrator that probes both clients and returns a connection status + version metadata
- [ ] 6.6 Add unit tests with a fixture palace database for read-path operations
- [ ] 6.7 Add integration tests that spin up `mempalace-mcp` against a fixture palace for write-path operations

## 7. TanStack Start app scaffold

- [ ] 7.1 Scaffold `apps/web/` with TanStack Start, React 19, TypeScript, Tailwind consuming the `@memui/design-tokens` preset
- [ ] 7.2 Configure file-based routes via TanStack Router; create the root layout and a placeholder `/` route
- [ ] 7.3 Wire the root layout with `ToastProvider`, density `data-attribute` from settings, and the keyboard registry root
- [ ] 7.4 Configure TanStack Query with a default staleTime appropriate for SQLite-backed reads; integrate with TanStack Start's hydration
- [ ] 7.5 Document and lock the default port (3000 or override via `MEMPAL_UI_PORT`); bind to `localhost` only

## 8. Server functions (inside apps/web)

- [ ] 8.1 Add a server-side bootstrap that resolves `MEMPAL_PALACE_PATH`, opens SQLite WAL read-only, and probes `mempalace-mcp` once at boot; cache the connection state on a server-side singleton
- [ ] 8.2 Implement the version compatibility gate (refuse to operate below v3.3.4); return a typed `IncompatiblePalaceError` from any server function when the gate fails
- [ ] 8.3 Implement `getStatus`, `listWings`, `listRooms`, `listDrawersByRoom`, `getDrawer` as server functions calling `palace-clients/sqliteClient`
- [ ] 8.4 Implement `searchSemantic`, `updateDrawer`, `deleteDrawer`, `addDrawer`, `findTunnels` as server functions calling `palace-clients/mcpClient`; throw a typed `McpUnavailableError` when MCP is offline
- [ ] 8.5 Implement palace-dir filesystem watch on the server side with debounced (500ms) change events; expose them to the client via TanStack Start streaming or a polling server function (decide during this task)
- [ ] 8.6 Add unit tests for each server function using a fixture palace
- [ ] 8.7 Create a `/connection` route wired to `palace-connection` spec scenarios (resolved path, version gate, MCP banner)

## 9. Feature: raw palace browse

- [ ] 9.1 Implement the `RoomTree` data source: a server function that returns the full structural tree with counts; loaded via TanStack Router route loader
- [ ] 9.2 Implement the `/browse/$wing` route showing a virtualized list of all drawers in a wing using `react-virtual`
- [ ] 9.3 Implement the `/browse/$wing/$room` route scoped to a single room
- [ ] 9.4 Implement the drawer detail slide-over (`MetadataTable` + markdown render + raw toggle + embedding summary + provenance + closets + tunnels)
- [ ] 9.5 Verify the route works end-to-end with MCP offline (read-only browse)
- [ ] 9.6 Add Playwright integration tests for tree expand, virtualization frame budget, and detail panel field visibility

## 10. Feature: palace search

- [ ] 10.1 Implement the always-available top-bar search input with `Cmd+K` shortcut and history dropdown
- [ ] 10.2 Wire the search to a `searchSemantic` server function that calls `mempalace_search` via MCP
- [ ] 10.3 Render results with `ResultRow`, sorted by combined relevance, with click-through to the detail panel
- [ ] 10.4 Implement the `FilterRuleBuilder` integration on the search page; round-trip filters to/from chromadb `$and`/`$or` JSON
- [ ] 10.5 Persist per-wing query history in localStorage with a 20-entry cap
- [ ] 10.6 Playwright tests covering keyboard shortcut, history, filter round-trip, and results rendering

## 11. Feature: keyboard navigation

- [ ] 11.1 Build the `useKeybind({ keys, label, scope, handler })` hook and the registry context
- [ ] 11.2 Implement scope-aware dispatch (global vs panel-scoped vs editor-scoped)
- [ ] 11.3 Wire `CommandBar` to consume the registry as its action source
- [ ] 11.4 Implement the `?` cheatsheet that auto-renders from the registry
- [ ] 11.5 Apply J/K/Enter/Esc grammar to `RoomTree`, browse table, and search results
- [ ] 11.6 Add Playwright tests verifying every binding declared in the registry actually fires

## 12. Feature: palace graph view

- [ ] 12.1 Build a benchmarking sandbox that loads the real palace into cosmograph and measures FPS at full size; document results
- [ ] 12.2 If cosmograph holds the budget, implement `/graph` route with cosmograph; otherwise switch fallback to PixiJS and update design.md
- [ ] 12.3 Implement multi-wing rendering with hue-family-per-wing visual distinction
- [ ] 12.4 Implement layout-as-force-tuning across Explode / Orbit / Cluster modes (keys 1/2/3) with smooth transitions
- [ ] 12.5 Implement the 5 color modes via `C` keybind cycle; cluster mode reads precomputed `clusterId` metadata
- [ ] 12.6 Implement click-to-isolate 2-hop neighborhood mode entered via `L`; exit via `Esc`
- [ ] 12.7 Implement cross-wing tunnel highlighting toggle
- [ ] 12.8 Add a one-shot worker (`packages/palace-clients` script) that precomputes cluster IDs and persists them to drawer metadata via MCP

## 13. Feature: drawer curation

- [ ] 13.1 Implement the inline `DrawerEditor` with markdown live preview and save/cancel
- [ ] 13.2 Wire save to `mempalace_update_drawer` via MCP; show a toast on success
- [ ] 13.3 Implement single-drawer delete with confirmation modal showing snippet
- [ ] 13.4 Implement multi-select via shift-click and `Cmd+Click` on browse and search tables; show a selection toolbar
- [ ] 13.5 Implement bulk move with target picker, progress feedback, and partial-failure handling
- [ ] 13.6 Append a `history` metadata entry on every edit / move
- [ ] 13.7 Render the history list in the drawer detail panel
- [ ] 13.8 Disable every write surface with explanatory tooltip when MCP is offline

## 14. Feature: context export

- [ ] 14.1 Implement a selection store keyed per-view (browse / search / graph) so selections survive panel toggles
- [ ] 14.2 Implement the export dialog with format toggle (Markdown / JSON), action toggle (Copy / Download), and live size estimate
- [ ] 14.3 Implement the markdown serializer matching the spec's header + per-drawer section format
- [ ] 14.4 Implement the JSON serializer with the documented shape
- [ ] 14.5 Add a Playwright test asserting clipboard contents for both formats

## 15. Feature: palace health

- [ ] 15.1 Implement health computation as a server function covering orphan rooms, near-duplicates (cosine > 0.95), stale wings (>90d), broken closet pointers
- [ ] 15.2 Persist the most recent score + findings in a `~/.mempalace/palace.health.json` cache so reloads don't re-run a full scan
- [ ] 15.3 Implement the dashboard page rendering the score bar and findings list
- [ ] 15.4 Make every finding clickable; clicks navigate to a pre-filtered browse view with a chip explaining the source finding
- [ ] 15.5 Implement automatic recompute on app boot (after a 30s grace) and a manual "Refresh health" action

## 16. Polish + documentation

- [ ] 16.1 Add a public README with screenshots, setup steps, and the keyboard cheatsheet rendered as a static table
- [ ] 16.2 Add a CONTRIBUTING.md describing the design-system layers and the lint rules that enforce them
- [ ] 16.3 Wire up CI: `pnpm typecheck`, `pnpm lint`, `pnpm test`, Storybook visual regression
- [ ] 16.4 Verify every spec scenario has at least one passing test (unit, integration, or Playwright)
- [ ] 16.5 Run a manual end-to-end checklist on a real palace: connect, browse, search, edit, delete, export, graph at full size, health refresh
- [ ] 16.6 Tag v0.1.0 and write a release blurb
