/**
 * Teal color family — 13 steps × { background, contrast }.
 * Scale direction: 0 = white, 1000 = black.
 * Muted, slightly desaturated; reads as developer-tool, not branded-cyan.
 * All contrast values meet WCAG AA minimum (4.5:1) against their background.
 */
import type { ColorFamily } from "./types";

export const teal = {
	0: { background: "#FFFFFF", contrast: "#0E3A3B" },
	50: { background: "#F1F7F7", contrast: "#0E3A3B" },
	100: { background: "#DBECEC", contrast: "#0E3A3B" },
	200: { background: "#B6D9D9", contrast: "#0E3A3B" },
	300: { background: "#86BFC0", contrast: "#0E3A3B" },
	400: { background: "#5FA8A9", contrast: "#0A1F20" },
	500: { background: "#387B7D", contrast: "#FFFFFF" },
	600: { background: "#2A6567", contrast: "#FFFFFF" },
	700: { background: "#1F5052", contrast: "#FFFFFF" },
	800: { background: "#173E40", contrast: "#DBECEC" },
	900: { background: "#0E2C2D", contrast: "#86BFC0" },
	950: { background: "#081A1B", contrast: "#86BFC0" },
	1000: { background: "#000000", contrast: "#5FA8A9" },
} as const satisfies ColorFamily;
