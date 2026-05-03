import { ChevronRight, Copy } from "lucide-react";
import { type FC, type MouseEvent, useState } from "react";
import { cn } from "../../lib/utils";

export type MetadataValue =
	| string
	| number
	| boolean
	| null
	| MetadataValue[]
	| { [key: string]: MetadataValue };

export type MetadataRecord = Record<string, MetadataValue>;

export type MetadataTableProps = {
	data: MetadataRecord;
	dense?: boolean;
	maxValueChars?: number;
	className?: string;
};

const DEFAULT_MAX_VALUE_CHARS = 240;

export const MetadataTable: FC<MetadataTableProps> = (props) => {
	const { data, dense = false, maxValueChars = DEFAULT_MAX_VALUE_CHARS, className } = props;
	const entries = Object.entries(data);

	return (
		<div
			data-slot="metadata-table"
			data-dense={dense}
			className={cn(
				"flex w-full flex-col rounded-md border border-secondary-200 bg-secondary-0 font-mono text-xs",
				className,
			)}
		>
			{entries.length === 0 ? (
				<div className="px-3 py-2 text-secondary-700 italic">No metadata.</div>
			) : (
				entries.map(([key, value], index) => (
					<MetadataRow
						key={key}
						entryKey={key}
						value={value}
						depth={0}
						dense={dense}
						maxValueChars={maxValueChars}
						isLast={index === entries.length - 1}
					/>
				))
			)}
		</div>
	);
};

type MetadataRowProps = {
	entryKey: string;
	value: MetadataValue;
	depth: number;
	dense: boolean;
	maxValueChars: number;
	isLast: boolean;
};

const MetadataRow: FC<MetadataRowProps> = (props) => {
	const { entryKey, value, depth, dense, maxValueChars, isLast } = props;
	const expandable = isExpandable(value);
	const [expanded, setExpanded] = useState(false);

	const handleToggle = () => {
		setExpanded((prev) => !prev);
	};

	const rowPaddingY = dense ? "py-1" : "py-1.5";
	const indentPx = depth * 12;

	return (
		<div className={cn("flex flex-col", isLast ? "" : "border-b border-secondary-100")}>
			<div
				className={cn("flex items-start gap-3 px-3", rowPaddingY)}
				style={{ paddingLeft: 12 + indentPx }}
			>
				<div className="flex w-1/3 min-w-0 items-center gap-1 text-secondary-700">
					{expandable ? (
						<button
							type="button"
							onClick={handleToggle}
							aria-expanded={expanded}
							aria-label={expanded ? `Collapse ${entryKey}` : `Expand ${entryKey}`}
							className="-ml-1 inline-flex min-w-0 items-center gap-1 rounded px-1 text-left hover:bg-secondary-50"
						>
							<ChevronRight
								aria-hidden="true"
								className={cn("size-3 shrink-0 transition-transform", expanded ? "rotate-90" : "")}
							/>
							<span className="truncate">{entryKey}</span>
						</button>
					) : (
						<>
							<span aria-hidden="true" className="inline-block size-3 shrink-0" />
							<span className="truncate">{entryKey}</span>
						</>
					)}
				</div>
				<div className="flex min-w-0 flex-1 items-start">
					<MetadataValueView value={value} maxValueChars={maxValueChars} expanded={expanded} />
				</div>
			</div>
			{expandable && expanded ? (
				<NestedRows value={value} depth={depth + 1} dense={dense} maxValueChars={maxValueChars} />
			) : null}
		</div>
	);
};

type NestedRowsProps = {
	value: MetadataValue;
	depth: number;
	dense: boolean;
	maxValueChars: number;
};

const NestedRows: FC<NestedRowsProps> = (props) => {
	const { value, depth, dense, maxValueChars } = props;

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return (
				<div
					className="px-3 py-1 text-secondary-500 italic"
					style={{ paddingLeft: 12 + depth * 12 }}
				>
					empty array
				</div>
			);
		}
		return (
			<>
				{value.map((item, index) => (
					<MetadataRow
						key={index}
						entryKey={`[${index}]`}
						value={item}
						depth={depth}
						dense={dense}
						maxValueChars={maxValueChars}
						isLast={index === value.length - 1}
					/>
				))}
			</>
		);
	}

	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value);
		if (entries.length === 0) {
			return (
				<div
					className="px-3 py-1 text-secondary-500 italic"
					style={{ paddingLeft: 12 + depth * 12 }}
				>
					empty object
				</div>
			);
		}
		return (
			<>
				{entries.map(([childKey, childValue], index) => (
					<MetadataRow
						key={childKey}
						entryKey={childKey}
						value={childValue}
						depth={depth}
						dense={dense}
						maxValueChars={maxValueChars}
						isLast={index === entries.length - 1}
					/>
				))}
			</>
		);
	}

	return null;
};

type MetadataValueViewProps = {
	value: MetadataValue;
	maxValueChars: number;
	expanded: boolean;
};

const MetadataValueView: FC<MetadataValueViewProps> = (props) => {
	const { value, maxValueChars, expanded } = props;

	if (value === null) {
		return <span className="text-secondary-500 italic">null</span>;
	}

	if (typeof value === "boolean") {
		return (
			<span className={cn("font-medium", value ? "text-primary-600" : "text-red-600")}>
				{value ? "true" : "false"}
			</span>
		);
	}

	if (typeof value === "number") {
		const isLargeNumber = Math.abs(value) >= 1_000_000 || !Number.isInteger(value);
		return (
			<span className={cn("text-primary-800", isLargeNumber ? "tabular-nums text-right" : "")}>
				{value}
			</span>
		);
	}

	if (Array.isArray(value)) {
		return (
			<span className="text-secondary-700 italic">{expanded ? "" : `Array (${value.length})`}</span>
		);
	}

	if (typeof value === "object") {
		const keyCount = Object.keys(value).length;
		return (
			<span className="text-secondary-700 italic">
				{expanded ? "" : `Object (${keyCount} keys)`}
			</span>
		);
	}

	return <StringValue value={value} maxValueChars={maxValueChars} />;
};

type StringValueProps = {
	value: string;
	maxValueChars: number;
};

const StringValue: FC<StringValueProps> = (props) => {
	const { value, maxValueChars } = props;
	const [copied, setCopied] = useState(false);
	const isLong = value.length > maxValueChars;
	const truncated = isLong ? `${value.slice(0, maxValueChars)}…` : value;

	const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	if (!isLong) {
		return <span className="break-all text-primary-900">{value}</span>;
	}

	return (
		<span className="flex min-w-0 flex-1 items-start gap-2">
			<span className="min-w-0 flex-1 break-all text-primary-900">{truncated}</span>
			<button
				type="button"
				onClick={handleCopy}
				aria-label={copied ? "Copied" : "Copy value"}
				className="inline-flex shrink-0 items-center gap-1 rounded border border-secondary-200 bg-secondary-50 px-1.5 py-0.5 text-xs text-secondary-700 hover:bg-secondary-100 hover:text-primary-800"
			>
				<Copy aria-hidden="true" className="size-3" />
				<span>{copied ? "Copied" : "Copy"}</span>
			</button>
		</span>
	);
};

const isExpandable = (value: MetadataValue): boolean => {
	if (value === null) return false;
	if (Array.isArray(value)) return true;
	return typeof value === "object";
};
