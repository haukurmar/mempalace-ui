## @memui/palace-types

Shared TypeScript types for the MemPalace domain model. One module per concept; consumers import either the barrel (`@memui/palace-types`) or a subpath when they only need a slice. Types are purely structural — no runtime, no validation, no I/O.

Targets the **MemPalace v3.3.4** schema (closets introduced v3.3.0, tunnels introduced v3.3.4); later versions that maintain the chromadb collection layout are expected to remain compatible. The schema gate (in `palace-clients`) asserts the sysdb migration version is at least 10 — adjust both packages together when upgrading the floor. Field names mirror the MCP response shape (`mempalace_get_drawer`, `mempalace_search`) with light normalization: snake_case wire keys (`drawer_id`, `source_file`, `filed_at`) become camelCase on the boundary into TypeScript.

Timestamps are ISO 8601 `string`, not `Date`, because every consumer crosses a TanStack Start server-function boundary as JSON.

---

### Layers

| Concept | File | Purpose |
|---------|------|---------|
| **Drawer** | `src/drawer.ts` | The unit of memory — `Drawer`, `DrawerSummary`, `DrawerHistoryEntry`. |
| **Wing** | `src/wing.ts` | Top-level palace partition — `Wing`, `WingSummary`. |
| **Room** | `src/room.ts` | Wing's second-level partition — `Room`, `RoomSummary`. |
| **Closet** | `src/closet.ts` | Curated drawer grouping (v3.3.0+) — `Closet`, `ClosetPointer`. |
| **Tunnel** | `src/tunnel.ts` | Cross-wing explicit link (v3.3.4) — `Tunnel`. |
| **Provenance** | `src/provenance.ts` | Created/updated/source/mode — `Provenance`, `MiningMode`. |
| **Embedding** | `src/embedding.ts` | Detail-panel embedding summary — `EmbeddingSummary`. |
| **Metadata** | `src/metadata.ts` | Recursive JSON-bag types — `MetadataValue`, `MetadataRecord`. |
| **Search** | `src/search.ts` | MCP `mempalace_search` shapes — `SearchResult`, `SearchScores`, `SearchResponse`. |

---

### Subpath exports

| Subpath | File | What it exports |
|---------|------|-----------------|
| `@memui/palace-types` | `src/index.ts` | Everything (re-exports all below) |
| `@memui/palace-types/drawer` | `src/drawer.ts` | `Drawer`, `DrawerSummary`, `DrawerHistoryEntry` |
| `@memui/palace-types/wing` | `src/wing.ts` | `Wing`, `WingSummary` |
| `@memui/palace-types/room` | `src/room.ts` | `Room`, `RoomSummary` |
| `@memui/palace-types/closet` | `src/closet.ts` | `Closet`, `ClosetPointer` |
| `@memui/palace-types/tunnel` | `src/tunnel.ts` | `Tunnel` |
| `@memui/palace-types/provenance` | `src/provenance.ts` | `Provenance`, `MiningMode` |
| `@memui/palace-types/embedding` | `src/embedding.ts` | `EmbeddingSummary` |
| `@memui/palace-types/metadata` | `src/metadata.ts` | `MetadataValue`, `MetadataRecord` |
| `@memui/palace-types/search` | `src/search.ts` | `SearchResult`, `SearchScores`, `SearchResponse` |

```ts
import type { Drawer }         from "@memui/palace-types/drawer";
import type { SearchResult }   from "@memui/palace-types/search";
import type { MetadataValue }  from "@memui/palace-types/metadata";
```

---

### Consumption model

This package is **workspace-only**. `main`/`types`/`exports` point at `.ts` source — there is no build step, no `dist/`. Consumers (`@memui/ui`, `@memui/palace-clients`, `apps/web`) compile the source directly through their own bundler / typecheck pipeline.

---

### Current scope

Pure types. No runtime helpers, no zod schemas, no validation. The composed components in `@memui/ui/src/components/` currently inline their own placeholder type definitions (`DrawerSummary`, `SearchResult`, `WingSummary`, `RoomNode`, `WingNode`, `MetadataValue`, `Provenance`, `MiningMode`, `ScopeWing`, `ScopeRoom`); a follow-up refactor will swap those imports to this package. Any field-name divergences between this package and the placeholders are intentional and follow the live MCP schema — see the field-mapping notes in each module's header comment.
