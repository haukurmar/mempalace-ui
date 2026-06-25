import { useEffect, useState } from "react";
import { useKeybindRegistry } from "./KeybindRegistryContext";
import type { Keybind, ScopeName } from "./types";

export type KeybindSnapshot = {
	/** Every registered binding, regardless of whether its scope is active. */
	keybinds: Keybind[];
	/** Active scope stack, bottom-to-top ("global" at index 0). */
	scopeStack: ScopeName[];
};

/**
 * React view over the {@link KeybindStore}: returns the current bindings and
 * active scope stack, re-rendering whenever either changes. This is the read
 * seam the Cmd+K palette and the `?` cheatsheet share so both stay in lock-step
 * with the registry without any separate documentation step.
 */
export const useKeybindSnapshot = (): KeybindSnapshot => {
	const store = useKeybindRegistry();
	const [snapshot, setSnapshot] = useState<KeybindSnapshot>(() => ({
		keybinds: store.getKeybinds(),
		scopeStack: store.getScopeStack(),
	}));

	useEffect(() => {
		const update = () => {
			setSnapshot({ keybinds: store.getKeybinds(), scopeStack: store.getScopeStack() });
		};
		// Reconcile against any registrations that landed between the initial
		// snapshot and this subscription (child effects run before the parent's).
		update();
		return store.subscribe(update);
	}, [store]);

	return snapshot;
};
