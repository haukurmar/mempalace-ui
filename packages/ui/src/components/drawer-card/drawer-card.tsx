import type { FC } from "react";
import { cn } from "../../lib/utils";
import { WingPill } from "../wing-pill";

export type DrawerSummary = {
	id: string;
	contentSnippet: string;
	wing: { id: string; name: string; color?: string };
	room?: { id: string; name: string };
	createdAt: Date | string;
	bytes?: number;
};

export type DrawerCardProps = {
	drawer: DrawerSummary;
	selected?: boolean;
	onClick?: () => void;
	onSelect?: (id: string) => void;
	density?: "comfortable" | "compact";
	className?: string;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const formatRelative = (value: Date | string): string => {
	const then = typeof value === "string" ? new Date(value) : value;
	const diff = Date.now() - then.getTime();
	if (Number.isNaN(diff)) return "";
	if (diff < MINUTE) return "just now";
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
	return then.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatBytes = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DrawerCard: FC<DrawerCardProps> = (props) => {
	const { drawer, selected = false, onClick, onSelect, density = "comfortable", className } = props;
	const interactive = Boolean(onClick || onSelect);
	const isCompact = density === "compact";

	const handleActivate = () => {
		onSelect?.(drawer.id);
		onClick?.();
	};

	const surfaceClasses = cn(
		"flex w-full flex-col gap-2 rounded-md border bg-primary-0 text-left transition-colors",
		isCompact ? "gap-1.5 p-2.5" : "gap-2 p-3",
		selected ? "border-primary-500 ring-2 ring-primary-500 bg-primary-50" : "border-secondary-200",
		interactive && !selected ? "hover:border-primary-300 hover:bg-secondary-50" : "",
		interactive
			? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
			: "",
		className,
	);

	const header = (
		<div className="flex min-w-0 items-center gap-2">
			<WingPill wing={drawer.wing} compact={isCompact} />
			{drawer.room ? (
				<span className="min-w-0 truncate text-xs text-secondary-700">{drawer.room.name}</span>
			) : null}
		</div>
	);

	const body = (
		<p
			className={cn(
				"line-clamp-2 break-words text-primary-900",
				isCompact ? "text-xs leading-snug" : "text-small leading-snug",
			)}
		>
			{drawer.contentSnippet}
		</p>
	);

	const footer = (
		<div className="flex items-center justify-between gap-2 text-xs text-secondary-700">
			<span>{formatRelative(drawer.createdAt)}</span>
			{typeof drawer.bytes === "number" ? (
				<span className="font-mono">{formatBytes(drawer.bytes)}</span>
			) : null}
		</div>
	);

	if (interactive) {
		return (
			<button
				type="button"
				data-slot="drawer-card"
				data-selected={selected}
				data-density={density}
				onClick={handleActivate}
				aria-pressed={selected}
				className={surfaceClasses}
			>
				{header}
				{body}
				{footer}
			</button>
		);
	}

	return (
		<div
			data-slot="drawer-card"
			data-selected={selected}
			data-density={density}
			className={surfaceClasses}
		>
			{header}
			{body}
			{footer}
		</div>
	);
};
