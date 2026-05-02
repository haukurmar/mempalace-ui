/**
 * Typography scale.
 *
 * - Line heights are hand-tuned to a 4pt grid (smaller sizes need
 *   proportionally taller line-heights).
 * - Baseline alignment is handled by the rendering platform (CSS
 *   `text-box-trim`) — no cap-height tokens here.
 * - Adding a new role: define `fontFamily`, optional `fallbacks`, `sizes` (a
 *   subset of `FontSizeKey` is fine), and `weights`.
 * - `body` and `heading` share `baseSizes` by default. Any role can
 *   spread-override per-key for optical adjustment.
 */

export type FontSizeKey = "xs" | "small" | "regular" | "large" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";

export type FontWeightName = "thin" | "light" | "regular" | "medium" | "semiBold" | "bold";

export type FontSize = { fontSize: number; lineHeight: number };

export type FontRoleDefinition = {
	fontFamily: string;
	fallbacks?: readonly string[];
	sizes: Partial<Record<FontSizeKey, FontSize>>;
	weights: Partial<Record<FontWeightName, number>>;
};

const baseSizes = {
	xs: { fontSize: 12, lineHeight: 16 },
	small: { fontSize: 14, lineHeight: 20 },
	regular: { fontSize: 16, lineHeight: 24 },
	large: { fontSize: 18, lineHeight: 24 },
	xl: { fontSize: 20, lineHeight: 28 },
	"2xl": { fontSize: 24, lineHeight: 32 },
	"3xl": { fontSize: 32, lineHeight: 40 },
	"4xl": { fontSize: 40, lineHeight: 48 },
	"5xl": { fontSize: 48, lineHeight: 56 },
	"6xl": { fontSize: 64, lineHeight: 72 },
} satisfies Record<FontSizeKey, FontSize>;

export const typography = {
	body: {
		fontFamily: "Inter",
		fallbacks: ["system-ui", "Arial", "sans-serif"],
		sizes: baseSizes,
		weights: {
			light: 300,
			regular: 400,
			medium: 500,
			semiBold: 600,
			bold: 700,
		},
	},
	heading: {
		fontFamily: "Lora",
		fallbacks: ["Georgia", "serif"],
		sizes: baseSizes,
		weights: {
			regular: 400,
			medium: 500,
			semiBold: 600,
			bold: 700,
		},
	},
	mono: {
		fontFamily: "JetBrains Mono",
		fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
		sizes: {
			xs: baseSizes.xs,
			small: baseSizes.small,
			regular: baseSizes.regular,
			large: baseSizes.large,
		},
		weights: {
			regular: 400,
			medium: 500,
			bold: 700,
		},
	},
} as const satisfies Record<string, FontRoleDefinition>;

export type FontRole = keyof typeof typography;
