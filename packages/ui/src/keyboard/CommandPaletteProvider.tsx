import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { CommandBar } from "../components/command-bar";
import { projectKeybindsToCommandActions } from "./projectToCommandActions";
import { useKeybind } from "./useKeybind";
import { useKeybindSnapshot } from "./useKeybindSnapshot";
import { useScope } from "./useScope";

export type CommandPaletteContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
	toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Access the global command palette's open state from anywhere in the tree. */
export const useCommandPalette = (): CommandPaletteContextValue => {
	const value = useContext(CommandPaletteContext);
	if (!value) {
		throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
	}
	return value;
};

export type CommandPaletteProviderProps = {
	placeholder?: string;
};

/**
 * Mounts the single, app-wide `CommandBar` in controlled mode and owns its open
 * state. The registry owns the `mod+k` toggle (registered here), so the
 * `CommandBar`'s built-in self-listener stays inert — controlled mode short
 * circuits it. The palette's action list is projected live from every
 * `paletteVisible` binding in the registry.
 */
export const CommandPaletteProvider: FC<PropsWithChildren<CommandPaletteProviderProps>> = (
	props,
) => {
	const { placeholder, children } = props;
	const [open, setOpen] = useState(false);
	const { keybinds } = useKeybindSnapshot();

	const toggle = useCallback(() => {
		setOpen((prev) => !prev);
	}, []);

	const close = useCallback(() => {
		setOpen(false);
	}, []);

	useKeybind({
		id: "command-palette",
		keys: "mod+k",
		label: "Open command palette",
		scope: "global",
		group: "General",
		handler: toggle,
	});

	// Push the palette scope while open so its Esc binding is the topmost winner,
	// and own Esc through the registry instead of CommandDialog's built-in Radix
	// dismiss (disabled below) so only the palette closes — never a panel under
	// it.
	useScope("palette", open);

	useKeybind({
		id: "command-palette:close",
		keys: "Esc",
		label: "Close command palette",
		scope: "palette",
		group: "General",
		handler: close,
	});

	// Esc is owned by the keybind registry (palette scope), so neutralize the
	// CommandDialog's built-in Radix Esc-to-close to avoid a double close.
	const handleEscapeKeyDown = useCallback((event: KeyboardEvent) => {
		event.preventDefault();
	}, []);

	const actions = useMemo(() => projectKeybindsToCommandActions(keybinds), [keybinds]);
	const value = useMemo<CommandPaletteContextValue>(
		() => ({ open, setOpen, toggle }),
		[open, toggle],
	);

	return (
		<CommandPaletteContext.Provider value={value}>
			{children}
			<CommandBar
				actions={actions}
				open={open}
				onOpenChange={setOpen}
				placeholder={placeholder}
				onEscapeKeyDown={handleEscapeKeyDown}
			/>
		</CommandPaletteContext.Provider>
	);
};
