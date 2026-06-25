import { createContext, useContext } from "react";
import type { KeybindStore } from "./KeybindStore";

export const KeybindRegistryContext = createContext<KeybindStore | null>(null);

export const useKeybindRegistry = (): KeybindStore => {
	const store = useContext(KeybindRegistryContext);
	if (!store) {
		throw new Error("useKeybindRegistry must be used within a KeybindRegistryProvider");
	}
	return store;
};
