/**
 * A "room" is a wing's second-level partition — a hyphenated or
 * snake_case slug naming an idea cluster (e.g. `general`, `decision`,
 * `documentation`). Live MemPalace returns rooms as a `{ slug: count }`
 * map per wing; the slug is both id and display name on the wire.
 *
 * Rooms are uniquely identified by `(wingId, id)` — the same room slug
 * (`general`) exists in many wings. To avoid cross-wing collisions in
 * React keys, route params, and Map dedupe, `Room.id` is namespaced as
 * `<wingId>/<roomId>` (e.g. `mempalace_ui/general`). The bare slug
 * still appears in `Room.name` for breadcrumb display and in
 * `Drawer.roomId` for filter parity with the underlying chromadb
 * metadata.
 */
export type Room = {
	readonly id: string;
	readonly name: string;
	readonly wingId: string;
	readonly drawerCount: number;
};

/**
 * Lightweight room reference for embedding inside drawers and search
 * results, where the parent wing is known from context. `id` here is
 * the bare slug (matches `Drawer.roomId`); the namespaced form lives
 * on the full `Room` object.
 */
export type RoomSummary = {
	readonly id: string;
	readonly name: string;
};
