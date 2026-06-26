import type { FC } from "react";
import type { GraphLayoutMode } from "../../../graph/renderer/GraphRenderer";
import { ColorModeIndicator } from "./ColorModeIndicator";
import { LayoutModeControl } from "./LayoutModeControl";
import { TunnelHighlightToggle } from "./TunnelHighlightToggle";

export type GraphControlsProps = {
	nodeCount: number;
	tunnelCount?: number;
	layoutMode: GraphLayoutMode;
	onLayoutModeChange: (mode: GraphLayoutMode) => void;
	colorModeLabel: string;
	colorModeHint: string | null;
	tunnelHighlight: boolean;
	onToggleTunnelHighlight: () => void;
};

/**
 * Control cluster pinned top-right of the graph: rendered node/tunnel counts,
 * the layout segmented control (1/2/3), and the color-mode indicator (cycled by
 * `C`). Mode state is owned by the route; this is presentational.
 */
export const GraphControls: FC<GraphControlsProps> = (props) => {
	const {
		nodeCount,
		tunnelCount,
		layoutMode,
		onLayoutModeChange,
		colorModeLabel,
		colorModeHint,
		tunnelHighlight,
		onToggleTunnelHighlight,
	} = props;

	return (
		<div className="flex flex-col gap-2 rounded-md border border-secondary-200 bg-background/90 px-3 py-2 text-xs text-secondary-700 shadow-sm backdrop-blur-sm">
			<div>
				<span className="font-mono text-primary-900">{nodeCount.toLocaleString()}</span> nodes
				{tunnelCount !== undefined ? (
					<>
						{" · "}
						<span className="font-mono text-primary-900">{tunnelCount.toLocaleString()}</span>{" "}
						tunnels
					</>
				) : null}
			</div>
			<LayoutModeControl mode={layoutMode} onModeChange={onLayoutModeChange} />
			<ColorModeIndicator label={colorModeLabel} hint={colorModeHint} />
			<TunnelHighlightToggle
				active={tunnelHighlight}
				tunnelCount={tunnelCount}
				onToggle={onToggleTunnelHighlight}
			/>
		</div>
	);
};
