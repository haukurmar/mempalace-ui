/**
 * Sand color family — 13 steps × { background, contrast }.
 * Scale direction: 0 = white, 1000 = black.
 * Warm parchment neutral; the workhorse for surfaces, borders, and
 * non-accent text. All contrast values meet WCAG AA (4.5:1).
 */
import type { ColorFamily } from "./types";

export const sand = {
	0: { background: "#FFFFFF", contrast: "#5C4B33" },
	50: { background: "#FAF6EE", contrast: "#5C4B33" },
	100: { background: "#F2EAD9", contrast: "#473823" },
	200: { background: "#E5D6BA", contrast: "#473823" },
	300: { background: "#D2BD96", contrast: "#2E2415" },
	400: { background: "#BCA37A", contrast: "#2E2415" },
	500: { background: "#A89880", contrast: "#171108" },
	600: { background: "#8C7A60", contrast: "#171108" },
	700: { background: "#6F5F49", contrast: "#F2EAD9" },
	800: { background: "#5C4B33", contrast: "#F2EAD9" },
	900: { background: "#3D3220", contrast: "#D2BD96" },
	950: { background: "#231C12", contrast: "#BCA37A" },
	1000: { background: "#000000", contrast: "#BCA37A" },
} as const satisfies ColorFamily;
