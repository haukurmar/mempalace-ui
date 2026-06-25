import { useEffect } from "react";
import { useKeybindRegistry } from "./KeybindRegistryContext";
import type { ScopeName } from "./types";

/**
 * Push `name` onto the active scope stack while the calling surface is mounted
 * and `active`, and pop it on unmount/deactivation. Bindings in a topmost scope
 * shadow lower scopes (see `resolveKeybind`). "global" is implicit and need not
 * be pushed.
 */
export const useScope = (name: ScopeName, active = true): void => {
	const store = useKeybindRegistry();

	useEffect(() => {
		if (!active) return;
		store.pushScope(name);
		return () => store.popScope(name);
	}, [store, name, active]);
};
