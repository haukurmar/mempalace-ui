// Ambient (Observatory) star-field buffers. The interactive /graph view paints
// every drawer at a constant size + alpha; the Observatory instead fakes a deep,
// three-dimensional galaxy from the same node set by tiering each node into a
// depth band (near / mid / far) and giving the bands distinct size + alpha +
// glow. A sparse handful of brilliant near stars, a rich mid-field, and fine far
// dust — driven by a seeded hash so the field is STABLE across re-renders (it
// breathes, it doesn't flicker randomly).
import { buildColorBuffer } from "./colors";
import type { GraphColorMode, GraphNodeData } from "./GraphRenderer";
import { sortedUnique } from "./grouping";
import { SPACE_SIZE } from "./layout";

// Mulberry-style avalanche hash → 0..1, salted (same family as layout's jitter).
const hash01 = (value: number, salt: number): number => {
	let h = (value ^ salt) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
};

const TIER_SALT = 0x27d4eb2f;
const JITTER_SALT = 0x9e3779b1;
const GAUSS_U_SALT = 0x85ebca77;
const GAUSS_V_SALT = 0xc2b2ae35;

const TWO_PI = Math.PI * 2;

// Ambient layout: a WIDE wing ring (fills the frame) with TIGHT cluster cores
// (so overlapping points stack into bright, glowing nuclei — the drama the
// diffuse /graph "explode" preset lacks). Kept here, not in the shared layout
// presets, so it never alters the interactive graph.
/** Wing-ring radius as a fraction of the space — wider than any /graph preset. */
export const AMBIENT_RING_RADIUS = 0.34;
/** Overall ring offset (radians) for a pleasing default orientation. */
const AMBIENT_RING_ROTATION = -1.4;
/** Golden angle — spreads consecutive (by size) wings maximally around the ring. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Per-node offset magnitude from the wing center — tight, for dense cores. */
const AMBIENT_SPREAD = SPACE_SIZE * 0.038;

// Seeded gaussian pair (Box–Muller) for organic, center-weighted cluster blobs.
const gaussianAt = (index: number): [number, number] => {
	const u = 1 - hash01(index, GAUSS_U_SALT);
	const v = hash01(index, GAUSS_V_SALT);
	const radius = Math.sqrt(-2 * Math.log(u));
	return [radius * Math.cos(TWO_PI * v), radius * Math.sin(TWO_PI * v)];
};

/**
 * Per-wing node counts (a node IS a drawer, so this is the drawer count) — used
 * to rank wings for the balanced ring placement.
 */
const wingNodeCounts = (nodes: GraphNodeData): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const wing of nodes.wing) counts.set(wing, (counts.get(wing) ?? 0) + 1);
	return counts;
};

/**
 * Wing centroids for the ambient ring. Wings are RANKED by node count and placed
 * at golden-angle intervals, so the few dense wings land maximally far apart —
 * the bright cluster cores form a balanced halo around the central title instead
 * of bunching into a lopsided arc (alphabetical placement clumps them). Pure and
 * deterministic; the renderer uses the SAME function for label anchoring.
 */
export const buildAmbientWingCentroids = (nodes: GraphNodeData): Map<string, [number, number]> => {
	const counts = wingNodeCounts(nodes);
	const ranked = sortedUnique(nodes.wing).sort(
		(a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || (a < b ? -1 : 1),
	);
	const mid = SPACE_SIZE / 2;
	const radius = SPACE_SIZE * AMBIENT_RING_RADIUS;
	const centers = new Map<string, [number, number]>();
	ranked.forEach((wing, rank) => {
		const angle = rank * GOLDEN_ANGLE + AMBIENT_RING_ROTATION;
		centers.set(wing, [mid + Math.cos(angle) * radius, mid + Math.sin(angle) * radius]);
	});
	return centers;
};

/**
 * Build the ambient position buffer: each wing's nodes form a tight gaussian
 * core at its balanced ring position. Pure function of (index, wing).
 */
export const buildAmbientPositions = (nodes: GraphNodeData): Float32Array => {
	const positions = new Float32Array(nodes.count * 2);
	const centers = buildAmbientWingCentroids(nodes);
	const mid = SPACE_SIZE / 2;
	for (let i = 0; i < nodes.count; i++) {
		const center = centers.get(nodes.wing[i] ?? "") ?? [mid, mid];
		const [gx, gy] = gaussianAt(i);
		positions[i * 2] = center[0] + gx * AMBIENT_SPREAD;
		positions[i * 2 + 1] = center[1] + gy * AMBIENT_SPREAD;
	}
	return positions;
};

// Depth bands. `near` is deliberately rare so bright foreground stars read as a
// scattered handful, not a wall; `mid` carries the body of the field; `far` is
// the fine dust that gives the galaxy its haze and depth.
const NEAR_CUTOFF = 0.012;
const MID_CUTOFF = 0.16;

export type StarTier = "near" | "mid" | "far";

const tierOf = (index: number): StarTier => {
	const h = hash01(index, TIER_SALT);
	if (h < NEAR_CUTOFF) return "near";
	if (h < MID_CUTOFF) return "mid";
	return "far";
};

// Per-tier point sizes (multiplied by the renderer's ambient pointSizeScale and
// the zoom factor). Near stars get extra per-node jitter so a few blaze.
const NEAR_SIZE_BASE = 5.5;
const NEAR_SIZE_JITTER = 6;
const MID_SIZE = 2.3;
const FAR_SIZE = 1.15;

// Per-tier alpha baked into the color buffer (the renderer's uniform pointOpacity
// twinkle multiplies on top). Far dust is faint; near stars are full and bright.
const NEAR_ALPHA = 1;
const MID_ALPHA = 0.66;
const FAR_ALPHA = 0.3;

// Near stars are lightened toward white for a hot, blooming core; mid a touch.
const NEAR_WHITEN = 0.55;
const MID_WHITEN = 0.12;

/** Depth-tiered size buffer for the ambient field. */
export const buildAmbientSizes = (nodes: GraphNodeData): Float32Array => {
	const sizes = new Float32Array(nodes.count);
	for (let i = 0; i < nodes.count; i++) {
		const tier = tierOf(i);
		if (tier === "near") sizes[i] = NEAR_SIZE_BASE + hash01(i, JITTER_SALT) * NEAR_SIZE_JITTER;
		else if (tier === "mid") sizes[i] = MID_SIZE;
		else sizes[i] = FAR_SIZE;
	}
	return sizes;
};

/**
 * Wing-hued color buffer with depth baked in: starts from the room/wing-hue
 * colors, then per node overwrites alpha by tier and lightens near/mid stars
 * toward white so the bright foreground blooms hot while far dust stays a faint,
 * saturated haze. RGBA layout matches the engine's point-color buffer.
 */
export const buildAmbientColors = (nodes: GraphNodeData, mode: GraphColorMode): Float32Array => {
	const colors = buildColorBuffer(nodes, mode);
	for (let i = 0; i < nodes.count; i++) {
		const tier = tierOf(i);
		const alpha = tier === "near" ? NEAR_ALPHA : tier === "mid" ? MID_ALPHA : FAR_ALPHA;
		const whiten = tier === "near" ? NEAR_WHITEN : tier === "mid" ? MID_WHITEN : 0;
		const base = i * 4;
		if (whiten > 0) {
			colors[base] = colors[base] + (1 - colors[base]) * whiten;
			colors[base + 1] = colors[base + 1] + (1 - colors[base + 1]) * whiten;
			colors[base + 2] = colors[base + 2] + (1 - colors[base + 2]) * whiten;
		}
		colors[base + 3] = alpha;
	}
	return colors;
};
