// Color buffer construction for the cosmos.gl adapter (waves 12.3 + 12.5).
//
// Wing-hue (12.3) and the five color modes (12.5) are the SAME machinery: the
// "Room" mode IS the wing-hue scheme — each wing gets a distinct hue family from
// the categorical `wingHues` token palette, and rooms are shaded WITHIN their
// wing's hue. The other modes recolor the same nodes by a different signal:
//   room     — wing hue family, per-room lightness shade   ← the 12.3 base scheme
//   recency  — gradient over createdAt (old → new)
//   size     — gradient over document length (small → large)
//   decay    — STUB: no decay/last-accessed field exists; flat neutral fill.
//   cluster  — clusterId → hue once 12.8 precomputes it; neutral until then.
//
// All hex originates in @memui/design-tokens/graph; this module is the sole
// place token hex becomes the RGBA floats cosmos wants.
import { graphNeutral, recencyGradient, sizeGradient, wingHues } from "@memui/design-tokens/graph";
import type { GraphColorMode, GraphNodeData } from "./GraphRenderer";
import { indexMap, sortedUnique } from "./grouping";
import { hexToRgbFloat } from "./layout";

/** Universal node alpha; nodes sit at 0.85 over the dark canvas. */
export const NODE_ALPHA = 0.85;

type Rgb = readonly [number, number, number];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpRgb = (from: Rgb, to: Rgb, t: number): Rgb => [
	lerp(from[0], to[0], t),
	lerp(from[1], to[1], t),
	lerp(from[2], to[2], t),
];

// Shade a base hue toward white by `amount` (0 = base, 1 = white). Used to give
// rooms within a wing distinct, progressively lighter tints while keeping the
// wing's hue dominant — and to keep every room visible on the dark backdrop
// (shading toward black would sink rooms into the canvas).
const lighten = (base: Rgb, amount: number): Rgb => lerpRgb(base, [1, 1, 1], amount);

const writeColor = (colors: Float32Array, i: number, rgb: Rgb): void => {
	colors[i * 4] = rgb[0];
	colors[i * 4 + 1] = rgb[1];
	colors[i * 4 + 2] = rgb[2];
	colors[i * 4 + 3] = NODE_ALPHA;
};

const WING_HUE_RGB: readonly Rgb[] = wingHues.map(hexToRgbFloat);
const NEUTRAL_RGB: Rgb = hexToRgbFloat(graphNeutral);
const RECENCY_FROM = hexToRgbFloat(recencyGradient.from);
const RECENCY_TO = hexToRgbFloat(recencyGradient.to);
const SIZE_FROM = hexToRgbFloat(sizeGradient.from);
const SIZE_TO = hexToRgbFloat(sizeGradient.to);

/** Hue for a wing/cluster index, wrapping the categorical palette. */
const hueFor = (index: number): Rgb => WING_HUE_RGB[index % WING_HUE_RGB.length] ?? NEUTRAL_RGB;

/** Largest room-lightening offset (rooms span base → +ROOM_SHADE_SPAN toward white). */
const ROOM_SHADE_SPAN = 0.45;

// Room mode = the wing-hue scheme. Wing → hue family; room → lightness shade
// within that family, spread deterministically across the wing's rooms.
const fillRoom = (colors: Float32Array, nodes: GraphNodeData): void => {
	const wingIndex = indexMap(sortedUnique(nodes.wing));
	// Stable per-wing room ordering so a room's shade never jumps between renders.
	const roomsByWing = new Map<string, Map<string, number>>();
	const wingRooms = new Map<string, string[]>();
	for (let i = 0; i < nodes.count; i++) {
		const wing = nodes.wing[i] ?? "";
		const room = nodes.room[i] ?? "";
		let rooms = wingRooms.get(wing);
		if (!rooms) {
			rooms = [];
			wingRooms.set(wing, rooms);
		}
		if (!rooms.includes(room)) rooms.push(room);
	}
	for (const [wing, rooms] of wingRooms) {
		roomsByWing.set(wing, indexMap(rooms.slice().sort()));
	}

	for (let i = 0; i < nodes.count; i++) {
		const wing = nodes.wing[i] ?? "";
		const room = nodes.room[i] ?? "";
		const base = hueFor(wingIndex.get(wing) ?? 0);
		const rooms = roomsByWing.get(wing);
		const roomCount = rooms?.size ?? 1;
		const roomPos = rooms?.get(room) ?? 0;
		// One room → base hue; many rooms → evenly spread lighter tints.
		const amount = roomCount > 1 ? (roomPos / (roomCount - 1)) * ROOM_SHADE_SPAN : 0;
		writeColor(colors, i, lighten(base, amount));
	}
};

// Map a numeric column to [0,1] and paint a 2-stop gradient. Flat columns
// (min === max) collapse to the gradient's low end.
const fillGradient = (
	colors: Float32Array,
	values: readonly number[],
	count: number,
	from: Rgb,
	to: Rgb,
): void => {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (let i = 0; i < count; i++) {
		const v = values[i] ?? 0;
		if (v < min) min = v;
		if (v > max) max = v;
	}
	const span = max - min;
	for (let i = 0; i < count; i++) {
		const t = span > 0 ? ((values[i] ?? min) - min) / span : 0;
		writeColor(colors, i, lerpRgb(from, to, t));
	}
};

const fillFlat = (colors: Float32Array, count: number, rgb: Rgb): void => {
	for (let i = 0; i < count; i++) writeColor(colors, i, rgb);
};

// Cluster mode: colors derive ONLY from the precomputed `clusterId` metadata
// (spec: the browser must not compute clustering). Until the 12.8 worker fills
// it, every clusterId is null → neutral fill ("no clusters computed yet").
const fillCluster = (colors: Float32Array, nodes: GraphNodeData): void => {
	for (let i = 0; i < nodes.count; i++) {
		const clusterId = nodes.clusterId[i];
		writeColor(
			colors,
			i,
			clusterId === null || clusterId === undefined ? NEUTRAL_RGB : hueFor(clusterId),
		);
	}
};

/**
 * Build the `[r, g, b, a, …]` point-color buffer for a color mode from the
 * columnar node data.
 */
export const buildColorBuffer = (nodes: GraphNodeData, mode: GraphColorMode): Float32Array => {
	const colors = new Float32Array(nodes.count * 4);
	switch (mode) {
		case "room":
			fillRoom(colors, nodes);
			break;
		case "recency":
			fillGradient(colors, nodes.createdAt, nodes.count, RECENCY_FROM, RECENCY_TO);
			break;
		case "size":
			fillGradient(colors, nodes.size, nodes.count, SIZE_FROM, SIZE_TO);
			break;
		case "decay":
			// TODO(Hawk owes a definition): no decay/last-accessed signal exists on
			// the node columns. Render a flat neutral placeholder rather than
			// fabricate a metric; the route surfaces a "Decay metric not yet
			// defined" hint. Swap to a real gradient once the field lands.
			fillFlat(colors, nodes.count, NEUTRAL_RGB);
			break;
		case "cluster":
			fillCluster(colors, nodes);
			break;
	}
	return colors;
};

/** Whether any node carries a precomputed cluster id (drives the cluster-mode hint). */
export const hasClusterIds = (nodes: GraphNodeData): boolean =>
	nodes.clusterId.some((id) => id !== null && id !== undefined);
