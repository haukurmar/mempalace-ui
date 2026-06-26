import { describe, expect, it } from "vitest";
import type { GraphNodeData } from "./GraphRenderer";
import { buildPositions, buildSizes, SPACE_SIZE } from "./layout";

const makeNodes = (wing: readonly string[]): GraphNodeData => ({
	ids: wing.map((_, i) => `id-${i}`),
	wing: [...wing],
	room: wing.map(() => "room"),
	createdAt: wing.map(() => 0),
	size: wing.map(() => 0),
	clusterId: wing.map(() => null),
	count: wing.length,
});

const centroid = (positions: Float32Array, indices: number[]): [number, number] => {
	let sx = 0;
	let sy = 0;
	for (const i of indices) {
		sx += positions[i * 2] ?? 0;
		sy += positions[i * 2 + 1] ?? 0;
	}
	return [sx / indices.length, sy / indices.length];
};

describe("buildPositions", () => {
	it("returns an x/y pair per node", () => {
		const nodes = makeNodes(["a", "a", "b"]);
		expect(buildPositions(nodes, "explode").length).toBe(3 * 2);
	});

	it("is deterministic for the same node set + mode", () => {
		const nodes = makeNodes(["a", "b", "a", "c"]);
		expect(Array.from(buildPositions(nodes, "explode"))).toEqual(
			Array.from(buildPositions(nodes, "explode")),
		);
	});

	it("separates wings into distinct clusters", () => {
		// Two wings, several nodes each; their centroids should be far apart.
		const nodes = makeNodes(["a", "a", "a", "b", "b", "b"]);
		const positions = buildPositions(nodes, "cluster");
		const [ax, ay] = centroid(positions, [0, 1, 2]);
		const [bx, by] = centroid(positions, [3, 4, 5]);
		const distance = Math.hypot(ax - bx, ay - by);
		expect(distance).toBeGreaterThan(SPACE_SIZE * 0.1);
	});

	it("produces different arrangements per layout mode", () => {
		const nodes = makeNodes(["a", "a", "b", "b"]);
		expect(Array.from(buildPositions(nodes, "explode"))).not.toEqual(
			Array.from(buildPositions(nodes, "orbit")),
		);
	});
});

describe("buildSizes", () => {
	it("returns one positive size per node", () => {
		const sizes = buildSizes(makeNodes(["a", "b"]));
		expect(sizes.length).toBe(2);
		expect(sizes[0]).toBeGreaterThan(0);
	});
});
