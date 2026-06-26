// Stable grouping helpers shared by the layout (wing → ring center) and color
// (wing → hue, room → shade) buffer builders. Both MUST agree on the exact
// wing/room ordering so a wing's cluster position and its hue line up; sorting
// the distinct values makes the index assignment deterministic and stable
// across re-derivations (spec: "wing → hue deterministic/stable").

/** Distinct values in stable, sorted order. */
export const sortedUnique = (values: readonly string[]): string[] =>
	Array.from(new Set(values)).sort();

/** Map each value in a sorted list to its index. */
export const indexMap = (sorted: readonly string[]): Map<string, number> => {
	const map = new Map<string, number>();
	sorted.forEach((value, index) => {
		map.set(value, index);
	});
	return map;
};
