// Pure persistence + cycle helpers for `useGraphModes`, split out so they can be
// unit-tested without React (the hook itself only wraps these in state + toasts).
// No DOM/React imports here — just localStorage access guarded for SSR.

import type { GraphColorMode, GraphLayoutMode } from "../../../graph/renderer/GraphRenderer";

// Persisted across sessions (spec: "mode persists across sessions").
export const COLOR_KEY = "mempalace.graph.colorMode";
export const LAYOUT_KEY = "mempalace.graph.layoutMode";
export const TUNNEL_KEY = "mempalace.graph.tunnelHighlight";

// Cross-wing tunnels are the headline of the multi-wing view, so "Show tunnels"
// defaults ON; with MCP offline there are simply no edges to draw.
export const TUNNEL_HIGHLIGHT_DEFAULT = true;

// `C` cycles the five color modes in this fixed order (spec).
export const COLOR_MODE_ORDER: readonly GraphColorMode[] = [
	"room",
	"recency",
	"size",
	"decay",
	"cluster",
];

export const COLOR_MODE_LABELS: Record<GraphColorMode, string> = {
	room: "Room",
	recency: "Recency",
	size: "Size",
	decay: "Decay",
	cluster: "Cluster",
};

const LAYOUT_MODES: readonly GraphLayoutMode[] = ["explode", "orbit", "cluster"];

export const isColorMode = (value: string | null): value is GraphColorMode =>
	value !== null && (COLOR_MODE_ORDER as readonly string[]).includes(value);

export const isLayoutMode = (value: string | null): value is GraphLayoutMode =>
	value !== null && (LAYOUT_MODES as readonly string[]).includes(value);

export const readPersisted = <T extends string>(
	key: string,
	guard: (value: string | null) => value is T,
	fallback: T,
): T => {
	if (typeof window === "undefined") return fallback;
	const stored = window.localStorage.getItem(key);
	return guard(stored) ? stored : fallback;
};

export const readPersistedBool = (key: string, fallback: boolean): boolean => {
	if (typeof window === "undefined") return fallback;
	const stored = window.localStorage.getItem(key);
	return stored === null ? fallback : stored === "true";
};

export const persist = (key: string, value: string): void => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(key, value);
};

/** Advance the color cycle one step, wrapping cluster → room. */
export const nextColorMode = (current: GraphColorMode): GraphColorMode => {
	const nextIndex = (COLOR_MODE_ORDER.indexOf(current) + 1) % COLOR_MODE_ORDER.length;
	return COLOR_MODE_ORDER[nextIndex] ?? "room";
};

// A hint shown for color modes whose underlying metric is missing — the Decay
// stub (no metric defined yet) and Cluster before the precompute worker (12.8)
// fills `clusterId`. `null` for fully-implemented modes.
export const colorModeHint = (mode: GraphColorMode, hasClusters: boolean): string | null => {
	if (mode === "decay") return "Decay metric not yet defined — showing a neutral placeholder.";
	if (mode === "cluster" && !hasClusters)
		return "No clusters computed yet — run the precompute worker.";
	return null;
};
