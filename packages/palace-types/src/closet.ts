/**
 * A "closet" is a v3.3.0+ MemPalace concept — a named curated grouping of
 * drawers within a wing/room (think: a saved collection or pinned
 * sub-bundle). The full closet object lives elsewhere in the palace; on
 * a drawer record we only need a *pointer* (id + display name) so the
 * detail panel can list "this drawer is referenced by closets X, Y, Z".
 */
export type ClosetPointer = {
	readonly id: string;
	readonly name: string;
	readonly wingId: string;
	readonly roomId?: string;
};

/**
 * Full closet record. The drawer list is intentionally `readonly string[]`
 * of drawer ids — closets reference drawers but don't own their content.
 */
export type Closet = {
	readonly id: string;
	readonly name: string;
	readonly wingId: string;
	readonly roomId?: string;
	readonly drawerIds: readonly string[];
	readonly createdAt: string;
	readonly updatedAt?: string;
};
