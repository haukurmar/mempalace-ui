import { SearchField } from "@memui/ui/components";
import { type FC, type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { SearchHistoryEntry } from "./use-search-history";

export type SearchInputProps = {
	value: string;
	onChange: (next: string) => void;
	onSubmit: (query: string) => void;
	history: ReadonlyArray<SearchHistoryEntry>;
	onHistorySelect: (entry: SearchHistoryEntry) => void;
	placeholder?: string;
	autoFocus?: boolean;
};

const formatTimestamp = (iso: string): string => {
	try {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return "";
		return date.toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
};

export const SearchInput: FC<SearchInputProps> = (props) => {
	const { value, onChange, onSubmit, history, onHistorySelect, placeholder, autoFocus } = props;
	const [focused, setFocused] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!containerRef.current) return;
			if (containerRef.current.contains(event.target as Node)) return;
			setFocused(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSubmit = (next: string) => {
		onSubmit(next);
		setFocused(false);
	};

	const handleFocus = () => {
		setFocused(true);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			setFocused(false);
			inputRef.current?.blur();
		}
	};

	const handleHistoryClick = (entry: SearchHistoryEntry) => {
		onHistorySelect(entry);
		setFocused(false);
	};

	const showDropdown = focused && value.length === 0 && history.length > 0;

	return (
		<div ref={containerRef} className="relative w-full">
			<SearchField
				inputRef={inputRef}
				value={value}
				onChange={onChange}
				onSubmit={handleSubmit}
				onFocus={handleFocus}
				onKeyDown={handleKeyDown}
				placeholder={placeholder ?? "Search the palace…"}
				ariaLabel="Search the palace"
				formAriaLabel="Palace search"
				autoFocus={autoFocus}
			/>
			{showDropdown ? (
				<HistoryDropdown
					entries={history}
					onSelect={handleHistoryClick}
					formatAt={formatTimestamp}
				/>
			) : null}
		</div>
	);
};

type HistoryDropdownProps = {
	entries: ReadonlyArray<SearchHistoryEntry>;
	onSelect: (entry: SearchHistoryEntry) => void;
	formatAt: (iso: string) => string;
};

const HistoryDropdown: FC<HistoryDropdownProps> = (props) => {
	const { entries, onSelect, formatAt } = props;
	return (
		<div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-secondary-200 bg-background shadow-md">
			<p className="px-3 py-1.5 text-xs uppercase tracking-wide text-secondary-500">
				Recent searches
			</p>
			<ul aria-label="Recent searches">
				{entries.map((entry) => (
					<HistoryEntryItem
						key={`${entry.query}-${entry.at}`}
						entry={entry}
						onSelect={onSelect}
						formatAt={formatAt}
					/>
				))}
			</ul>
		</div>
	);
};

type HistoryEntryItemProps = {
	entry: SearchHistoryEntry;
	onSelect: (entry: SearchHistoryEntry) => void;
	formatAt: (iso: string) => string;
};

const HistoryEntryItem: FC<HistoryEntryItemProps> = (props) => {
	const { entry, onSelect, formatAt } = props;

	const handleClick = () => {
		onSelect(entry);
	};

	return (
		<li>
			<button
				type="button"
				onMouseDown={handleClick}
				className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-secondary-50 focus:bg-secondary-50 focus:outline-none"
			>
				<span className="truncate text-primary-900">{entry.query}</span>
				<span className="shrink-0 font-mono text-xs text-secondary-500">{formatAt(entry.at)}</span>
			</button>
		</li>
	);
};
