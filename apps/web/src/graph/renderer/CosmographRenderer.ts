// =============================================================================
// CosmographRenderer — the cosmos.gl 3.0.0 implementation of GraphRenderer.
// This is the ONLY module that imports the heavy @cosmos.gl/graph dependency,
// and it lives in the shared renderer module (apps/web/src/graph/renderer) so
// the dep never leaks into @memui/ui. The 12.1 benchmark proved the engine; this is the
// product wiring of the same API (mount, node buffers, zoom-to-fit, click).
//
// IMPLEMENTED in 12.2: mount, columnar node rendering, zoom-to-fit, nodeClick,
// destroy. IMPLEMENTED in 12.3/12.4/12.5: setColorMode (wing-hue + 5 modes),
// setLayoutMode (Explode/Orbit/Cluster, 600ms tween). STILL STUBBED (signatures
// final, bodies land in later waves): setTunnels, setTunnelHighlight, isolate.
// =============================================================================

import type { Graph, GraphConfig } from "@cosmos.gl/graph";
import { tunnelLink } from "@memui/design-tokens/graph";
import { primary } from "@memui/design-tokens/palette";
import {
	buildAmbientColors,
	buildAmbientPositions,
	buildAmbientSizes,
	buildAmbientWingCentroids,
} from "./ambient";
import { buildColorBuffer } from "./colors";
import type {
	AmbientConfig,
	GraphColorMode,
	GraphLayoutMode,
	GraphMountData,
	GraphNodeData,
	GraphRenderer,
	GraphRendererEventName,
	GraphRendererEvents,
	GraphTunnel,
	WingProjection,
} from "./GraphRenderer";
import { buildPositions, buildSizes, hexToRgbFloat, SPACE_SIZE } from "./layout";
import {
	buildIdToIndex,
	buildTunnelLinks,
	linkIndicesWithin,
	type TunnelLinks,
	twoHopNeighborhood,
} from "./tunnels";

// Token-sourced canvas backdrop — the deep-teal makes nodes pop. Node colors are
// derived per mode in ./colors from @memui/design-tokens/graph; never raw hex here.
const CANVAS_BACKDROP = primary[950].background;

const ZOOM_TO_FIT_MS = 600;
// Position/color crossfade duration. cosmos eases all points old → target over
// this window (CubicInOut), satisfying the spec's "600ms easing, no jump".
const TRANSITION_MS = 600;
// String literal (not the TransitionEasing enum) so we don't statically import
// the heavy @cosmos.gl/graph value module — it stays behind the dynamic import.
const TRANSITION_EASING = "cubic-in-out" as const;

// Cross-wing tunnel edge styling (12.7), all token-sourced. Emphasized alpha +
// a touch of extra width so the threads read clearly when "Show tunnels" is on.
const TUNNEL_LINK_RGB = hexToRgbFloat(tunnelLink);
const TUNNEL_LINK_ALPHA = 0.9;
const TUNNEL_LINK_WIDTH = 1.4;

// Isolate (12.6): greyed-out nodes keep their color but drop to this alpha, so the
// 2-hop neighborhood pops while the rest stays visible as faint context.
const ISOLATE_GREYOUT_OPACITY = 0.08;
const ISOLATE_FIT_MS = 600;
const ISOLATE_FIT_PADDING = 0.3;
// Fixed zoom for the degenerate single-node neighborhood (isolate on a drawer
// with no tunnels). fitViewByPointIndices on one point zooms in to an extreme
// level, so center on the node at a comfortable, bounded scale instead.
const ISOLATE_SINGLE_NODE_ZOOM = 8;

// --- Ambient (Observatory home) tuning -------------------------------------
const TWO_PI = Math.PI * 2;
// Resting universal node opacity. The per-node depth alpha (ambient.ts) does the
// dimming now, so this sits high — it's the multiplier the twinkle rides on.
const AMBIENT_BASE_OPACITY = 0.95;
// A focused (hovered) wing blooms to this; the rest recede to greyout opacity.
const AMBIENT_BLOOM_OPACITY = 1;
// Global twinkle: a slow sine breath around the base opacity (soft shimmer).
const AMBIENT_TWINKLE_AMPLITUDE = 0.08;
const AMBIENT_TWINKLE_PERIOD_S = 5.5;
// Global multiplier on top of the per-node depth-tiered ambient sizes.
const AMBIENT_POINT_SIZE_SCALE = 1.45;
// Slow "bloom pulse": the whole field gently swells and recedes in size so the
// glow breathes. Layered under the opacity twinkle for a living, luminous feel.
const AMBIENT_BLOOM_PULSE_AMPLITUDE = 0.08;
const AMBIENT_BLOOM_PULSE_PERIOD_S = 12;
// Negative fit padding overscans the constellation past the viewport edges so it
// reads full-bleed rather than a blob marooned in the center.
const AMBIENT_FIT_MS = 950;
const AMBIENT_FIT_PADDING = -0.06;
// Camera "breathing": a barely-there zoom oscillation so the cosmos feels alive.
const AMBIENT_BREATHE_AMPLITUDE = 0.035;
const AMBIENT_BREATHE_PERIOD_S = 28;
// Don't capture the breathe baseline until the entry fit-view has settled.
const AMBIENT_BREATHE_SETTLE_S = 1.15;
// Padding when diving the camera into a wing's cluster.
const AMBIENT_WING_FIT_PADDING = 0.4;
// Fully transparent clear so the DOM nebula behind the canvas shows through —
// the stars float over real atmospheric depth, not a flat ink rectangle.
const AMBIENT_TRANSPARENT_BG: [number, number, number, number] = [0, 0, 0, 0];
// Cross-wing tunnels in ambient read as faint SILVER threads (pale teal), not the
// emphasized amber of the interactive view. Token-sourced (primary pale step).
const AMBIENT_TUNNEL_RGB = hexToRgbFloat(primary[200].background);
const AMBIENT_TUNNEL_ALPHA = 0.22;
const AMBIENT_TUNNEL_WIDTH = 0.6;

export const createCosmographRenderer = (): GraphRenderer => {
	let graph: Graph | null = null;
	let nodeIds: readonly string[] = [];
	// Latest node columns + active modes are retained so setColorMode/setLayoutMode
	// can rebuild their buffers after mount. React owns the mode state and drives
	// these setters; the renderer just paints.
	let nodeData: GraphNodeData | null = null;
	let colorMode: GraphColorMode = "room";
	let layoutMode: GraphLayoutMode = "explode";
	// Drawer id → node index, built once at mount so tunnel endpoints and the
	// isolate target can be resolved into the columnar index space.
	let idToIndex: Map<string, number> = new Map();
	// Raw tunnels are retained verbatim so they can be (re)mapped to link buffers
	// the moment `idToIndex` is ready — setTunnels can fire BEFORE mount resolves.
	let rawTunnels: readonly GraphTunnel[] | null = null;
	let tunnelData: TunnelLinks | null = null;
	// Default ON; the route persists this and re-asserts it before mount.
	let tunnelHighlight = true;
	// The id currently isolated (focus mode), or null. Stored as the id (not the
	// index) so an isolate() call that lands before mount can be applied later.
	let isolatedId: string | null = null;
	// --- Ambient state -----------------------------------------------------
	// The DOM container, retained so ambient projection can read the live canvas
	// size for its in-view test.
	let containerEl: HTMLElement | null = null;
	// Wing → centroid in SPACE coordinates (the ring center its cluster blobs
	// around) and wing → the node indices in that cluster. Both computed once at
	// mount; the centroid is re-projected to screen each frame for label anchors.
	let wingSpaceCentroids: Map<string, [number, number]> = new Map();
	let wingIndices: Map<string, number[]> = new Map();
	let ambientRaf: number | null = null;
	let ambientActive = false;
	let ambientReducedMotion = false;
	let ambientStart = 0;
	// Captured once the entry fit-view settles, then breathed around.
	let ambientBaseZoom: number | null = null;
	// Suspends the breathe oscillation (e.g. while a wing dive is in flight) so it
	// doesn't fight a programmatic fitView.
	let ambientBreatheSuspendedUntil = 0;
	// The wing currently bloomed in ambient mode, or null for the resting field.
	let focusedWing: string | null = null;
	const listeners: { [E in GraphRendererEventName]: Set<GraphRendererEvents[E]> } = {
		nodeClick: new Set(),
	};

	const emitNodeClick = (nodeId: string): void => {
		for (const handler of listeners.nodeClick) handler(nodeId);
	};

	const handlePointClick = (index: number): void => {
		const id = nodeIds[index];
		if (id !== undefined) emitNodeClick(id);
	};

	// Precompute wing → member node indices (used by ambient mode for the bloom and
	// the wing dive). One pass; the centroids themselves are set by enterAmbient
	// against the ambient ring layout.
	const buildWingIndices = (nodes: GraphNodeData): void => {
		const indices = new Map<string, number[]>();
		for (let i = 0; i < nodes.count; i++) {
			const wing = nodes.wing[i] ?? "";
			let bucket = indices.get(wing);
			if (!bucket) {
				bucket = [];
				indices.set(wing, bucket);
			}
			bucket.push(i);
		}
		wingIndices = indices;
	};

	const mount = async (container: HTMLElement, data: GraphMountData): Promise<void> => {
		containerEl = container;
		nodeIds = data.nodes.ids;
		nodeData = data.nodes;
		idToIndex = buildIdToIndex(data.nodes.ids);
		buildWingIndices(data.nodes);
		// Build from the modes React set on this renderer before mount (restored
		// from localStorage), so the first frame already shows the persisted state.
		const positions = buildPositions(data.nodes, layoutMode);
		const colors = buildColorBuffer(data.nodes, colorMode);
		const sizes = buildSizes(data.nodes);

		const { Graph: GraphCtor } = await import("@cosmos.gl/graph");
		const config: GraphConfig = {
			// Static layout for v1: positions are precomputed per layout mode (wing
			// clusters), so we pay no force-settling cost. Mode switches tween via
			// the position transition below rather than a live simulation.
			enableSimulation: false,
			transitionDuration: TRANSITION_MS,
			transitionEasing: TRANSITION_EASING,
			backgroundColor: CANVAS_BACKDROP,
			spaceSize: SPACE_SIZE,
			pointSizeScale: 1,
			scalePointsOnZoom: true,
			// Links start hidden; applyTunnels() below flips this on per the buffered
			// highlight state once edges (if any) are mapped.
			renderLinks: false,
			// Isolate dims non-neighborhood nodes to this alpha while keeping their
			// hue (no pointGreyoutColor → original color), satisfying "dimmed nodes
			// keep their hue at low alpha".
			pointGreyoutOpacity: ISOLATE_GREYOUT_OPACITY,
			fitViewOnInit: false,
			pixelRatio: 2,
			onPointClick: handlePointClick,
		};
		const instance = new GraphCtor(container as HTMLDivElement, config);
		await instance.ready;
		instance.setPointPositions(positions, true);
		instance.setPointColors(colors);
		instance.setPointSizes(sizes);
		instance.render();
		instance.fitView(ZOOM_TO_FIT_MS);
		graph = instance;
		// Drain anything the route fed in before the engine was ready: tunnels that
		// arrived via setTunnels (MCP is async) and a pending isolate target.
		applyTunnels();
		applyIsolate();
	};

	// Rebuild the link buffer + adjacency from the buffered raw tunnels. Runs once
	// idToIndex exists; before mount it is a no-op (idToIndex empty → nothing kept).
	const rebuildTunnelData = (): void => {
		tunnelData = rawTunnels ? buildTunnelLinks(rawTunnels, idToIndex) : null;
	};

	const buildLinkColors = (count: number): Float32Array => {
		// Ambient mode recolors tunnels to faint silver threads; the interactive
		// view keeps the emphasized amber.
		const rgb = ambientActive ? AMBIENT_TUNNEL_RGB : TUNNEL_LINK_RGB;
		const alpha = ambientActive ? AMBIENT_TUNNEL_ALPHA : TUNNEL_LINK_ALPHA;
		const colors = new Float32Array(count * 4);
		for (let i = 0; i < count; i++) {
			colors[i * 4] = rgb[0];
			colors[i * 4 + 1] = rgb[1];
			colors[i * 4 + 2] = rgb[2];
			colors[i * 4 + 3] = alpha;
		}
		return colors;
	};

	// Push the current tunnel set to the engine. Safe to call repeatedly; with zero
	// tunnels (MCP offline) it clears the link buffer and leaves the graph edgeless.
	const applyTunnels = (): void => {
		if (!graph) return;
		rebuildTunnelData();
		const data = tunnelData;
		if (!data || data.count === 0) {
			graph.setLinks(new Float32Array(0));
			graph.setConfigPartial({ renderLinks: false });
			graph.render();
			return;
		}
		graph.setLinks(data.links);
		graph.setLinkColors(buildLinkColors(data.count));
		graph.setLinkWidths(
			new Float32Array(data.count).fill(ambientActive ? AMBIENT_TUNNEL_WIDTH : TUNNEL_LINK_WIDTH),
		);
		// Ambient always shows its faint threads; interactive obeys the highlight toggle.
		graph.setConfigPartial({ renderLinks: ambientActive || tunnelHighlight });
		graph.render();
	};

	// Apply (or clear) focus mode. `isolatedId === null` restores full opacity;
	// otherwise the node's 2-hop tunnel neighborhood stays lit and everything else
	// greys out. Resolving the index here (not at call time) lets an isolate()
	// issued before mount take effect once idToIndex is populated.
	const applyIsolate = (): void => {
		if (!graph) return;
		if (isolatedId === null) {
			graph.setConfigPartial({
				highlightedPointIndices: undefined,
				highlightedLinkIndices: undefined,
			});
			graph.render();
			return;
		}
		const index = idToIndex.get(isolatedId);
		if (index === undefined) return;
		const members = tunnelData
			? twoHopNeighborhood(index, tunnelData.adjacency)
			: new Set<number>([index]);
		const indices = Array.from(members);
		graph.setConfigPartial({
			highlightedPointIndices: indices,
			highlightedLinkIndices: tunnelData ? linkIndicesWithin(tunnelData.links, members) : [],
		});
		graph.render();
		// A lone isolated node has no neighborhood to frame; fitting to a single
		// point zooms in to an extreme level, so center on it at a fixed, sensible
		// zoom. Simulation is disabled for this graph, so skip it on the transition.
		if (members.size === 1) {
			graph.zoomToPointByIndex(index, ISOLATE_FIT_MS, ISOLATE_SINGLE_NODE_ZOOM, true, false);
		} else {
			graph.fitViewByPointIndices(indices, ISOLATE_FIT_MS, ISOLATE_FIT_PADDING);
		}
	};

	const setTunnels = (tunnels: readonly GraphTunnel[] | null): void => {
		rawTunnels = tunnels;
		if (!graph) return; // buffered — applied at the end of mount.
		applyTunnels();
		// Edges changed: refresh the isolate neighborhood against the new adjacency.
		if (isolatedId !== null) applyIsolate();
	};

	const setColorMode = (mode: GraphColorMode): void => {
		colorMode = mode;
		// Before mount (graph null) this just records the desired mode; mount reads it.
		if (!graph || !nodeData) return;
		graph.setPointColors(buildColorBuffer(nodeData, mode));
		// render() starts the queued PointColors transition → 600ms color crossfade.
		graph.render();
	};

	const setLayoutMode = (mode: GraphLayoutMode): void => {
		layoutMode = mode;
		if (!graph || !nodeData) return;
		// dontRescale: positions are already in SPACE_SIZE coordinates. render()
		// starts the queued Positions transition → 600ms eased move, no jump.
		graph.setPointPositions(buildPositions(nodeData, mode), true);
		graph.render();
	};

	const setTunnelHighlight = (on: boolean): void => {
		tunnelHighlight = on;
		if (!graph) return;
		// "Show tunnels" toggles edge visibility. Our edge set is cross-wing tunnels
		// only (findTunnels never returns intra-wing edges), so on = show emphasized
		// tunnels, off = hide them; nothing to render when there are no tunnels.
		graph.setConfigPartial({ renderLinks: on && (tunnelData?.count ?? 0) > 0 });
		graph.render();
	};

	const isolate = (nodeId: string | null): void => {
		const wasIsolated = isolatedId !== null;
		isolatedId = nodeId;
		if (!graph) return; // buffered — applied at the end of mount.
		applyIsolate();
		// Leaving focus mode: ease back out to the whole-graph view.
		if (nodeId === null && wasIsolated) graph.fitView(ZOOM_TO_FIT_MS);
	};

	// --- Ambient mode ------------------------------------------------------
	// One rAF step: a soft global twinkle on opacity + a slow zoom "breath". The
	// focused wing (if any) holds steady at bloom opacity instead of twinkling.
	const ambientTick = (): void => {
		if (!graph || !ambientActive) return;
		const now = performance.now();
		const t = (now - ambientStart) / 1000;

		const twinkle =
			AMBIENT_BASE_OPACITY +
			AMBIENT_TWINKLE_AMPLITUDE * Math.sin((TWO_PI * t) / AMBIENT_TWINKLE_PERIOD_S);
		const opacity = focusedWing !== null ? AMBIENT_BLOOM_OPACITY : twinkle;
		// Slow bloom pulse: the field's point size gently swells and recedes so the
		// glow breathes, out of phase with the opacity twinkle for a living shimmer.
		const pulse =
			1 + AMBIENT_BLOOM_PULSE_AMPLITUDE * Math.sin((TWO_PI * t) / AMBIENT_BLOOM_PULSE_PERIOD_S);
		graph.setConfigPartial({
			pointOpacity: Math.max(0, Math.min(1, opacity)),
			pointSizeScale: AMBIENT_POINT_SIZE_SCALE * pulse,
		});

		// Breathe the camera only when no wing is bloomed and no dive is settling.
		if (focusedWing === null && now >= ambientBreatheSuspendedUntil) {
			if (ambientBaseZoom === null && t >= AMBIENT_BREATHE_SETTLE_S) {
				ambientBaseZoom = graph.getZoomLevel();
			}
			if (ambientBaseZoom !== null) {
				const breath =
					1 + AMBIENT_BREATHE_AMPLITUDE * Math.sin((TWO_PI * t) / AMBIENT_BREATHE_PERIOD_S);
				graph.setZoomLevel(ambientBaseZoom * breath, 0, false);
			}
		}
		graph.render();
		ambientRaf = requestAnimationFrame(ambientTick);
	};

	const enterAmbient = (config: AmbientConfig): void => {
		if (!graph) return;
		ambientActive = true;
		ambientReducedMotion = config.reducedMotion ?? false;
		const baseOpacity = config.nodeOpacity ?? AMBIENT_BASE_OPACITY;
		// A calm wallpaper: no node picking, no user zoom/drag — the overlay's wing
		// labels own all interaction. Dim the whole field to the resting opacity.
		graph.setConfigPartial({
			enableZoom: false,
			enableDrag: false,
			pointOpacity: baseOpacity,
			pointSizeScale: AMBIENT_POINT_SIZE_SCALE,
			// Transparent clear lets the DOM nebula show through behind the stars.
			backgroundColor: AMBIENT_TRANSPARENT_BG,
		});
		// Swap in the ambient galaxy: a wide ring of tight, bright cluster cores
		// (positions), depth-tiered star sizes, and depth-tiered wing-hue colors
		// (bright whitened near stars → faint far dust). Recompute the wing
		// centroids against the AMBIENT ring so labels anchor to the new layout.
		if (nodeData) {
			graph.setPointPositions(buildAmbientPositions(nodeData), true);
			graph.setPointSizes(buildAmbientSizes(nodeData));
			graph.setPointColors(buildAmbientColors(nodeData, colorMode));
			wingSpaceCentroids = buildAmbientWingCentroids(nodeData);
		}
		// Now that ambientActive is set, repaint any tunnels as silver threads.
		applyTunnels();
		// Overscan-fit so the field bleeds past the edges instead of sitting small
		// in the middle. In reduced motion this is the final, static framing.
		graph.fitView(ambientReducedMotion ? 0 : AMBIENT_FIT_MS, AMBIENT_FIT_PADDING, false);
		graph.render();
		if (ambientReducedMotion) return; // opacity-only; no drift/twinkle loop.
		ambientStart = performance.now();
		ambientBaseZoom = null;
		if (ambientRaf === null) ambientRaf = requestAnimationFrame(ambientTick);
	};

	const focusWing = (wing: string | null): void => {
		focusedWing = wing;
		if (!graph) return;
		if (wing === null) {
			graph.setConfigPartial({
				highlightedPointIndices: undefined,
				pointOpacity: ambientReducedMotion ? AMBIENT_BASE_OPACITY : undefined,
			});
			graph.render();
			return;
		}
		const indices = wingIndices.get(wing);
		if (!indices || indices.length === 0) return;
		graph.setConfigPartial({
			highlightedPointIndices: indices,
			// In reduced-motion there's no loop to hold the bloom, so set it here.
			pointOpacity: ambientReducedMotion ? AMBIENT_BLOOM_OPACITY : undefined,
		});
		graph.render();
	};

	const flyToWing = (wing: string, durationMs: number): void => {
		if (!graph) return;
		const indices = wingIndices.get(wing);
		if (!indices || indices.length === 0) return;
		// Hold the breathe oscillation off until the dive has fully settled.
		ambientBreatheSuspendedUntil = performance.now() + durationMs + 200;
		graph.fitViewByPointIndices(indices, durationMs, AMBIENT_WING_FIT_PADDING, false);
	};

	const getWingProjections = (): readonly WingProjection[] => {
		if (!graph || !containerEl) return [];
		const width = containerEl.clientWidth;
		const height = containerEl.clientHeight;
		const out: WingProjection[] = [];
		for (const [wing, centroid] of wingSpaceCentroids) {
			const [x, y] = graph.spaceToScreenPosition(centroid);
			out.push({ wing, x, y, inView: x >= 0 && x <= width && y >= 0 && y <= height });
		}
		return out;
	};

	const on = <E extends GraphRendererEventName>(
		event: E,
		handler: GraphRendererEvents[E],
	): (() => void) => {
		listeners[event].add(handler);
		return () => {
			listeners[event].delete(handler);
		};
	};

	const destroy = (): void => {
		if (ambientRaf !== null) cancelAnimationFrame(ambientRaf);
		ambientRaf = null;
		ambientActive = false;
		graph?.destroy();
		graph = null;
		nodeIds = [];
		nodeData = null;
		idToIndex = new Map();
		rawTunnels = null;
		tunnelData = null;
		isolatedId = null;
		containerEl = null;
		wingSpaceCentroids = new Map();
		wingIndices = new Map();
		focusedWing = null;
		listeners.nodeClick.clear();
	};

	return {
		mount,
		setTunnels,
		setColorMode,
		setLayoutMode,
		setTunnelHighlight,
		isolate,
		enterAmbient,
		focusWing,
		flyToWing,
		getWingProjections,
		on,
		destroy,
	};
};
