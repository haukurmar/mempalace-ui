import { describe, expect, it } from "vitest";
import type { GraphTunnel } from "./GraphRenderer";
import { buildIdToIndex, buildTunnelLinks, linkIndicesWithin, twoHopNeighborhood } from "./tunnels";

const tunnel = (
	id: string,
	source: string | null,
	target: string | null,
	sourceWing = "w-a",
	targetWing = "w-b",
): GraphTunnel => ({
	id,
	sourceDrawerId: source,
	targetDrawerId: target,
	sourceWingId: sourceWing,
	targetWingId: targetWing,
});

describe("buildIdToIndex", () => {
	it("maps each id to its columnar index, first occurrence wins", () => {
		const map = buildIdToIndex(["a", "b", "c", "b"]);
		expect(map.get("a")).toBe(0);
		expect(map.get("b")).toBe(1);
		expect(map.get("c")).toBe(2);
	});
});

describe("buildTunnelLinks", () => {
	const idToIndex = buildIdToIndex(["a", "b", "c", "d"]);

	it("maps both endpoints through the id→index table into the flat link buffer", () => {
		const result = buildTunnelLinks([tunnel("t1", "a", "c"), tunnel("t2", "b", "d")], idToIndex);
		expect(Array.from(result.links)).toEqual([0, 2, 1, 3]);
		expect(result.count).toBe(2);
	});

	it("builds symmetric adjacency for every kept edge", () => {
		const { adjacency } = buildTunnelLinks([tunnel("t1", "a", "c")], idToIndex);
		expect([...(adjacency.get(0) ?? [])]).toEqual([2]);
		expect([...(adjacency.get(2) ?? [])]).toEqual([0]);
	});

	it("drops tunnels whose endpoints are not both in the node set", () => {
		const result = buildTunnelLinks(
			[
				tunnel("missing-target", "a", "zz"),
				tunnel("missing-source", "zz", "b"),
				tunnel("null-endpoint", "a", null),
				tunnel("kept", "a", "b"),
			],
			idToIndex,
		);
		expect(result.count).toBe(1);
		expect(Array.from(result.links)).toEqual([0, 1]);
	});

	it("drops self-loops (both endpoints resolve to the same node)", () => {
		const result = buildTunnelLinks([tunnel("loop", "a", "a")], idToIndex);
		expect(result.count).toBe(0);
		expect(result.links.length).toBe(0);
	});

	it("returns an empty buffer and empty adjacency for zero tunnels (MCP offline)", () => {
		const result = buildTunnelLinks([], idToIndex);
		expect(result.count).toBe(0);
		expect(result.links.length).toBe(0);
		expect(result.adjacency.size).toBe(0);
	});
});

describe("twoHopNeighborhood", () => {
	// Chain: 0 — 1 — 2 — 3 — 4, plus a branch 1 — 5.
	const idToIndex = buildIdToIndex(["0", "1", "2", "3", "4", "5"]);
	const { adjacency } = buildTunnelLinks(
		[
			tunnel("a", "0", "1"),
			tunnel("b", "1", "2"),
			tunnel("c", "2", "3"),
			tunnel("d", "3", "4"),
			tunnel("e", "1", "5"),
		],
		idToIndex,
	);

	it("includes the start node, its 1-hop and its 2-hop neighbors", () => {
		// From node 1: self(1) + 1-hop {0,2,5} + 2-hop {3} (via 2).
		expect([...twoHopNeighborhood(1, adjacency)].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 5]);
	});

	it("stops at depth 2 (does not reach 3-hop nodes)", () => {
		// From node 0: self(0) + {1} + {2,5}; node 3 (3 hops) is excluded.
		const hood = twoHopNeighborhood(0, adjacency);
		expect(hood.has(3)).toBe(false);
		expect([...hood].sort((x, y) => x - y)).toEqual([0, 1, 2, 5]);
	});

	it("yields just the start node when it has no tunnels (0 neighbors)", () => {
		const isolated = buildTunnelLinks([], idToIndex);
		const hood = twoHopNeighborhood(0, isolated.adjacency);
		expect([...hood]).toEqual([0]);
		expect(hood.size - 1).toBe(0);
	});
});

describe("linkIndicesWithin", () => {
	const idToIndex = buildIdToIndex(["a", "b", "c", "d"]);
	const { links } = buildTunnelLinks(
		[tunnel("ab", "a", "b"), tunnel("bc", "b", "c"), tunnel("cd", "c", "d")],
		idToIndex,
	);

	it("keeps only edges with both endpoints inside the member set", () => {
		// members {a,b,c} = indices {0,1,2}: edges ab(0) and bc(1) qualify, cd(2) does not.
		expect(linkIndicesWithin(links, new Set([0, 1, 2]))).toEqual([0, 1]);
	});
});
