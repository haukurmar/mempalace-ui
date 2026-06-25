import { resolveKeybind, signaturePassesInputGuard } from "./dispatch";
import { isEditableTarget, normalizeEvent, normalizeKeySequences } from "./normalizeKeys";
import type { Keybind, ScopeName } from "./types";

/**
 * How long a buffered sequence prefix (e.g. "g" of "g s") stays armed before it
 * is silently dropped. Roughly matches vim's `timeoutlen`.
 */
export const SEQUENCE_TIMEOUT_MS = 1000;

/** Outcome of matching the in-flight step buffer against active sequences. */
type SequenceMatch = {
	/** A binding whose full sequence equals the buffered steps (topmost scope). */
	complete: Keybind | undefined;
	/** Whether some active sequence is still longer but matches the prefix. */
	hasPartial: boolean;
};

/**
 * Framework-agnostic state for the keybind system: the id→binding map and the
 * active scope stack. Kept free of React so the dispatch path is unit-testable
 * without a DOM render. `KeybindRegistryProvider` owns one instance and wires
 * the `keydown` listener to {@link handleKeyDown}.
 */
export class KeybindStore {
	private readonly keybinds = new Map<string, Keybind>();
	/** Bottom-to-top; "global" is always present at index 0. */
	private readonly scopeStack: ScopeName[] = ["global"];
	private readonly listeners = new Set<() => void>();
	/** Buffered step signatures of an in-flight sequence (empty when idle). */
	private pendingSteps: string[] = [];
	private sequenceTimer: ReturnType<typeof setTimeout> | undefined;

	register = (keybind: Keybind): void => {
		this.keybinds.set(keybind.id, keybind);
		this.emit();
	};

	unregister = (id: string): void => {
		if (this.keybinds.delete(id)) this.emit();
	};

	pushScope = (name: ScopeName): void => {
		this.scopeStack.push(name);
		this.emit();
	};

	popScope = (name: ScopeName): void => {
		for (let index = this.scopeStack.length - 1; index >= 0; index -= 1) {
			if (this.scopeStack[index] === name) {
				this.scopeStack.splice(index, 1);
				this.emit();
				return;
			}
		}
	};

	getKeybinds = (): Keybind[] => [...this.keybinds.values()];

	/**
	 * Snapshot of the active scope stack, bottom-to-top. This is the seam Esc /
	 * overlay routing reads from: the topmost scope owns the topmost overlay, so
	 * a later wave can register an Esc binding per overlay scope and the topmost
	 * one wins via {@link resolveKeybind}.
	 */
	getScopeStack = (): ScopeName[] => [...this.scopeStack];

	/** Subscribe to registry/scope changes (for the future `?` cheatsheet). */
	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	resolve = (signature: string, isEditable: boolean): Keybind | undefined =>
		resolveKeybind({
			signature,
			isEditable,
			keybinds: this.getKeybinds(),
			scopeStack: this.scopeStack,
		});

	/**
	 * Dispatch a keydown. Order of precedence:
	 *   1. If a sequence prefix is buffered, try to advance it. A completed
	 *      sequence (topmost active scope wins, same precedence as single keys)
	 *      fires and clears the buffer; a still-partial match extends the buffer;
	 *      a dead-end cancels the buffer and the key is reprocessed fresh below.
	 *   2. Direct single-key / chord dispatch — unchanged from before, so
	 *      j/k/Enter/Esc/mod+k behave exactly as they always have. A scoped
	 *      single-key binding that collides with a sequence's first step wins
	 *      here (it is matched before we ever consider starting a sequence), so
	 *      an active surface's explicit key shadows a global prefix.
	 *   3. Otherwise, if the key begins one or more active sequences, arm the
	 *      pending buffer. The input guard applies to sequence prefixes too, so a
	 *      plain letter typed in a text field never starts a sequence.
	 */
	handleKeyDown = (event: KeyboardEvent): void => {
		const signature = normalizeEvent(event);
		const isEditable = isEditableTarget(event.target);

		if (this.pendingSteps.length > 0) {
			// Input-guard the in-flight sequence with the same rule arming uses: if
			// focus has moved into a text surface since the prefix was armed, a
			// buffered sequence must not complete or swallow the next keystroke
			// inside the input. Drop the prefix and reprocess the key as a fresh
			// keydown (which the arming guard below then lets type normally).
			if (isEditable && !signaturePassesInputGuard(signature)) {
				this.clearPending();
			} else {
				const steps = [...this.pendingSteps, signature];
				const { complete, hasPartial } = this.matchSequences(steps);
				if (complete) {
					this.clearPending();
					event.preventDefault();
					complete.handler(event);
					return;
				}
				if (hasPartial) {
					this.pendingSteps = steps;
					this.armSequenceTimeout();
					event.preventDefault();
					return;
				}
				// Dead end: drop the prefix and reprocess this key as a fresh keydown
				// so a sequence that leads nowhere doesn't swallow the next key.
				this.clearPending();
			}
		}

		const match = this.resolve(signature, isEditable);
		if (match) {
			event.preventDefault();
			match.handler(event);
			return;
		}

		if (isEditable && !signaturePassesInputGuard(signature)) return;
		if (this.matchSequences([signature]).hasPartial) {
			this.pendingSteps = [signature];
			this.armSequenceTimeout();
			event.preventDefault();
		}
	};

	/**
	 * Match the buffered step list against every active binding's sequences.
	 * Only multi-step sequences (length ≥ 2) participate; single chords are the
	 * domain of {@link resolveKeybind}. A sequence contributes a `complete` match
	 * when it equals `steps` exactly, or sets `hasPartial` when it is longer but
	 * shares the `steps` prefix. Among complete matches the topmost active scope
	 * wins — identical precedence to single-key dispatch.
	 */
	private matchSequences = (steps: readonly string[]): SequenceMatch => {
		let complete: Keybind | undefined;
		let completePosition = -1;
		let hasPartial = false;

		for (const keybind of this.keybinds.values()) {
			const position = this.scopeStack.lastIndexOf(keybind.scope);
			if (position < 0) continue; // scope not currently active
			for (const sequence of normalizeKeySequences(keybind.keys)) {
				if (sequence.length < 2) continue; // not a sequence
				if (sequence.length < steps.length) continue;
				let isPrefix = true;
				for (let index = 0; index < steps.length; index += 1) {
					if (sequence[index] !== steps[index]) {
						isPrefix = false;
						break;
					}
				}
				if (!isPrefix) continue;
				if (sequence.length === steps.length) {
					if (position > completePosition) {
						completePosition = position;
						complete = keybind;
					}
				} else {
					hasPartial = true;
				}
			}
		}

		return { complete, hasPartial };
	};

	private armSequenceTimeout = (): void => {
		this.clearSequenceTimer();
		this.sequenceTimer = setTimeout(() => {
			this.pendingSteps = [];
			this.sequenceTimer = undefined;
		}, SEQUENCE_TIMEOUT_MS);
	};

	private clearSequenceTimer = (): void => {
		if (this.sequenceTimer !== undefined) {
			clearTimeout(this.sequenceTimer);
			this.sequenceTimer = undefined;
		}
	};

	private clearPending = (): void => {
		this.pendingSteps = [];
		this.clearSequenceTimer();
	};

	private emit = (): void => {
		for (const listener of this.listeners) listener();
	};
}
