import { type FC, useEffect, useRef } from "react";
import { createCosmographRenderer } from "../-renderer/CosmographRenderer";
import type {
	GraphColorMode,
	GraphLayoutMode,
	GraphNodeData,
	GraphRenderer,
	GraphTunnel,
} from "../-renderer/GraphRenderer";

export type GraphCanvasProps = {
	nodes: GraphNodeData;
	tunnels?: readonly GraphTunnel[];
	colorMode: GraphColorMode;
	layoutMode: GraphLayoutMode;
	/** Whether cross-wing tunnels are shown (12.7 "Show tunnels"). */
	tunnelHighlight: boolean;
	/** Drawer id currently isolated (12.6 focus mode), or null for the full graph. */
	isolatedId?: string | null;
	onNodeClick?: (nodeId: string) => void;
};

/**
 * Owns the active GraphRenderer instance and binds its lifecycle to the DOM
 * container: creates + mounts the cosmos.gl adapter when the node set changes,
 * forwards `nodeClick` to the route, feeds late-arriving tunnels, and tears the
 * engine down on unmount. The route never touches the renderer directly.
 */
export const GraphCanvas: FC<GraphCanvasProps> = (props) => {
	const { nodes, tunnels, colorMode, layoutMode, tunnelHighlight, isolatedId, onNodeClick } = props;
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rendererRef = useRef<GraphRenderer | null>(null);

	// Keep the latest click handler in a ref so swapping it never remounts the
	// (expensive) engine.
	const onNodeClickRef = useRef(onNodeClick);
	onNodeClickRef.current = onNodeClick;

	// Latest modes read at mount time so the first frame shows the restored state
	// without listing them as mount-effect deps (which would remount the engine).
	const colorModeRef = useRef(colorMode);
	colorModeRef.current = colorMode;
	const layoutModeRef = useRef(layoutMode);
	layoutModeRef.current = layoutMode;
	const tunnelHighlightRef = useRef(tunnelHighlight);
	tunnelHighlightRef.current = tunnelHighlight;
	const tunnelsRef = useRef(tunnels);
	tunnelsRef.current = tunnels;
	const isolatedIdRef = useRef(isolatedId);
	isolatedIdRef.current = isolatedId;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const renderer = createCosmographRenderer();
		rendererRef.current = renderer;
		let disposed = false;

		const unsubscribe = renderer.on("nodeClick", (id) => onNodeClickRef.current?.(id));

		// Seed the renderer's mode state before mount so it paints the persisted
		// modes on the first frame (these are no-op applies until the engine is ready).
		renderer.setLayoutMode(layoutModeRef.current);
		renderer.setColorMode(colorModeRef.current);
		// Seed tunnel-highlight + isolate too; both buffer until mount resolves.
		renderer.setTunnelHighlight(tunnelHighlightRef.current);
		renderer.isolate(isolatedIdRef.current ?? null);
		// Seed tunnels as well: this effect re-runs (and rebuilds the renderer)
		// whenever the `nodes` reference changes — which happens on every wholesale
		// ["palace"] invalidation, even when the tunnel set is unchanged. Without
		// this seed the rebuilt renderer never gets edges (the [tunnels] effect
		// won't re-fire), and the graph silently goes edgeless. Buffers until mount.
		renderer.setTunnels(tunnelsRef.current ?? null);

		// Mount paints nodes; tunnels were seeded above and live changes still flow
		// through the setTunnels effect below, so this effect depends solely on `nodes`.
		renderer
			.mount(container, { nodes })
			.then(() => {
				// Unmounted (or StrictMode-remounted) before init finished — tear down
				// the now-orphaned engine the cleanup couldn't reach.
				if (disposed) renderer.destroy();
			})
			.catch((err: unknown) => {
				if (!disposed) console.error("Graph renderer failed to mount", err);
			});

		return () => {
			disposed = true;
			unsubscribe();
			renderer.destroy();
			rendererRef.current = null;
		};
	}, [nodes]);

	useEffect(() => {
		rendererRef.current?.setTunnels(tunnels ?? null);
	}, [tunnels]);

	useEffect(() => {
		rendererRef.current?.setTunnelHighlight(tunnelHighlight);
	}, [tunnelHighlight]);

	useEffect(() => {
		rendererRef.current?.isolate(isolatedId ?? null);
	}, [isolatedId]);

	// Mode changes recolor / re-lay-out the existing engine (600ms tween) — never
	// a remount. On first commit these run right after the mount effect set the
	// renderer ref; the engine isn't ready yet so they're harmless no-op applies.
	useEffect(() => {
		rendererRef.current?.setColorMode(colorMode);
	}, [colorMode]);

	useEffect(() => {
		rendererRef.current?.setLayoutMode(layoutMode);
	}, [layoutMode]);

	return <div ref={containerRef} className="absolute inset-0" />;
};
