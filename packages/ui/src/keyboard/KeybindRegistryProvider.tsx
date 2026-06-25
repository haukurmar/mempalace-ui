import { type FC, type PropsWithChildren, useEffect, useRef } from "react";
import { KeybindRegistryContext } from "./KeybindRegistryContext";
import { KeybindStore } from "./KeybindStore";

export type KeybindRegistryProviderProps = {
	/** Inject a store (e.g. for tests). One is created on first render otherwise. */
	store?: KeybindStore;
	/** Listener root. Defaults to `document`; override for custom roots/tests. */
	target?: Document;
};

/**
 * Holds the {@link KeybindStore} and attaches the single `keydown` listener that
 * drives scope-aware dispatch for the whole app. Mount this once near the root.
 */
export const KeybindRegistryProvider: FC<PropsWithChildren<KeybindRegistryProviderProps>> = (
	props,
) => {
	const { store: providedStore, target, children } = props;
	const storeRef = useRef<KeybindStore>(providedStore ?? new KeybindStore());
	const store = storeRef.current;

	useEffect(() => {
		const root = target ?? document;
		const handleKeyDown = (event: KeyboardEvent) => {
			store.handleKeyDown(event);
		};
		root.addEventListener("keydown", handleKeyDown);
		return () => root.removeEventListener("keydown", handleKeyDown);
	}, [store, target]);

	return (
		<KeybindRegistryContext.Provider value={store}>{children}</KeybindRegistryContext.Provider>
	);
};
