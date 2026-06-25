import type { CommandAction } from "../components/command-bar";
import type { Keybind } from "./types";

/** Turn a single chord into display tokens (e.g. "mod+k" → ["Cmd", "K"]). */
const chordTokens = (chord: string): string[] =>
	chord.split("+").map((token) => {
		const lower = token.toLowerCase();
		if (lower === "mod" || lower === "cmd" || lower === "command") return "Cmd";
		if (lower === "ctrl" || lower === "control") return "Ctrl";
		return token.length === 1 ? token.toUpperCase() : token;
	});

/**
 * Turn a key spec into display tokens for `KeyboardHint`. A space-separated
 * sequence renders as ordered per-step tokens (e.g. "g s" → ["G", "S"]) rather
 * than a single opaque cap; a chord still renders as ["Cmd", "K"].
 */
const shortcutTokens = (keys: string | string[]): string[] => {
	const first = Array.isArray(keys) ? keys[0] : keys;
	if (!first) return [];
	return first
		.split(/\s+/)
		.filter((step) => step.length > 0)
		.flatMap((step) => chordTokens(step));
};

/** Project a single binding into the existing `CommandBar` action shape. */
export const keybindToCommandAction = (keybind: Keybind): CommandAction => {
	const { id, label, group, keys, handler } = keybind;
	return {
		id,
		label,
		group,
		shortcut: shortcutTokens(keys),
		run: () => handler(new KeyboardEvent("keydown")),
	};
};

/**
 * Project the palette-visible bindings into `CommandAction[]` so a later wave
 * can feed them to the Cmd+K palette. Bindings without `paletteVisible` are
 * omitted.
 */
export const projectKeybindsToCommandActions = (keybinds: readonly Keybind[]): CommandAction[] =>
	keybinds.filter((keybind) => keybind.paletteVisible === true).map(keybindToCommandAction);
