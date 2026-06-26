import type { FC } from "react";
import type { GraphLayoutMode } from "../../../graph/renderer/GraphRenderer";
import { LayoutModeButton } from "./LayoutModeButton";

export type LayoutModeControlProps = {
	mode: GraphLayoutMode;
	onModeChange: (mode: GraphLayoutMode) => void;
};

type LayoutOption = {
	mode: GraphLayoutMode;
	label: string;
	hotkey: string;
};

// Order + hotkeys mirror the 1/2/3 keybindings registered in GraphKeybindings.
const LAYOUT_OPTIONS: readonly LayoutOption[] = [
	{ mode: "explode", label: "Explode", hotkey: "1" },
	{ mode: "orbit", label: "Orbit", hotkey: "2" },
	{ mode: "cluster", label: "Cluster", hotkey: "3" },
];

/** Segmented control mirroring the 1/2/3 layout keybindings. */
export const LayoutModeControl: FC<LayoutModeControlProps> = (props) => {
	const { mode, onModeChange } = props;

	return (
		<fieldset className="flex items-center gap-0.5 rounded-md border border-secondary-200 p-0.5">
			<legend className="sr-only">Graph layout mode</legend>
			{LAYOUT_OPTIONS.map((option) => (
				<LayoutModeButton
					key={option.mode}
					mode={option.mode}
					label={option.label}
					hotkey={option.hotkey}
					active={option.mode === mode}
					onSelect={onModeChange}
				/>
			))}
		</fieldset>
	);
};
