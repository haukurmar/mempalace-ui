import { cn } from "../../lib/utils";
import { ChevronRight, X } from "lucide-react";
import type { FC } from "react";

export type ScopeWing = {
	id: string;
	name: string;
	color?: string;
};

export type ScopeRoom = {
	id: string;
	name: string;
};

export type ScopeChipProps = {
	wing: ScopeWing;
	room?: ScopeRoom;
	onClear?: () => void;
	className?: string;
};

export const ScopeChip: FC<ScopeChipProps> = (props) => {
	const { wing, room, onClear, className } = props;

	const dotStyle = wing.color ? { backgroundColor: wing.color } : undefined;

	const handleClear = () => {
		onClear?.();
	};

	return (
		<span
			data-slot="scope-chip"
			className={cn(
				"inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 font-body text-small text-primary-800",
				className,
			)}
		>
			<span
				aria-hidden="true"
				className={cn(
					"inline-block size-2 shrink-0 rounded-full",
					wing.color ? "" : "bg-primary-500",
				)}
				style={dotStyle}
			/>
			<span className="truncate">{wing.name}</span>
			{room ? (
				<>
					<ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-primary-400" />
					<span className="truncate">{room.name}</span>
				</>
			) : null}
			{onClear ? (
				<button
					type="button"
					onClick={handleClear}
					aria-label="Clear scope"
					className="-mr-1 ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-primary-600 hover:bg-primary-100 hover:text-primary-900"
				>
					<X className="size-3" aria-hidden="true" />
				</button>
			) : null}
		</span>
	);
};
