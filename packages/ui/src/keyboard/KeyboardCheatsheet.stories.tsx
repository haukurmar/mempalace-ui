import type { Meta, StoryObj } from "@storybook/react-vite";
import { type FC, useRef } from "react";
import { KeybindRegistryProvider } from "./KeybindRegistryProvider";
import { KeybindStore } from "./KeybindStore";
import { KeyboardCheatsheet } from "./KeyboardCheatsheet";
import type { Keybind, ScopeName } from "./types";

const noop = () => {};

const seedKeybind = (
	partial: Pick<Keybind, "id" | "keys" | "label" | "scope" | "group">,
): Keybind => ({ ...partial, handler: noop });

const globalBinds: Keybind[] = [
	seedKeybind({
		id: "go-browse",
		keys: "g",
		label: "Go to browse",
		scope: "global",
		group: "Navigation",
	}),
	seedKeybind({
		id: "focus-search",
		keys: "/",
		label: "Focus search",
		scope: "global",
		group: "Navigation",
	}),
	seedKeybind({
		id: "open-palette",
		keys: "mod+k",
		label: "Open command palette",
		scope: "global",
		group: "General",
	}),
];

const drawerPanelBinds: Keybind[] = [
	seedKeybind({
		id: "panel-next",
		keys: "j",
		label: "Next field",
		scope: "drawer-panel",
		group: "Detail panel",
	}),
	seedKeybind({
		id: "panel-edit",
		keys: "e",
		label: "Edit drawer",
		scope: "drawer-panel",
		group: "Detail panel",
	}),
];

/**
 * Builds a fresh registry store seeded with the given bindings and active
 * scopes. Kept per-mount via a ref so HMR re-renders don't accumulate scope
 * pushes.
 */
type HarnessProps = {
	seed: Keybind[];
	scopes?: ScopeName[];
};

const Harness: FC<HarnessProps> = (props) => {
	const { seed, scopes } = props;
	const storeRef = useRef<KeybindStore | null>(null);
	if (!storeRef.current) {
		const store = new KeybindStore();
		for (const bind of seed) store.register(bind);
		for (const scope of scopes ?? []) store.pushScope(scope);
		storeRef.current = store;
	}

	return (
		<KeybindRegistryProvider store={storeRef.current}>
			<div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
				<p className="text-sm text-primary-900">
					Press <kbd className="rounded border border-secondary-300 px-1 text-xs">?</kbd> to open
					the cheatsheet.
				</p>
				<p className="text-xs text-secondary-700">
					Sections reflect the live scope stack; Esc closes the cheatsheet only.
				</p>
			</div>
			<KeyboardCheatsheet />
		</KeybindRegistryProvider>
	);
};

const meta = {
	title: "Keyboard/KeyboardCheatsheet",
	component: KeyboardCheatsheet,
	parameters: { layout: "centered" },
} satisfies Meta<typeof KeyboardCheatsheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GlobalOnly: Story = {
	render: () => <Harness seed={globalBinds} />,
};

export const WithDrawerPanel: Story = {
	render: () => <Harness seed={[...globalBinds, ...drawerPanelBinds]} scopes={["drawer-panel"]} />,
};
