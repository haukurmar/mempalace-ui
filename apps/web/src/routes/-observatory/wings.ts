import { wingHues } from "@memui/design-tokens/graph";
import type { GraphNodeData } from "../../graph/renderer/GraphRenderer";
import { sortedUnique } from "../../graph/renderer/grouping";

/** How many wings (by drawer count) get a full, prominent label. */
const PROMINENT_COUNT = 7;

/**
 * A wing as the Observatory overlay paints it: the raw slug used everywhere as
 * the key (matches `nodes.wing`, the room-tree id, and the `/browse/$wing`
 * param), a prettified display label, the drawer count, the hue, and whether it
 * ranks among the prominent wings (full label) or the de-emphasized tail.
 */
export type WingMeta = {
	/** Raw wing slug — the canonical key and `/browse/$wing` param. */
	readonly wing: string;
	/** Prettified label (`wing_san_diego` → `San Diego`) for the serif name. */
	readonly label: string;
	/** Drawer count for the wing, from the room tree. */
	readonly count: number;
	/** Token wing hue (categorical), assigned exactly as the renderer assigns it. */
	readonly hue: string;
	/** Among the top wings by drawer count — gets a full, bright label. */
	readonly prominent: boolean;
};

/** Normalize a slug for dedup: drop a redundant leading `wing_` and casing. */
const normalizeWing = (slug: string): string => slug.replace(/^wing_/, "").toLowerCase();

/** Prettify a slug, stripping the redundant `wing_` prefix (`wing_san_diego` → `San Diego`). */
const prettifyWing = (slug: string): string =>
	slug
		.replace(/^wing_/, "")
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

/**
 * Build the wing overlay metadata. Three jobs:
 *  1. Hue — assigned by the wing's index in `sortedUnique(nodes.wing)`, the
 *     IDENTICAL ordering the color buffer uses, so a label's glow matches its
 *     cluster exactly.
 *  2. Dedup — the palace data carries both clean (`mempalace_ui`) and redundantly
 *     prefixed (`wing_mempalace_ui`) slugs for the same place; collapse them by
 *     normalized name, keeping the higher-count slug as canonical.
 *  3. Rank — sort by drawer count and flag the top few as prominent so only a
 *     curated handful carry full labels; the long tail recedes.
 */
export const buildWingMetas = (
	nodes: GraphNodeData,
	counts: ReadonlyMap<string, number>,
): readonly WingMeta[] => {
	const wings = sortedUnique(nodes.wing);

	// Collapse duplicates by normalized name, keeping the higher-count slug.
	const canonical = new Map<string, { wing: string; index: number; count: number }>();
	wings.forEach((wing, index) => {
		const key = normalizeWing(wing);
		const count = counts.get(wing) ?? 0;
		const existing = canonical.get(key);
		if (!existing || count > existing.count) canonical.set(key, { wing, index, count });
	});

	const ranked = Array.from(canonical.values()).sort((a, b) => b.count - a.count);

	return ranked.map((entry, rank) => ({
		wing: entry.wing,
		label: prettifyWing(entry.wing),
		count: entry.count,
		hue: wingHues[entry.index % wingHues.length] ?? wingHues[0],
		prominent: rank < PROMINENT_COUNT,
	}));
};
