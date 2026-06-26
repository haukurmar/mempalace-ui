// =============================================================================
// CosmographRenderer — the cosmos.gl 3.0.0 implementation of GraphRenderer.
// This is the ONLY module that imports the heavy @cosmos.gl/graph dependency,
// and it stays route-private (apps/web/src/routes/graph/-renderer) so the dep
// never leaks into @memui/ui. The 12.1 benchmark proved the engine; this is the
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
import { buildColorBuffer } from "./colors";
import type {
	GraphColorMode,
	GraphLayoutMode,
	GraphMountData,
	GraphNodeData,
	GraphRenderer,
	GraphRendererEventName,
	GraphRendererEvents,
	GraphTunnel,
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

	const mount = async (container: HTMLElement, data: GraphMountData): Promise<void> => {
		nodeIds = data.nodes.ids;
		nodeData = data.nodes;
		idToIndex = buildIdToIndex(data.nodes.ids);
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
		const colors = new Float32Array(count * 4);
		for (let i = 0; i < count; i++) {
			colors[i * 4] = TUNNEL_LINK_RGB[0];
			colors[i * 4 + 1] = TUNNEL_LINK_RGB[1];
			colors[i * 4 + 2] = TUNNEL_LINK_RGB[2];
			colors[i * 4 + 3] = TUNNEL_LINK_ALPHA;
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
		graph.setLinkWidths(new Float32Array(data.count).fill(TUNNEL_LINK_WIDTH));
		graph.setConfigPartial({ renderLinks: tunnelHighlight });
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
		graph?.destroy();
		graph = null;
		nodeIds = [];
		nodeData = null;
		idToIndex = new Map();
		rawTunnels = null;
		tunnelData = null;
		isolatedId = null;
		listeners.nodeClick.clear();
	};

	return {
		mount,
		setTunnels,
		setColorMode,
		setLayoutMode,
		setTunnelHighlight,
		isolate,
		on,
		destroy,
	};
};
