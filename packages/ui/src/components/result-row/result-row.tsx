import { ChevronRight } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type SearchResult = {
	drawerId: string;
	snippet: string;
	wing: { id: string; name: string; color?: string };
	room: { id: string; name: string };
	scores: { cosine?: number; bm25?: number };
	updatedAt?: Date | string;
};

export type ResultRowProps = {
	result: SearchResult;
	onClick?: () => void;
	selected?: boolean;
	className?: string;
	/**
	 * When true, the row is rendered visually muted, removed from the tab
	 * order, and announced as disabled to assistive tech. Use this for
	 * results whose drawer id could not be resolved — click-through is
	 * unavailable, so the row stays inert.
	 */
	disabled?: boolean;
	/**
	 * Optional explanation surfaced via `title` and an `sr-only` span when
	 * the row is disabled. Defaults to a generic "click-through unavailable"
	 * message.
	 */
	disabledReason?: string;
};

const renderHighlightedSnippet = (snippet: string): ReactNode[] => {
	const parts = snippet.split(/(\*\*[^*]+\*\*)/g);
	return parts
		.filter((part) => part.length > 0)
		.map((part, index) => {
			if (part.startsWith("**") && part.endsWith("**")) {
				const inner = part.slice(2, -2);
				return (
					<mark
						key={`hl-${index}`}
						className="rounded-sm bg-secondary-200 px-0.5 font-medium text-primary-900"
					>
						{inner}
					</mark>
				);
			}
			return <span key={`txt-${index}`}>{part}</span>;
		});
};

const formatScore = (value: number, digits: number) => value.toFixed(digits);

export const ResultRow: FC<ResultRowProps> = (props) => {
	const {
		result,
		onClick,
		selected = false,
		className,
		disabled = false,
		disabledReason = "Click-through unavailable — drawer id could not be resolved.",
	} = props;
	const { wing, room, snippet, scores } = result;

	const handleClick = () => {
		if (disabled) return;
		onClick?.();
	};

	const wingDotStyle = wing.color ? { backgroundColor: wing.color } : undefined;

	return (
		<button
			type="button"
			data-slot="result-row"
			data-selected={selected}
			data-disabled={disabled}
			onClick={handleClick}
			aria-pressed={selected}
			aria-disabled={disabled || undefined}
			tabIndex={disabled ? -1 : undefined}
			title={disabled ? disabledReason : undefined}
			className={cn(
				"group flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2 text-left transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
				selected ? "border-primary-500 bg-primary-50" : "border-transparent hover:bg-secondary-50",
				disabled ? "cursor-not-allowed opacity-60 hover:bg-transparent" : "",
				className,
			)}
		>
			<div className="flex min-w-0 shrink-0 basis-44 items-center gap-1 text-xs text-secondary-700">
				<span
					aria-hidden="true"
					className={cn(
						"inline-block size-2 shrink-0 rounded-full",
						wing.color ? "" : "bg-primary-500",
					)}
					style={wingDotStyle}
				/>
				<span className="truncate text-primary-800">{wing.name}</span>
				<ChevronRight aria-hidden="true" className="size-3 shrink-0 text-secondary-400" />
				<span className="truncate">{room.name}</span>
			</div>
			<p className="min-w-0 flex-1 truncate text-small text-primary-900">
				{renderHighlightedSnippet(snippet)}
			</p>
			<div className="flex shrink-0 items-center gap-3 font-mono text-xs text-secondary-700">
				{typeof scores.cosine === "number" ? (
					<span>cosine={formatScore(scores.cosine, 2)}</span>
				) : null}
				{typeof scores.bm25 === "number" ? <span>bm25={formatScore(scores.bm25, 2)}</span> : null}
			</div>
			{disabled ? <span className="sr-only">{disabledReason}</span> : null}
		</button>
	);
};
