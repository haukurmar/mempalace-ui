import { useMemo } from "react";
import type { GraphNodeData, GraphTunnel } from "../-renderer/GraphRenderer";
import { buildIdToIndex, buildTunnelLinks, twoHopNeighborhood } from "../-renderer/tunnels";

export type UseTunnelAdjacency = {
	/**
	 * Size of a node's 2-hop tunnel neighborhood EXCLUDING the node itself. Returns
	 * 0 for an unknown id or a node with no tunnels (the isolate "0 neighbors" case).
	 */
	neighborCount: (nodeId: string) => number;
};

/**
 * Pure builder behind the hook: turns the node + tunnel data into a neighbor-count
 * lookup using the same tunnels.ts helpers the cosmos adapter uses, so the count
 * always matches what is dimmed on the canvas. Extracted so it can be unit-tested
 * without React; the hook just memoizes a call to it.
 */
export const createTunnelAdjacency = (
	nodes: GraphNodeData | undefined,
	tunnels: readonly GraphTunnel[] | undefined,
): UseTunnelAdjacency => {
	if (!nodes) return { neighborCount: () => 0 };
	const idToIndex = buildIdToIndex(nodes.ids);
	const { adjacency } = buildTunnelLinks(tunnels ?? [], idToIndex);
	return {
		neighborCount: (nodeId: string): number => {
			const index = idToIndex.get(nodeId);
			if (index === undefined) return 0;
			return twoHopNeighborhood(index, adjacency).size - 1;
		},
	};
};

/**
 * Route-side mirror of the renderer's tunnel adjacency, so the bottom panel can
 * show the isolate neighbor count without plumbing a value back out of the
 * (return-less) `isolate` renderer call. Memoized on the node + tunnel
 * identities — rebuilds only when the data changes.
 */
export const useTunnelAdjacency = (
	nodes: GraphNodeData | undefined,
	tunnels: readonly GraphTunnel[] | undefined,
): UseTunnelAdjacency => useMemo(() => createTunnelAdjacency(nodes, tunnels), [nodes, tunnels]);
