import { useEffect, useRef } from "react";
import { useKeybindRegistry } from "./KeybindRegistryContext";
import type { Keybind } from "./types";

/**
 * Register a keybind for the lifetime of the calling component. The latest
 * `handler` is always invoked (via a ref) without re-subscribing every render;
 * the binding is only re-registered when its identity-bearing fields change.
 */
export const useKeybind = (entry: Keybind): void => {
	const store = useKeybindRegistry();

	// Latest entry (incl. handler) read at fire time without forcing re-register.
	const entryRef = useRef(entry);
	entryRef.current = entry;

	const { id, label, scope, group, paletteVisible } = entry;
	const keysDep = Array.isArray(entry.keys) ? entry.keys.join("|") : entry.keys;

	useEffect(() => {
		const current = entryRef.current;
		store.register({
			id: current.id,
			keys: current.keys,
			label: current.label,
			scope: current.scope,
			group: current.group,
			paletteVisible: current.paletteVisible,
			handler: (event) => entryRef.current.handler(event),
		});
		return () => store.unregister(id);
	}, [store, id, keysDep, label, scope, group, paletteVisible]);
};
