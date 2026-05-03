import { cn } from "../../lib/utils";
import type { FC } from "react";

export type WingSummary = {
	id: string;
	name: string;
	color?: string;
};

export type WingPillProps = {
	wing: WingSummary;
	compact?: boolean;
	className?: string;
};

export const WingPill: FC<WingPillProps> = (props) => {
	const { wing, compact = false, className } = props;

	const dotStyle = wing.color ? { backgroundColor: wing.color } : undefined;

	return (
		<span
			data-slot="wing-pill"
			data-compact={compact}
			className={cn(
				"inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-100 font-body text-primary-800",
				compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-small",
				className,
			)}
		>
			<span
				aria-hidden="true"
				className={cn(
					"inline-block shrink-0 rounded-full",
					compact ? "size-1.5" : "size-2",
					wing.color ? "" : "bg-primary-500",
				)}
				style={dotStyle}
			/>
			<span className="truncate">{wing.name}</span>
		</span>
	);
};
