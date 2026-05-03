import { Clock, FileText, RefreshCw, Sparkles } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";
import { cn } from "../../lib/utils";

export type MiningMode =
	| "manual"
	| "auto"
	| "imported"
	| "synthetic"
	| "mempalace"
	| "mcp"
	| "unknown";

export type Provenance = {
	createdAt: Date | string;
	updatedAt?: Date | string;
	sourcePath: string;
	miningMode: MiningMode;
};

export type ProvenanceFooterProps = {
	provenance: Provenance;
	className?: string;
};

const MINING_MODE_TONE: Record<MiningMode, string> = {
	manual: "border-secondary-200 bg-secondary-50 text-secondary-800",
	auto: "border-primary-200 bg-primary-50 text-primary-800",
	imported: "border-secondary-300 bg-secondary-100 text-secondary-900",
	synthetic: "border-secondary-200 bg-secondary-0 text-secondary-700",
	mempalace: "border-primary-200 bg-primary-50 text-primary-800",
	mcp: "border-primary-300 bg-primary-100 text-primary-900",
	unknown: "border-secondary-200 bg-secondary-0 text-secondary-600",
};

export const ProvenanceFooter: FC<ProvenanceFooterProps> = (props) => {
	const { provenance, className } = props;
	const { createdAt, updatedAt, sourcePath, miningMode } = provenance;
	const truncatedPath = truncateSourcePath(sourcePath);

	return (
		<TooltipProvider delayDuration={200}>
			<div
				data-slot="provenance-footer"
				className={cn(
					"flex w-full items-center gap-2 overflow-hidden font-body text-xs text-secondary-700",
					className,
				)}
			>
				<TimestampPart label="Created" value={createdAt} />
				{updatedAt ? (
					<>
						<Separator />
						<TimestampPart
							label="Updated"
							value={updatedAt}
							icon={<RefreshCw aria-hidden="true" className="size-3" />}
						/>
					</>
				) : null}
				<Separator />
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="flex min-w-0 items-center gap-1">
							<FileText aria-hidden="true" className="size-3 shrink-0" />
							<span className="truncate">{truncatedPath}</span>
						</span>
					</TooltipTrigger>
					<TooltipContent>{sourcePath}</TooltipContent>
				</Tooltip>
				<Separator />
				<MiningModeBadge mode={miningMode} />
			</div>
		</TooltipProvider>
	);
};

type TimestampPartProps = {
	label: string;
	value: Date | string;
	icon?: ReactNode;
};

const TimestampPart: FC<TimestampPartProps> = (props) => {
	const { label, value, icon } = props;
	const date = toDate(value);
	const display = formatRelativeOrShort(date);
	const absolute = date.toLocaleString();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex shrink-0 items-center gap-1">
					{icon ?? <Clock aria-hidden="true" className="size-3" />}
					<span>{display}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent>
				{label}: {absolute}
			</TooltipContent>
		</Tooltip>
	);
};

type MiningModeBadgeProps = {
	mode: MiningMode;
};

const MiningModeBadge: FC<MiningModeBadgeProps> = (props) => {
	const { mode } = props;

	return (
		<span
			data-mining-mode={mode}
			className={cn(
				"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs",
				MINING_MODE_TONE[mode],
			)}
		>
			{mode === "synthetic" ? <Sparkles aria-hidden="true" className="size-3" /> : null}
			<span>{mode}</span>
		</span>
	);
};

const Separator: FC = () => (
	<span aria-hidden="true" className="shrink-0 text-secondary-400">
		•
	</span>
);

const toDate = (value: Date | string): Date => {
	if (value instanceof Date) return value;
	return new Date(value);
};

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "short",
	day: "numeric",
};

export const formatRelativeOrShort = (date: Date, now: Date = new Date()): string => {
	const diffMs = now.getTime() - date.getTime();
	if (Number.isNaN(diffMs)) return "—";

	const future = diffMs < 0;
	const abs = Math.abs(diffMs);
	const seconds = Math.round(abs / 1000);
	const minutes = Math.round(seconds / 60);
	const hours = Math.round(minutes / 60);
	const days = Math.round(hours / 24);

	if (seconds < 45) return future ? "in moments" : "just now";
	if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;
	if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
	if (days < 7) return future ? `in ${days}d` : `${days}d ago`;

	return date.toLocaleDateString(undefined, SHORT_DATE_OPTIONS);
};

export const truncateSourcePath = (sourcePath: string, maxChars = 48): string => {
	if (sourcePath.length <= maxChars) return sourcePath;
	const segments = sourcePath.split("/");
	const filename = segments[segments.length - 1] ?? sourcePath;
	if (filename.length >= maxChars) return `…${filename.slice(-maxChars + 1)}`;
	return `…/${filename}`;
};
