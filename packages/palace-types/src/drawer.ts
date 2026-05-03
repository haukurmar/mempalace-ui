import type { ClosetPointer } from "./closet";
import type { EmbeddingSummary } from "./embedding";
import type { MetadataRecord } from "./metadata";
import type { Provenance } from "./provenance";
import type { Tunnel } from "./tunnel";

/**
 * A "drawer" is the unit of memory — a single text fragment with metadata
 * and an embedding, stored in chromadb and partitioned by wing/room.
 *
 * Field names mirror the live MemPalace v3.3.4+ MCP response from
 * `mempalace_get_drawer`: `drawer_id` → `id`, `wing` → `wingId`,
 * `room` → `roomId`. Provenance fields (`createdAt`, `sourcePath`,
 * `miningMode`) are normalized off the metadata record's `filed_at`,
 * `source_file`, and `added_by` keys so consumers don't need to know
 * the raw mining vocabulary.
 *
 * `roomId` is the bare slug (e.g. `general`), not the namespaced form
 * `Room.id` uses (`<wingId>/<roomId>`); chromadb's `room` metadata key
 * also stores the bare slug.
 *
 * `embedding`, `closets`, and `tunnels` are optional because the
 * SQLite read path can return a drawer without computing those — the
 * detail panel hydrates them lazily.
 */
export type Drawer = {
	readonly id: string;
	readonly content: string;
	readonly wingId: string;
	readonly roomId: string;
	readonly metadata: MetadataRecord;
	readonly provenance: Provenance;
	readonly embedding?: EmbeddingSummary;
	readonly closets?: readonly ClosetPointer[];
	readonly tunnels?: readonly Tunnel[];
	readonly history?: readonly DrawerHistoryEntry[];
};

/**
 * Compact drawer reference — what list views, search results, and
 * neighborhood panels hand around. Carries enough to render a
 * `DrawerCard` (snippet + wing + room + recency) without forcing a
 * full record load.
 */
export type DrawerSummary = {
	readonly id: string;
	readonly contentSnippet: string;
	readonly wingId: string;
	readonly roomId: string;
	readonly createdAt: string;
	readonly updatedAt?: string;
	readonly bytes?: number;
};

/**
 * A single entry in a drawer's append-only edit log. The curation
 * feature (task group 13) appends one of these to the drawer's
 * `history` metadata array on every edit, move, or content change.
 * Free-form `details` carries change-specific data (e.g. previous
 * room id on a move; diff hash on an edit).
 */
export type DrawerHistoryEntry = {
	readonly at: string;
	readonly kind: "edit" | "move" | "delete" | "create";
	readonly by?: string;
	readonly details?: MetadataRecord;
};
