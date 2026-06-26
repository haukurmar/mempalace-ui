import type { FC } from "react";

export type ColorModeIndicatorProps = {
	label: string;
	/** Non-null when the active mode's metric is missing (Decay stub / empty Cluster). */
	hint: string | null;
};

/** Shows the active color mode (cycled by `C`) and any "metric missing" hint. */
export const ColorModeIndicator: FC<ColorModeIndicatorProps> = (props) => {
	const { label, hint } = props;

	return (
		<div className="flex flex-col gap-0.5">
			<div className="flex items-center gap-1.5">
				<span className="text-secondary-600">Color</span>
				<span className="font-medium text-primary-900">{label}</span>
				<span className="font-mono text-xs text-secondary-500 opacity-70">C</span>
			</div>
			{hint ? <span className="text-xs text-secondary-700 italic">{hint}</span> : null}
		</div>
	);
};
