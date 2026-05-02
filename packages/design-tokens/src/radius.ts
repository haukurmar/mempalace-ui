/**
 * Border radius scale — derived from the grid.
 * none=0, small=4, regular=8, large=16 cover card/button radii.
 * round=24 covers pill shapes. full=9999 is a true circle.
 */
import { size } from "./grid";

export const radius = {
	none: 0,
	small: size(1), // 4
	regular: size(2), // 8
	large: size(4), // 16
	round: size(6), // 24
	full: 9999,
} as const;
