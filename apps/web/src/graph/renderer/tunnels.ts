// Tunnel → cosmos link-buffer mapping and the 2-hop neighborhood BFS that drive
// cross-wing highlighting (12.7) and click-to-isolate (12.6).
//
// This module is PURE (no cosmos.gl, no DOM, no design tokens) so the index
// mapping and the BFS can be unit-tested in isolation, and so both the renderer
// adapter (CosmographRenderer) and the route-side neighbor-count hook can share
// one implementation. Token-hex → RGBA link colors live in the adapter; the only
// thing this file knows about an edge is the integer indices of its endpoints.
//
// ADJACENCY SOURCE — tunnels only. The spec defines the 2-hop neighborhood as
// "drawers connected via tunnels OR shared closets", but there is no closet edge
// reader anywhere in the codebase yet (no server fn, no MCP surface). Adjacency
// is therefore built EXCLUSIVELY from cross-wing tunnels for now.
// TODO(closets): when a closet-membership edge source exists, union its pairs
// into `buildTunnelLinks`' adjacency so the neighborhood spans shared closets too.

import type { GraphTunnel } from "./GraphRenderer";

/** Cosmos link buffer plus the symmetric adjacency derived from the same edges. */
export type TunnelLinks = {
	/** `[src0, tgt0, src1, tgt1, …]` node indices for `Graph.setLinks`. */
	readonly links: Float32Array;
	/** Symmetric node-index → adjacent-node-indices map (both directions per edge). */
	readonly adjacency: ReadonlyMap<number, ReadonlySet<number>>;
	/** Number of tunnels that mapped to a valid, distinct node-index pair. */
	readonly count: number;
};

/** First-wins map from drawer id to its columnar node index. */
export const buildIdToIndex = (ids: readonly string[]): Map<string, number> => {
	const map = new Map<string, number>();
	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		if (id !== undefined && !map.has(id)) map.set(id, i);
	}
	return map;
};

/**
 * Map tunnels onto cosmos link indices. A tunnel is kept only when BOTH endpoints
 * are present in the node set (non-null ids that resolve via `idToIndex`) and the
 * endpoints differ; everything else is dropped so the GPU never references a node
 * index that doesn't exist. With zero tunnels (MCP offline) this returns an empty
 * buffer and an empty adjacency — the graph still paints, just edgeless.
 */
export const buildTunnelLinks = (
	tunnels: readonly GraphTunnel[],
	idToIndex: ReadonlyMap<string, number>,
): TunnelLinks => {
	const pairs: number[] = [];
	const adjacency = new Map<number, Set<number>>();

	const link = (a: number, b: number): void => {
		let set = adjacency.get(a);
		if (!set) {
			set = new Set<number>();
			adjacency.set(a, set);
		}
		set.add(b);
	};

	for (const tunnel of tunnels) {
		if (tunnel.sourceDrawerId === null || tunnel.targetDrawerId === null) continue;
		const source = idToIndex.get(tunnel.sourceDrawerId);
		const target = idToIndex.get(tunnel.targetDrawerId);
		if (source === undefined || target === undefined || source === target) continue;
		pairs.push(source, target);
		link(source, target);
		link(target, source);
	}

	return { links: Float32Array.from(pairs), adjacency, count: pairs.length / 2 };
};

/**
 * Breadth-first walk of the tunnel adjacency, depth 2, INCLUDING the start node.
 * The returned set is the isolate neighborhood (start + 1-hop + 2-hop); neighbor
 * count is `size - 1`. With an empty adjacency (no tunnels) this is just the start
 * node — isolate on an unconnected drawer yields "0 neighbors", never a crash.
 */
export const twoHopNeighborhood = (
	start: number,
	adjacency: ReadonlyMap<number, ReadonlySet<number>>,
): Set<number> => {
	const visited = new Set<number>([start]);
	let frontier: number[] = [start];
	for (let depth = 0; depth < 2; depth++) {
		const next: number[] = [];
		for (const node of frontier) {
			const neighbors = adjacency.get(node);
			if (!neighbors) continue;
			for (const neighbor of neighbors) {
				if (!visited.has(neighbor)) {
					visited.add(neighbor);
					next.push(neighbor);
				}
			}
		}
		frontier = next;
	}
	return visited;
};

/**
 * Link indices whose BOTH endpoints are inside `members` — the edges to keep lit
 * when the neighborhood is isolated (everything else greys out).
 */
export const linkIndicesWithin = (links: Float32Array, members: ReadonlySet<number>): number[] => {
	const result: number[] = [];
	for (let i = 0; i < links.length / 2; i++) {
		const source = links[i * 2];
		const target = links[i * 2 + 1];
		if (
			source !== undefined &&
			target !== undefined &&
			members.has(source) &&
			members.has(target)
		) {
			result.push(i);
		}
	}
	return result;
};
