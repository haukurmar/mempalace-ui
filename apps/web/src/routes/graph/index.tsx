import { ErrorState, LoadingState } from "@memui/ui/components";
import { GraphPanelLayout } from "@memui/ui/patterns";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type FC, useCallback, useMemo, useState } from "react";
import { hasClusterIds } from "../../graph/renderer/colors";
import { findTunnels, listGraphNodes } from "../../server/functions";
import { GraphCanvas } from "./-components/GraphCanvas";
import { GraphControls } from "./-components/GraphControls";
import { GraphKeybindings } from "./-components/GraphKeybindings";
import { SelectedDrawerPanel } from "./-components/SelectedDrawerPanel";
import { useGraphModes } from "./-hooks/useGraphModes";
import { useTunnelAdjacency } from "./-hooks/useTunnelAdjacency";

const GraphView: FC = () => {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	// Drawer currently in focus mode (12.6), or null for the full graph.
	const [isolatedId, setIsolatedId] = useState<string | null>(null);

	// Nodes are the load-bearing dataset (SQLite-backed) — the graph paints from
	// these alone.
	const nodesQuery = useQuery({
		queryKey: ["palace", "graph", "nodes"],
		queryFn: () => listGraphNodes({ data: {} }),
	});

	// Tunnels are MCP-only and load in parallel; failure (MCP offline) must NOT
	// block the node render, so they feed in lazily and errors are swallowed.
	const tunnelsQuery = useQuery({
		queryKey: ["palace", "graph", "tunnels"],
		queryFn: () => findTunnels({ data: {} }),
		retry: false,
	});

	// Route-side mirror of the tunnel adjacency so the panel can report the isolate
	// neighbor count. Memoized on the data; safe to call before nodes resolve.
	const tunnelAdjacency = useTunnelAdjacency(nodesQuery.data, tunnelsQuery.data ?? undefined);

	const handleNodeClick = useCallback((nodeId: string) => {
		setSelectedId(nodeId);
	}, []);

	const handleCloseDetail = useCallback(() => {
		setSelectedId(null);
		setIsolatedId(null);
	}, []);

	// L enters focus mode on the selected node; a no-op when nothing is selected.
	const handleIsolate = useCallback(() => {
		setSelectedId((current) => {
			if (current) setIsolatedId(current);
			return current;
		});
	}, []);

	// Esc (graph scope, topmost while isolated) exits focus mode but keeps the
	// selection highlighted (spec: "remains highlighted but no longer isolated").
	const handleExitIsolate = useCallback(() => {
		setIsolatedId(null);
	}, []);

	// Color/layout mode state (owned here, restored from localStorage). `hasClusters`
	// is false until nodes load and/or the 12.8 worker fills `clusterId`; it only
	// gates the Cluster-mode "no clusters yet" hint.
	// `hasClusterIds` scans the full ~164k-node column, so memoize it on the node
	// data — otherwise every unrelated render (selection, isolate, color/layout
	// switch) re-walks the array, which never short-circuits while clusterId is all-null.
	const hasClusters = useMemo(
		() => (nodesQuery.data ? hasClusterIds(nodesQuery.data) : false),
		[nodesQuery.data],
	);
	const {
		colorMode,
		layoutMode,
		colorModeLabel,
		colorModeHint,
		cycleColorMode,
		setLayoutMode,
		tunnelHighlight,
		toggleTunnelHighlight,
	} = useGraphModes({ hasClusters });

	if (nodesQuery.isLoading) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<LoadingState label="Loading palace graph…" />
			</div>
		);
	}

	if (nodesQuery.isError || !nodesQuery.data) {
		return (
			<div className="flex h-full w-full items-center justify-center p-8">
				<ErrorState
					title="Could not load the palace graph"
					description={
						nodesQuery.error instanceof Error
							? nodesQuery.error.message
							: "The local palace SQLite is unavailable."
					}
				/>
			</div>
		);
	}

	const nodes = nodesQuery.data;
	const tunnels = tunnelsQuery.data ?? undefined;
	const isolated = Boolean(isolatedId);
	// Neighbor count only matters while the selected drawer is the isolated one.
	const isolateInfo =
		isolatedId && isolatedId === selectedId
			? { neighborCount: tunnelAdjacency.neighborCount(isolatedId) }
			: null;

	return (
		<div className="h-full w-full">
			<GraphKeybindings
				isolated={isolated}
				onIsolate={handleIsolate}
				onExitIsolate={handleExitIsolate}
				onSetLayout={setLayoutMode}
				onCycleColor={cycleColorMode}
				onToggleTunnels={toggleTunnelHighlight}
			/>
			<GraphPanelLayout
				canvas={
					<GraphCanvas
						nodes={nodes}
						tunnels={tunnels}
						colorMode={colorMode}
						layoutMode={layoutMode}
						tunnelHighlight={tunnelHighlight}
						isolatedId={isolatedId}
						onNodeClick={handleNodeClick}
					/>
				}
				controls={
					<GraphControls
						nodeCount={nodes.count}
						tunnelCount={tunnels?.length}
						layoutMode={layoutMode}
						onLayoutModeChange={setLayoutMode}
						colorModeLabel={colorModeLabel}
						colorModeHint={colorModeHint}
						tunnelHighlight={tunnelHighlight}
						onToggleTunnelHighlight={toggleTunnelHighlight}
					/>
				}
				bottomPanel={
					selectedId ? (
						<SelectedDrawerPanel
							drawerId={selectedId}
							isolate={isolateInfo}
							onClose={handleCloseDetail}
						/>
					) : null
				}
				bottomPanelOpen={Boolean(selectedId)}
				onBottomPanelClose={handleCloseDetail}
			/>
		</div>
	);
};

// Route-level pending skeleton, centered in the shell `main`. The loader below
// primes the (heavy) node dataset so this actually fires on a cold navigation.
const GraphPending: FC = () => {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<LoadingState label="Loading palace graph…" />
		</div>
	);
};

export const Route = createFileRoute("/graph/")({
	component: GraphView,
	pendingComponent: GraphPending,
	// Prime the load-bearing node dataset at the route level so the pending UI
	// fires on a cold navigation; the in-component `useQuery` then reads it from
	// cache. Errors are swallowed — the component surfaces them via `isError`.
	loader: async ({ context }) => {
		try {
			await context.queryClient.ensureQueryData({
				queryKey: ["palace", "graph", "nodes"],
				queryFn: () => listGraphNodes({ data: {} }),
			});
		} catch {
			// Component renders the ErrorState from its own query.
		}
	},
});
