/**
 * Tailwind v4 adapter.
 *
 * Emits a `@theme { ... }` CSS block from the canonical token modules so
 * Tailwind utility classes resolve to the same values consumed in TS.
 *
 * Variable naming convention:
 *   --color-<role>-<step>            background hex
 *   --color-<role>-<step>-contrast   AA-compliant foreground for that step
 *   --space-<key>                    spacing px
 *   --radius-<key>                   radius px
 *   --breakpoint-<key>               breakpoint px
 *   --font-family-<role>             role font-family stack
 *   --text-<size>                    role-agnostic font-size px
 *   --leading-<size>                 role-agnostic line-height px
 *   --font-weight-<role>-<weight>    role-scoped weight
 *   --z-<key>                        z-index integer
 */

import { breakpoints } from "../breakpoints";
import type { ColorFamily } from "../colors/types";
import { palette } from "../palette";
import { radius } from "../radius";
import { spacing } from "../spacing";
import { type FontRoleDefinition, typography } from "../typography";
import { zIndices } from "../zIndices";

const px = (n: number) => `${n}px`;

const fontFamilyStack = (role: FontRoleDefinition) => {
	const stack = [role.fontFamily, ...(role.fallbacks ?? [])];
	return stack.map((f) => (f.includes(" ") ? `"${f}"` : f)).join(", ");
};

const colorLines = (roleName: string, family: ColorFamily) => {
	const lines: string[] = [];
	for (const [step, swatch] of Object.entries(family)) {
		lines.push(`\t--color-${roleName}-${step}: ${swatch.background};`);
		lines.push(`\t--color-${roleName}-${step}-contrast: ${swatch.contrast};`);
	}
	return lines;
};

const sizeLines = () => {
	const seen = new Set<string>();
	const lines: string[] = [];
	for (const role of Object.values(typography)) {
		for (const [key, value] of Object.entries(role.sizes)) {
			if (seen.has(key) || !value) continue;
			seen.add(key);
			lines.push(`\t--text-${key}: ${px(value.fontSize)};`);
			lines.push(`\t--leading-${key}: ${px(value.lineHeight)};`);
		}
	}
	return lines;
};

const weightLines = () => {
	const lines: string[] = [];
	for (const [roleName, role] of Object.entries(typography)) {
		for (const [weightName, weightValue] of Object.entries(role.weights)) {
			if (weightValue === undefined) continue;
			lines.push(`\t--font-weight-${roleName}-${weightName}: ${weightValue};`);
		}
	}
	return lines;
};

export const toTailwindTheme = (): string => {
	const lines: string[] = [];

	for (const [roleName, family] of Object.entries(palette)) {
		lines.push(...colorLines(roleName, family));
	}

	for (const [key, value] of Object.entries(spacing)) {
		lines.push(`\t--space-${key}: ${px(value)};`);
	}

	for (const [key, value] of Object.entries(radius)) {
		const formatted = key === "full" ? `${value}px` : px(value);
		lines.push(`\t--radius-${key}: ${formatted};`);
	}

	for (const [key, value] of Object.entries(breakpoints)) {
		lines.push(`\t--breakpoint-${key}: ${px(value)};`);
	}

	for (const [roleName, role] of Object.entries(typography)) {
		lines.push(`\t--font-family-${roleName}: ${fontFamilyStack(role)};`);
	}

	lines.push(...sizeLines());
	lines.push(...weightLines());

	for (const [key, value] of Object.entries(zIndices)) {
		lines.push(`\t--z-${key}: ${value};`);
	}

	return `@theme {\n${lines.join("\n")}\n}\n`;
};
