// Position + size buffer construction for the cosmos.gl adapter. Kept apart from
// the engine-lifecycle code (CosmographRenderer) so the layout math can evolve
// without churning the adapter shell.
//
// LAYOUT MODES (wave 12.4): every mode lays wings out as clusters on a ring so
// wings stay visually separate (the "force-tuning" the spec asks for is realized
// here as a geometric PRESET per mode). The 12.2 decision locked the engine to a
// STATIC layout (`enableSimulation: false`) for the 87k-node target, so we do
// not settle live forces; instead each mode is a deterministic target arrangement
// and the adapter tweens between them via cosmos's 600ms position transition —
// which delivers the spec's "600ms easing, no discontinuous jump" without the
// non-determinism of a live many-body settle.
//
// Positions are a PURE function of (node index, mode): a seeded hash drives the
// per-node jitter so switching explode → orbit → explode returns to the same
// explode arrangement (stable, reversible transitions).
import type { GraphLayoutMode, GraphNodeData } from "./GraphRenderer";
import { indexMap, sortedUnique } from "./grouping";

/** Virtual coordinate space the static layout is laid out within. */
export const SPACE_SIZE = 8192;

/**
 * Convert a `#RRGGBB` design-token hex into a normalized `[r, g, b]` triple in
 * the 0..1 range cosmos.gl expects. Token hex strings are the ONLY hex the
 * renderer sees — they come from `@memui/design-tokens`, never hardcoded here.
 */
export const hexToRgbFloat = (hex: string): [number, number, number] => {
	const clean = hex.replace("#", "");
	const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
	const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
	const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
	return [r, g, b];
};

/** Constant on-screen radius for every node; metric emphasis is by color, not size. */
const POINT_SIZE = 2;

const TWO_PI = Math.PI * 2;
// Phyllotaxis angle — fills the Orbit disc evenly so it reads as concentric rings.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Per-mode geometric preset.
 *   ringRadius — wing-cluster ring radius as a fraction of the space.
 *   spread     — per-node offset magnitude from the wing center, in space units.
 * Explode flings nodes wide; Cluster packs them tight; Orbit arranges them on a
 * structured disc at a middle distance.
 */
export const LAYOUT_PRESETS: Record<
	GraphLayoutMode,
	{ readonly ringRadius: number; readonly spread: number }
> = {
	explode: { ringRadius: 0.36, spread: SPACE_SIZE * 0.075 },
	orbit: { ringRadius: 0.32, spread: SPACE_SIZE * 0.085 },
	cluster: { ringRadius: 0.26, spread: SPACE_SIZE * 0.028 },
};

// Deterministic 0..1 hash of an integer with a salt (mulberry-style avalanche).
const hash01 = (value: number, salt: number): number => {
	let h = (value ^ salt) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
};

// Seeded gaussian pair (Box-Muller) for tight, organic per-wing clusters.
const gaussianAt = (index: number): [number, number] => {
	const u = 1 - hash01(index, 0x9e3779b1);
	const v = hash01(index, 0x85ebca77);
	const radius = Math.sqrt(-2 * Math.log(u));
	return [radius * Math.cos(TWO_PI * v), radius * Math.sin(TWO_PI * v)];
};

const wingCenters = (
	wings: readonly string[],
	ringRadius: number,
): Map<string, [number, number]> => {
	const centers = new Map<string, [number, number]>();
	const mid = SPACE_SIZE / 2;
	const radius = SPACE_SIZE * ringRadius;
	const denominator = Math.max(wings.length, 1);
	wings.forEach((wing, i) => {
		const angle = (i / denominator) * TWO_PI;
		centers.set(wing, [mid + Math.cos(angle) * radius, mid + Math.sin(angle) * radius]);
	});
	return centers;
};

/**
 * Build the `[x1, y1, x2, y2, …]` point-position buffer for a layout mode.
 * Wings sit on a ring; per-node offset depends on the mode (gaussian blob for
 * Explode/Cluster, golden-angle disc for Orbit).
 */
export const buildPositions = (nodes: GraphNodeData, mode: GraphLayoutMode): Float32Array => {
	const count = nodes.count;
	const positions = new Float32Array(count * 2);
	const preset = LAYOUT_PRESETS[mode];
	const wings = sortedUnique(nodes.wing);
	const centers = wingCenters(wings, preset.ringRadius);
	const mid = SPACE_SIZE / 2;

	// Per-wing counts + running sequence index drive the Orbit phyllotaxis disc.
	const wingCounts = new Map<string, number>();
	for (const wing of nodes.wing) wingCounts.set(wing, (wingCounts.get(wing) ?? 0) + 1);
	const wingSeq = new Map<string, number>();

	for (let i = 0; i < count; i++) {
		const wing = nodes.wing[i] ?? "";
		const center = centers.get(wing) ?? [mid, mid];
		let offsetX: number;
		let offsetY: number;
		if (mode === "orbit") {
			const seq = wingSeq.get(wing) ?? 0;
			wingSeq.set(wing, seq + 1);
			const total = wingCounts.get(wing) ?? 1;
			const radius = preset.spread * Math.sqrt((seq + 0.5) / total);
			const angle = seq * GOLDEN_ANGLE;
			offsetX = Math.cos(angle) * radius;
			offsetY = Math.sin(angle) * radius;
		} else {
			const [gx, gy] = gaussianAt(i);
			offsetX = gx * preset.spread;
			offsetY = gy * preset.spread;
		}
		positions[i * 2] = center[0] + offsetX;
		positions[i * 2 + 1] = center[1] + offsetY;
	}

	return positions;
};

/** Build the constant point-size buffer. */
export const buildSizes = (nodes: GraphNodeData): Float32Array => {
	const sizes = new Float32Array(nodes.count);
	sizes.fill(POINT_SIZE);
	return sizes;
};

// Re-exported so color builders agree on the wing ordering used for centers.
export { indexMap, sortedUnique };
