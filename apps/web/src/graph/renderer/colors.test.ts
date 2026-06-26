import { graphNeutral, wingHues } from "@memui/design-tokens/graph";
import { describe, expect, it } from "vitest";
import { buildColorBuffer, hasClusterIds, NODE_ALPHA } from "./colors";
import type { GraphNodeData } from "./GraphRenderer";
import { hexToRgbFloat } from "./layout";

const makeNodes = (overrides: Partial<GraphNodeData> & { count: number }): GraphNodeData => {
	const { count } = overrides;
	const fill = <T>(value: T): T[] => Array.from({ length: count }, () => value);
	return {
		ids: overrides.ids ?? fill("id"),
		wing: overrides.wing ?? fill("alpha"),
		room: overrides.room ?? fill("room"),
		createdAt: overrides.createdAt ?? fill(0),
		size: overrides.size ?? fill(0),
		clusterId: overrides.clusterId ?? fill(null),
		count,
	};
};

const rgbAt = (buffer: Float32Array, i: number): [number, number, number] => [
	buffer[i * 4] ?? -1,
	buffer[i * 4 + 1] ?? -1,
	buffer[i * 4 + 2] ?? -1,
];

// Buffers are Float32 (lower precision than the double-valued token conversion),
// so compare component-wise with tolerance rather than exact equality.
const expectRgbClose = (
	actual: [number, number, number],
	expected: [number, number, number],
): void => {
	for (let c = 0; c < 3; c++) expect(actual[c]).toBeCloseTo(expected[c] ?? 0, 5);
};

describe("buildColorBuffer", () => {
	it("returns an RGBA buffer with the universal node alpha", () => {
		const nodes = makeNodes({ count: 3 });
		const colors = buildColorBuffer(nodes, "room");
		expect(colors.length).toBe(3 * 4);
		expect(colors[3]).toBeCloseTo(NODE_ALPHA);
		expect(colors[7]).toBeCloseTo(NODE_ALPHA);
	});

	it("room mode gives different wings distinct hue families", () => {
		const nodes = makeNodes({ count: 2, wing: ["alpha", "beta"] });
		const colors = buildColorBuffer(nodes, "room");
		expect(rgbAt(colors, 0)).not.toEqual(rgbAt(colors, 1));
	});

	it("room mode shades rooms within a wing while keeping one base hue", () => {
		const single = buildColorBuffer(
			makeNodes({ count: 1, wing: ["alpha"], room: ["only"] }),
			"room",
		);
		// Wing "alpha" sorts to index 0 → first wing hue, undimmed for a single room.
		expectRgbClose(rgbAt(single, 0), hexToRgbFloat(wingHues[0] as string));

		const multi = buildColorBuffer(
			makeNodes({ count: 2, wing: ["alpha", "alpha"], room: ["a", "b"] }),
			"room",
		);
		// Same wing, different rooms → different shades.
		expect(rgbAt(multi, 0)).not.toEqual(rgbAt(multi, 1));
	});

	it("recency mode maps the createdAt range across the gradient", () => {
		const nodes = makeNodes({ count: 3, createdAt: [10, 20, 30] });
		const colors = buildColorBuffer(nodes, "recency");
		// Min and max anchor the gradient endpoints; the middle sits between them.
		expect(rgbAt(colors, 0)).not.toEqual(rgbAt(colors, 2));
		const mid = colors[1 * 4] ?? 0;
		const lo = colors[0 * 4] ?? 0;
		const hi = colors[2 * 4] ?? 0;
		expect(mid).toBeGreaterThan(Math.min(lo, hi) - 1e-6);
		expect(mid).toBeLessThan(Math.max(lo, hi) + 1e-6);
	});

	it("decay mode is a flat neutral placeholder (metric undefined)", () => {
		const nodes = makeNodes({ count: 2, createdAt: [1, 99] });
		const colors = buildColorBuffer(nodes, "decay");
		const neutral = hexToRgbFloat(graphNeutral);
		expectRgbClose(rgbAt(colors, 0), neutral);
		expectRgbClose(rgbAt(colors, 1), neutral);
	});

	it("cluster mode is neutral when no clusterId exists and hued when it does", () => {
		const neutral = hexToRgbFloat(graphNeutral);
		const empty = buildColorBuffer(makeNodes({ count: 2 }), "cluster");
		expectRgbClose(rgbAt(empty, 0), neutral);

		const withIds = buildColorBuffer(makeNodes({ count: 2, clusterId: [0, 1] }), "cluster");
		expectRgbClose(rgbAt(withIds, 0), hexToRgbFloat(wingHues[0] as string));
		expectRgbClose(rgbAt(withIds, 1), hexToRgbFloat(wingHues[1] as string));
	});
});

describe("hasClusterIds", () => {
	it("is false when every clusterId is null", () => {
		expect(hasClusterIds(makeNodes({ count: 3 }))).toBe(false);
	});

	it("is true when any clusterId is present", () => {
		expect(hasClusterIds(makeNodes({ count: 2, clusterId: [null, 4] }))).toBe(true);
	});
});
