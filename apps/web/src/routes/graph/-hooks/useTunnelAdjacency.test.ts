import { describe, expect, it } from "vitest";
import type { GraphNodeData, GraphTunnel } from "../-renderer/GraphRenderer";
import { createTunnelAdjacency } from "./useTunnelAdjacency";

const nodesFrom = (ids: readonly string[]): GraphNodeData => ({
	ids,
	wing: ids.map(() => "w"),
	room: ids.map(() => "r"),
	createdAt: ids.map(() => 0),
	size: ids.map(() => 0),
	clusterId: ids.map(() => null),
	count: ids.length,
});

const tunnel = (id: string, source: string, target: string): GraphTunnel => ({
	id,
	sourceDrawerId: source,
	targetDrawerId: target,
	sourceWingId: "w-a",
	targetWingId: "w-b",
});

describe("createTunnelAdjacency", () => {
	it("counts the 2-hop neighborhood excluding the node itself", () => {
		// Chain a — b — c: from a, the 2-hop reach is b (1-hop) + c (2-hop) → 2.
		const adjacency = createTunnelAdjacency(nodesFrom(["a", "b", "c"]), [
			tunnel("ab", "a", "b"),
			tunnel("bc", "b", "c"),
		]);
		expect(adjacency.neighborCount("a")).toBe(2);
		expect(adjacency.neighborCount("b")).toBe(2);
	});

	it("returns 0 for a node with no tunnels", () => {
		const adjacency = createTunnelAdjacency(nodesFrom(["a", "b"]), []);
		expect(adjacency.neighborCount("a")).toBe(0);
	});

	it("returns 0 for an unknown id", () => {
		const adjacency = createTunnelAdjacency(nodesFrom(["a"]), []);
		expect(adjacency.neighborCount("missing")).toBe(0);
	});

	it("returns 0 before nodes resolve", () => {
		const adjacency = createTunnelAdjacency(undefined, undefined);
		expect(adjacency.neighborCount("a")).toBe(0);
	});
});
