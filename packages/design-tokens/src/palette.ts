/**
 * Palette — maps brand roles to color families.
 * Swap a role's import here to rebrand without touching consumers.
 *
 * Current wiring:
 *   primary → teal
 *   secondary → sand
 */

import { sand, teal } from "./colors";
import type { ColorFamily } from "./colors/types";

export const primary: ColorFamily = teal;
export const secondary: ColorFamily = sand;

export const palette = {
	primary,
	secondary,
} as const satisfies Record<string, ColorFamily>;

export type Palette = typeof palette;
