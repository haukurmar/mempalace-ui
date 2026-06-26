// =============================================================================
// GraphRenderer — the single seam between the /graph route and whatever WebGL
// engine draws the palace. cosmos.gl is the locked v1 engine (12.1 benchmark:
// 164k nodes, median 120fps, 0% slow frames), but the route programs against
// THIS interface only, so the engine can be swapped without touching the route
// or any later-wave feature code.
//
// This interface is FROZEN for Phase 12. Later waves implement against it:
//   12.3 wing-hue        → setColorMode("room") wiring + per-wing hue families
//   12.4 layout modes    → setLayoutMode("explode" | "orbit" | "cluster")
//   12.5 color modes      → setColorMode cycle (room/recency/size/decay/cluster)
//   12.6 isolate          → isolate(nodeId | null)
//   12.7 tunnel highlight → setTunnels(...) + setTunnelHighlight(on)
// Adding a wave must NOT require changing the method signatures below.
// =============================================================================

/**
 * Browser-safe mirror of `@memui/palace-clients`' `GraphNodes` columnar shape.
 * Defined locally so the route-private renderer never pulls the Node-only
 * palace-clients package (better-sqlite3 / child-process) into the browser
 * bundle. The server fn returns a structurally identical object; the route
 * assigns it straight across.
 *
 * Parallel arrays — index `i` across every array describes node `i`.
 */
export type GraphNodeData = {
	readonly ids: readonly string[];
	readonly wing: readonly string[];
	readonly room: readonly string[];
	readonly createdAt: readonly number[];
	readonly size: readonly number[];
	readonly clusterId: readonly (number | null)[];
	readonly count: number;
};

/**
 * Browser-safe edge for the graph. Mirrors the load-bearing fields of
 * `@memui/palace-types`' `Tunnel`; endpoints are nullable because some MCP
 * results populate only the wings. The renderer drops any edge whose endpoints
 * are not both present in the node set.
 */
export type GraphTunnel = {
	readonly id: string;
	readonly sourceDrawerId: string | null;
	readonly targetDrawerId: string | null;
	readonly sourceWingId: string;
	readonly targetWingId: string;
};

/** Everything the renderer needs to paint a frame. */
export type GraphMountData = {
	readonly nodes: GraphNodeData;
	/** Cross-wing tunnels; optional because MCP may be offline (nodes still paint). */
	readonly tunnels?: readonly GraphTunnel[];
};

/** Color modes cycled by the `C` key (wave 12.5). */
export type GraphColorMode = "room" | "recency" | "size" | "decay" | "cluster";

/** Force-tuning layout modes switched by `1` / `2` / `3` (wave 12.4). */
export type GraphLayoutMode = "explode" | "orbit" | "cluster";

/** Events the renderer surfaces to the route. */
export type GraphRendererEvents = {
	/** Fires when the user clicks a node; carries the drawer id. */
	nodeClick: (nodeId: string) => void;
};

export type GraphRendererEventName = keyof GraphRendererEvents;

/**
 * The engine-agnostic renderer the /graph route drives. Implementations own all
 * GPU/WebGL state; the route never touches the engine directly.
 */
export type GraphRenderer = {
	/**
	 * Attach the engine to `container` and paint `data`. Resolves once the
	 * engine is initialized and the first frame is drawn. Call exactly once per
	 * renderer instance; pair with `destroy`.
	 */
	mount(container: HTMLElement, data: GraphMountData): Promise<void>;

	/**
	 * Replace the tunnel set after mount. Tunnels load independently of nodes
	 * (MCP can be slow or offline), so the route feeds them in as they arrive.
	 * Pass `null` to clear. No-op until wave 12.7 renders edges.
	 */
	setTunnels(tunnels: readonly GraphTunnel[] | null): void;

	/** Recolor nodes by the given mode (wave 12.5). */
	setColorMode(mode: GraphColorMode): void;

	/** Retune the layout forces toward the given mode (wave 12.4). */
	setLayoutMode(mode: GraphLayoutMode): void;

	/** Toggle elevated-opacity rendering of cross-wing tunnels (wave 12.7). */
	setTunnelHighlight(on: boolean): void;

	/**
	 * Enter focus mode on `nodeId`, dimming everything outside its 2-hop
	 * neighborhood; pass `null` to exit focus (wave 12.6).
	 */
	isolate(nodeId: string | null): void;

	/** Subscribe to a renderer event. Returns an unsubscribe function. */
	on<E extends GraphRendererEventName>(event: E, handler: GraphRendererEvents[E]): () => void;

	/** Tear down all engine/GPU state and detach from the container. */
	destroy(): void;
};
