/**
 * A "wing" is a top-level partition of the palace — the broadest
 * structural division (e.g. `kirkjuappid`, `mempalace_ui`, `seven`).
 * Live MemPalace v3.3.4+ identifies wings by snake_case slug; there
 * is no separate display name in the schema, so `name` and `id` are
 * the same string.
 *
 * Color is not part of the domain — it is a presentation hint
 * decorated at the UI rendering boundary (e.g. via a `WingDisplayMeta`
 * lookup keyed by wing id).
 */
export type Wing = {
	readonly id: string;
	readonly name: string;
	readonly drawerCount: number;
};

/**
 * Lightweight wing reference — the shape every drawer / search-result
 * card embeds. Strip the heavy `drawerCount` so list views can hand
 * compact wing references around without recomputing aggregates.
 *
 * Color is not part of the domain — see `Wing` above.
 */
export type WingSummary = {
	readonly id: string;
	readonly name: string;
};
