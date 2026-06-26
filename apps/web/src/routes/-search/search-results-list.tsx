import type { SearchResult } from "@memui/palace-types/search";
import { ResultRow } from "@memui/ui/components";
import { useKeybind, useScope } from "@memui/ui/keyboard";
import { type FC, type FocusEvent, useCallback, useEffect, useRef, useState } from "react";

export type SearchResultsListProps = {
	results: ReadonlyArray<SearchResult>;
	onSelect: (result: SearchResult) => void;
};

const KEYBIND_GROUP = "Search results";

export const SearchResultsList: FC<SearchResultsListProps> = (props) => {
	const { results, onSelect } = props;

	// Active-index focus model (consistent with the browse list): the active
	// row is highlighted, J/K move the cursor, Enter activates it.
	const [activeIndex, setActiveIndex] = useState(0);
	const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
	const listRef = useRef<HTMLUListElement | null>(null);

	// Whether real DOM focus currently lives inside the list surface (the <ul> or
	// one of its rows). This gates the "search-results" scope so J/K only move this
	// list while it is the focused surface — not while a detail panel or other
	// overlay holds focus over the still-mounted results list.
	const [hasListFocus, setHasListFocus] = useState(false);

	// Activate the "search-results" scope only while the list is non-empty AND the
	// focused surface (mirrors browse's `isListVisible && hasListFocus` shape), so
	// its J/K/Enter bindings shadow lower scopes when in use, never answer keys for
	// a panel layered on top, and are never pushed for an empty list.
	useScope("search-results", results.length > 0 && hasListFocus);

	// A new query produces a fresh `results` array — reset the cursor to the
	// top so the active row never points past the new result set.
	useEffect(() => {
		setActiveIndex(0);
	}, [results]);

	// Keep the active row visible as the cursor moves.
	useEffect(() => {
		rowRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	const handleNext = useCallback(() => {
		// Guard empty results: `results.length - 1` is -1 with no rows, so an
		// unguarded Math.min would clamp the cursor to a usable-looking -1 index.
		if (results.length === 0) return;
		setActiveIndex((current) => Math.min(current + 1, results.length - 1));
	}, [results.length]);

	const handlePrev = useCallback(() => {
		if (results.length === 0) return;
		setActiveIndex((current) => Math.max(current - 1, 0));
	}, [results.length]);

	const handleActivate = useCallback(() => {
		const result = results[activeIndex];
		if (!result) return;
		// Respect the unresolved-drawer disabled state — inert rows can't open.
		if (!result.drawerId) return;
		onSelect(result);
	}, [results, activeIndex, onSelect]);

	useKeybind({
		id: "search-results.next",
		keys: "j",
		label: "Next result",
		scope: "search-results",
		group: KEYBIND_GROUP,
		handler: handleNext,
	});

	useKeybind({
		id: "search-results.prev",
		keys: "k",
		label: "Previous result",
		scope: "search-results",
		group: KEYBIND_GROUP,
		handler: handlePrev,
	});

	useKeybind({
		id: "search-results.open",
		keys: "Enter",
		label: "Open result",
		scope: "search-results",
		group: KEYBIND_GROUP,
		handler: handleActivate,
	});

	const handleRowFocus = useCallback((index: number) => {
		setActiveIndex(index);
	}, []);

	// Entering the list surface (tab/click into the <ul> or a row) activates the
	// scope. Mirrors RoomTree's focus tracking: only deactivate once focus leaves
	// the container entirely (relatedTarget no longer inside it).
	const handleListFocus = useCallback(() => {
		setHasListFocus(true);
	}, []);

	const handleListBlur = useCallback((event: FocusEvent<HTMLUListElement>) => {
		if (!listRef.current?.contains(event.relatedTarget as Node | null)) {
			setHasListFocus(false);
		}
	}, []);

	return (
		// Plain focusable container (the reference model the browse list mirrors).
		// Full listbox/option/aria-activedescendant semantics for this active-index
		// list are a deferred a11y enhancement, not an oversight.
		<ul
			ref={listRef}
			aria-label="Search results"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: focusable container drives the active-descendant J/K cursor; rows use an active-index model, not real DOM focus
			tabIndex={0}
			onFocus={handleListFocus}
			onBlur={handleListBlur}
			className="flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
		>
			{results.map((result, index) => (
				<SearchResultsListItem
					// Index-suffixed so the key stays unique even when several
					// rows resolve to the same drawer (multiple chunks of one
					// source file all recover the same first-chunk drawer id).
					key={`${result.drawerId ?? `${result.wing.id}/${result.room.id}`}:${index}`}
					ref={(node) => {
						rowRefs.current[index] = node;
					}}
					result={result}
					index={index}
					isActive={index === activeIndex}
					onSelect={onSelect}
					onFocus={handleRowFocus}
				/>
			))}
		</ul>
	);
};

type SearchResultsListItemProps = {
	ref: (node: HTMLLIElement | null) => void;
	result: SearchResult;
	index: number;
	isActive: boolean;
	onSelect: (result: SearchResult) => void;
	onFocus: (index: number) => void;
};

const SearchResultsListItem: FC<SearchResultsListItemProps> = (props) => {
	const { ref, result, index, isActive, onSelect, onFocus } = props;

	const handleSelect = () => {
		if (!result.drawerId) return;
		// Sync the active cursor to a pointer-driven selection.
		onFocus(index);
		onSelect(result);
	};

	const adapted = {
		drawerId: result.drawerId ?? "",
		snippet: result.snippet,
		wing: { id: result.wing.id, name: result.wing.name },
		room: { id: result.room.id, name: result.room.name },
		scores: { cosine: result.scores.cosine, bm25: result.scores.bm25 },
		updatedAt: result.updatedAt,
	};

	const isResolvable = Boolean(result.drawerId);

	return (
		<li ref={ref}>
			<ResultRow
				result={adapted}
				onClick={isResolvable ? handleSelect : undefined}
				selected={isActive}
				disabled={!isResolvable}
				disabledReason="Click-through unavailable — drawer id could not be resolved."
			/>
		</li>
	);
};
