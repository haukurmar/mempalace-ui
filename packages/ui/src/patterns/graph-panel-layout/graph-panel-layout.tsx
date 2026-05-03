import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type GraphPanelLayoutProps = {
	canvas: ReactNode;
	controls?: ReactNode;
	bottomPanel?: ReactNode;
	bottomPanelOpen?: boolean;
	onBottomPanelClose?: () => void;
	bottomPanelHeight?: string;
	className?: string;
};

export const GraphPanelLayout: FC<GraphPanelLayoutProps> = (props) => {
	const {
		canvas,
		controls,
		bottomPanel,
		bottomPanelOpen = false,
		bottomPanelHeight = "h-72",
		className,
	} = props;

	return (
		<div className={cn("relative h-full w-full overflow-hidden bg-background", className)}>
			<div className="absolute inset-0">{canvas}</div>
			{controls ? (
				<div className="absolute top-4 right-4 z-10 flex items-center gap-2">{controls}</div>
			) : null}
			<div
				data-state={bottomPanelOpen ? "open" : "closed"}
				aria-hidden={!bottomPanelOpen}
				className={cn(
					"absolute inset-x-0 bottom-0 z-20 border-t border-secondary-200 bg-background/95 shadow-lg backdrop-blur-sm transition-transform duration-300 ease-in-out",
					bottomPanelHeight,
					bottomPanelOpen ? "translate-y-0" : "translate-y-full",
				)}
			>
				<div className="h-full w-full overflow-y-auto">{bottomPanel}</div>
			</div>
		</div>
	);
};
