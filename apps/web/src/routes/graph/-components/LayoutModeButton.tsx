import type { FC } from "react";
import type { GraphLayoutMode } from "../-renderer/GraphRenderer";

export type LayoutModeButtonProps = {
	mode: GraphLayoutMode;
	label: string;
	/** Keyboard shortcut digit shown as a hint (1/2/3). */
	hotkey: string;
	active: boolean;
	onSelect: (mode: GraphLayoutMode) => void;
};

/** One segment of the layout segmented control. */
export const LayoutModeButton: FC<LayoutModeButtonProps> = (props) => {
	const { mode, label, hotkey, active, onSelect } = props;

	const handleClick = () => {
		onSelect(mode);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-pressed={active}
			title={`${label} layout (${hotkey})`}
			className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
				active
					? "bg-primary-700 text-primary-50"
					: "text-secondary-600 hover:bg-secondary-100 hover:text-primary-900"
			}`}
		>
			<span>{label}</span>
			<span className={`font-mono text-xs ${active ? "opacity-70" : "opacity-50"}`}>{hotkey}</span>
		</button>
	);
};
