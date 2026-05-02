/**
 * Spacing scale — derived from the grid.
 *
 * Three tokens cover common cases. For one-off values that don't fit, use
 * `size()` from the grid module. Promote a value to the scale only when the
 * pattern repeats in real UI.
 */
import { size } from "./grid";

export const spacing = {
	small: size(2), // 8
	regular: size(4), // 16
	large: size(6), // 24
} as const;
