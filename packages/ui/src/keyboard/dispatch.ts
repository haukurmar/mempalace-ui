import { normalizeKeysSpec } from "./normalizeKeys";
import type { Keybind, ScopeName } from "./types";

/**
 * Input guard: when focus is in a text-entry surface, single-character bindings
 * (j, k, ?) must NOT fire — but `mod`-combos and `Esc` always pass through so
 * the command palette and dismiss-grammar keep working while typing.
 */
export const signaturePassesInputGuard = (signature: string): boolean => {
	const tokens = signature.split("+");
	if (tokens.includes("mod")) return true;
	return tokens[tokens.length - 1] === "escape";
};

export type ResolveKeybindArgs = {
	/** Canonical signature of the pressed key (from `normalizeEvent`). */
	signature: string;
	/** Whether focus is currently in an editable text surface. */
	isEditable: boolean;
	/** All registered bindings. */
	keybinds: readonly Keybind[];
	/** Active scope stack, bottom-to-top ("global" at index 0). */
	scopeStack: readonly ScopeName[];
};

/**
 * Pure dispatch resolution — no DOM. Given a key signature, the editable-focus
 * flag, the registered bindings, and the active scope stack, return the single
 * binding that should fire (or `undefined`).
 *
 * Precedence: among bindings matching the signature whose scope is currently
 * active, the one whose scope is TOPMOST in the stack wins. Because "global"
 * always sits at the bottom of the stack, a scoped binding shadows a global one
 * when its surface is active, and non-conflicting global keys always fall
 * through.
 */
export const resolveKeybind = (args: ResolveKeybindArgs): Keybind | undefined => {
	const { signature, isEditable, keybinds, scopeStack } = args;

	if (isEditable && !signaturePassesInputGuard(signature)) return undefined;

	let winner: Keybind | undefined;
	let winnerPosition = -1;
	for (const keybind of keybinds) {
		if (!normalizeKeysSpec(keybind.keys).includes(signature)) continue;
		// Topmost occurrence of this binding's scope in the active stack; -1 when
		// the scope is not currently active.
		const position = scopeStack.lastIndexOf(keybind.scope);
		if (position > winnerPosition) {
			winnerPosition = position;
			winner = keybind;
		}
	}

	return winner;
};
