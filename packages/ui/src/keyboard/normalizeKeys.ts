/**
 * Key normalization: turns both binding specs ("mod+k", "?", "Esc") and live
 * `KeyboardEvent`s into the same canonical signature string, so dispatch can
 * compare them with a plain equality check.
 *
 * A signature is modifier tokens (in a fixed order) joined to a base key with
 * "+", e.g. "mod+k", "shift+p", "escape", "j", "?".
 *
 * SEQUENCES: a space-separated spec (e.g. "g s") is an ORDERED sequence of chord
 * steps — press "g", then "s". `+` joins modifiers within one chord; a space
 * separates sequence steps. {@link normalizeKeySequences} parses a spec into one
 * ordered list of step signatures per alias; {@link normalizeKeysSpec} keeps the
 * single-chord fast path for direct (non-sequence) dispatch. The pending-prefix
 * buffer that fires multi-step sequences lives in `KeybindStore`.
 */

const MODIFIER_ALIASES: Record<string, string> = {
	cmd: "mod",
	command: "mod",
	ctrl: "mod",
	control: "mod",
	meta: "mod",
	mod: "mod",
	option: "alt",
	alt: "alt",
	shift: "shift",
};

/** Canonical emission order for modifier tokens within a signature. */
const MODIFIER_ORDER = ["mod", "alt", "shift"] as const;

const normalizeKeyName = (raw: string): string => {
	const lower = raw.toLowerCase();
	if (raw === " " || lower === "space" || lower === "spacebar") return "space";
	if (lower === "esc" || lower === "escape") return "escape";
	return lower;
};

const signatureFromParts = (modifiers: Set<string>, key: string): string => {
	const ordered = MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier));
	return [...ordered, key].join("+");
};

/** Normalize a single chord spec ("Cmd+K", "?", "Esc") into a signature. */
const normalizeChordSpec = (spec: string): string => {
	const parts = spec
		.split("+")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	const modifiers = new Set<string>();
	let key = "";
	for (const part of parts) {
		const alias = MODIFIER_ALIASES[part.toLowerCase()];
		if (alias) {
			modifiers.add(alias);
		} else {
			key = part;
		}
	}

	return signatureFromParts(modifiers, normalizeKeyName(key));
};

/**
 * Parse a binding's `keys` into normalized sequences — one ordered list of step
 * signatures per alias. A single chord like "mod+k" yields `[["mod+k"]]`; a
 * sequence like "g s" yields `[["g", "s"]]`; an alias array maps each entry
 * (which may itself be a sequence) to its own list. Empty/blank specs are
 * dropped. This is the canonical parse the runtime sequence buffer consumes.
 */
export const normalizeKeySequences = (keys: string | string[]): string[][] => {
	const specs = Array.isArray(keys) ? keys : [keys];
	const sequences: string[][] = [];
	for (const spec of specs) {
		const steps = spec
			.split(/\s+/)
			.map((step) => step.trim())
			.filter((step) => step.length > 0)
			.map((step) => normalizeChordSpec(step));
		if (steps.length > 0 && steps.every((step) => step.length > 0)) {
			sequences.push(steps);
		}
	}
	return sequences;
};

/**
 * The single-chord signatures a binding matches via DIRECT dispatch. Multi-step
 * sequences are intentionally excluded here — they never fire on a lone keypress
 * and are resolved by the store's pending-prefix buffer instead — so only
 * aliases that are a single chord contribute. Duplicates are removed. Preserves
 * the original single-chord behavior exactly for "j" / "mod+k" / "Esc" specs.
 */
export const normalizeKeysSpec = (keys: string | string[]): string[] => {
	const signatures = new Set<string>();
	for (const sequence of normalizeKeySequences(keys)) {
		if (sequence.length === 1) signatures.add(sequence[0]);
	}
	return [...signatures];
};

/** Normalize a live keydown event into a comparable signature. */
export const normalizeEvent = (event: KeyboardEvent): string => {
	const modifiers = new Set<string>();
	if (event.metaKey || event.ctrlKey) modifiers.add("mod");
	if (event.altKey) modifiers.add("alt");

	const base = normalizeKeyName(event.key);
	// Only fold Shift into the signature for alphabetic keys. Symbol keys like
	// "?" already encode Shift in the produced character, so adding a shift
	// token there would prevent the binding from ever matching.
	if (event.shiftKey && /^[a-z]$/.test(base)) modifiers.add("shift");

	return signatureFromParts(modifiers, base);
};

/** Whether the event target is a text-entry surface that should swallow keys. */
export const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!target) return false;
	const element = target as Partial<HTMLElement> & { tagName?: string };
	const tagName = element.tagName?.toLowerCase();
	if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
	return element.isContentEditable === true;
};
