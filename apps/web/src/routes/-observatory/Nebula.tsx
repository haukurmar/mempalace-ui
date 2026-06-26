import { wingHues } from "@memui/design-tokens/graph";
import { primary, secondary } from "@memui/design-tokens/palette";
import type { CSSProperties, FC } from "react";

// Token-sourced nebula hues: brand teal + sand anchor it on-palette, with a
// violet and a blue wing-hue accent for cosmic depth. All from design tokens.
const TEAL = primary[500].background;
const SAND = secondary[600].background;
const VIOLET = wingHues[7];
const BLUE = wingHues[9];

// A soft radial cloud at (x%, y%), tinted `hue` at `strength`, fading to nothing.
const cloud = (x: number, y: number, hue: string, strength: number, size: number): string =>
	`radial-gradient(${size}% ${size}% at ${x}% ${y}%, color-mix(in oklab, ${hue} ${strength}%, transparent), transparent 70%)`;

const nebulaStyle: CSSProperties = {
	backgroundColor: primary[1000].background,
	backgroundImage: [
		cloud(28, 30, TEAL, 26, 75),
		cloud(74, 38, VIOLET, 20, 70),
		cloud(58, 72, BLUE, 16, 80),
		cloud(18, 78, SAND, 12, 65),
		cloud(50, 48, TEAL, 14, 95),
	].join(", "),
};

/**
 * The atmospheric backdrop: layered, drifting radial clouds in the wing/brand
 * hues so the constellation floats over real depth instead of flat ink. Sits
 * BEHIND the (transparent-cleared) WebGL canvas; inert and decorative.
 */
export const Nebula: FC = () => {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
			<div style={nebulaStyle} className="observatory-nebula-drift absolute inset-0" />
		</div>
	);
};
