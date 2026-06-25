import type { DrawerSummary } from "@memui/palace-types/drawer";
import { EmptyState, ErrorState, LoadingState } from "@memui/ui/components";
import { useKeybind, useScope } from "@memui/ui/keyboard";
import { cn } from "@memui/ui/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type FC, type FocusEvent, useCallback, useEffect, useRef, useState } from "react";

const ROW_HEIGHT = 64;
const OVERSCAN = 8;

export type VirtualizedDrawerListProps = {
	drawers: ReadonlyArray<DrawerSummary>;
	isLoading: boolean;
	isError: boolean;
	errorMessage?: string;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
	onSelect?: (id: string) => void;
	emptyTitle: string;
	emptyDescription?: string;
};

const formatDate = (iso: string) => {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatBytes = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const VirtualizedDrawerList: FC<VirtualizedDrawerListProps> = (props) => {
	const {
		drawers,
		isLoading,
		isError,
		errorMessage,
		hasNextPage,
		isFetchingNextPage,
		onLoadMore,
		onSelect,
		emptyTitle,
		emptyDescription,
	} = props;

	const parentRef = useRef<HTMLDivElement | null>(null);

	// Hybrid focus model: the list is virtualized (rows unmount on scroll), so we
	// never rely on real DOM focus for the active row. Instead we track an "active"
	// row index and drive `scrollToIndex` so the highlighted row stays in view as
	// J/K move it. Real DOM focus is still tracked on the scroll container below
	// (`hasListFocus`) purely to gate the keyboard scope.
	const [activeIndex, setActiveIndex] = useState(-1);

	// Whether real DOM focus currently lives inside the list surface (the scroll
	// container or one of its rows). This gates the "browse-list" scope so J/K only
	// move this list while it is the focused surface — not while a detail panel or
	// other overlay holds focus over a still-mounted background list.
	const [hasListFocus, setHasListFocus] = useState(false);

	const virtualizer = useVirtualizer({
		count: drawers.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: OVERSCAN,
		getItemKey: (index) => drawers[index]?.id ?? index,
	});

	const items = virtualizer.getVirtualItems();
	const lastItem = items[items.length - 1];

	useEffect(() => {
		if (!lastItem) return;
		if (!hasNextPage || isFetchingNextPage) return;
		if (lastItem.index >= drawers.length - OVERSCAN) {
			onLoadMore();
		}
	}, [lastItem, hasNextPage, isFetchingNextPage, drawers.length, onLoadMore]);

	// Keep the active index in range when the underlying list shrinks (e.g. the
	// user switches rooms and a smaller page loads).
	useEffect(() => {
		if (activeIndex > drawers.length - 1) {
			setActiveIndex(drawers.length > 0 ? drawers.length - 1 : -1);
		}
	}, [drawers.length, activeIndex]);

	const moveTo = useCallback(
		(index: number) => {
			setActiveIndex(index);
			virtualizer.scrollToIndex(index, { align: "auto" });
		},
		[virtualizer],
	);

	const handleNext = useCallback(() => {
		if (drawers.length === 0) return;
		const next = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, drawers.length - 1);
		moveTo(next);
	}, [activeIndex, drawers.length, moveTo]);

	const handlePrev = useCallback(() => {
		if (drawers.length === 0) return;
		const prev = activeIndex < 0 ? 0 : Math.max(activeIndex - 1, 0);
		moveTo(prev);
	}, [activeIndex, drawers.length, moveTo]);

	const handleOpenActive = useCallback(() => {
		if (activeIndex < 0 || activeIndex >= drawers.length) return;
		const drawer = drawers[activeIndex];
		if (drawer) onSelect?.(drawer.id);
	}, [activeIndex, drawers, onSelect]);

	const handleRowActivate = useCallback(
		(index: number) => {
			setActiveIndex(index);
			const drawer = drawers[index];
			if (drawer) onSelect?.(drawer.id);
		},
		[drawers, onSelect],
	);

	// Entering the list surface (tab/click into the scroll container or a row)
	// activates the scope; seed an active row so there's a visible cursor for J/K
	// to move from. Mirrors RoomTree's focus tracking: only deactivate once focus
	// leaves the container entirely (relatedTarget no longer inside it).
	const handleListFocus = useCallback(() => {
		setHasListFocus(true);
		setActiveIndex((current) => (current < 0 && drawers.length > 0 ? 0 : current));
	}, [drawers.length]);

	const handleListBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
		if (!parentRef.current?.contains(event.relatedTarget as Node | null)) {
			setHasListFocus(false);
		}
	}, []);

	// The "browse-list" scope wins J/K/Enter dispatch only while the list is both
	// on screen (not the loading / error / empty fallbacks) AND the focused
	// surface, so a hidden background list never answers keys for a panel on top.
	const isListVisible = !isError && drawers.length > 0;
	useScope("browse-list", isListVisible && hasListFocus);

	useKeybind({
		id: "browse-list.next",
		keys: "j",
		label: "Next drawer",
		scope: "browse-list",
		group: "Browse list",
		handler: handleNext,
	});
	useKeybind({
		id: "browse-list.prev",
		keys: "k",
		label: "Previous drawer",
		scope: "browse-list",
		group: "Browse list",
		handler: handlePrev,
	});
	useKeybind({
		id: "browse-list.open",
		keys: "Enter",
		label: "Open drawer",
		scope: "browse-list",
		group: "Browse list",
		handler: handleOpenActive,
	});

	if (isLoading && drawers.length === 0) {
		return <LoadingState label="Loading drawers…" />;
	}

	if (isError) {
		return <ErrorState title="Could not load drawers" description={errorMessage} />;
	}

	if (drawers.length === 0) {
		return <EmptyState title={emptyTitle} description={emptyDescription} />;
	}

	return (
		// Plain focusable container, consistent with the search-results list. Full
		// listbox/option/aria-activedescendant semantics for this active-index list
		// are a deferred a11y enhancement; the rows are <button>s driven by an
		// active-index cursor, not real DOM focus, so `listbox` would mislead SRs.
		// Unlike search-results' semantic <ul>, the virtualized scroll container must
		// stay a <div>, so the role-less focusable+labelled seam trips two extra
		// element-level a11y lints, suppressed intentionally here:
		// biome-ignore lint/a11y/noStaticElementInteractions: the scroll container is the keyboard seam (onFocus/onBlur gate the browse-list scope); its rows are real <button>s
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label names the focusable container for screen readers; keeping it role-less (not a misleading listbox) is the intentional choice above
		<div
			ref={parentRef}
			aria-label="Drawers"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: focusable container drives the active-index J/K cursor; rows are <button>s using an active-index model, not real DOM focus
			tabIndex={0}
			onFocus={handleListFocus}
			onBlur={handleListBlur}
			className="h-full w-full overflow-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
		>
			<div className="sticky top-0 z-10 grid grid-cols-[120px_140px_minmax(0,1fr)_80px] gap-3 border-b border-secondary-200 bg-background px-4 py-2 font-mono text-xs uppercase tracking-wide text-secondary-700">
				<span>Date</span>
				<span>Room</span>
				<span>Snippet</span>
				<span className="text-right">Size</span>
			</div>
			<div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
				{items.map((vi) => {
					const drawer = drawers[vi.index];
					if (!drawer) return null;
					return (
						<DrawerRow
							key={drawer.id}
							drawer={drawer}
							index={vi.index}
							active={vi.index === activeIndex}
							top={vi.start}
							height={vi.size}
							onActivate={handleRowActivate}
						/>
					);
				})}
			</div>
			{isFetchingNextPage ? (
				<div className="border-t border-secondary-200 px-4 py-2 text-xs text-secondary-700">
					Loading more…
				</div>
			) : null}
		</div>
	);
};

type DrawerRowProps = {
	drawer: DrawerSummary;
	index: number;
	active: boolean;
	top: number;
	height: number;
	onActivate: (index: number) => void;
};

const DrawerRow: FC<DrawerRowProps> = (props) => {
	const { drawer, index, active, top, height, onActivate } = props;

	const handleClick = () => {
		onActivate(index);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-current={active || undefined}
			data-active={active}
			className={cn(
				"absolute left-0 grid w-full grid-cols-[120px_140px_minmax(0,1fr)_80px] items-center gap-3 border-b border-secondary-100 px-4 text-left text-small text-primary-900 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-400",
				active && "bg-primary-100 ring-2 ring-inset ring-primary-400 hover:bg-primary-100",
			)}
			style={{ top: `${top}px`, height: `${height}px` }}
		>
			<span className="font-mono text-xs text-secondary-700">{formatDate(drawer.createdAt)}</span>
			<span className="truncate text-xs text-secondary-700">{drawer.roomId}</span>
			<span className="line-clamp-2 break-words leading-snug">{drawer.contentSnippet}</span>
			<span className="text-right font-mono text-xs text-secondary-700">
				{typeof drawer.bytes === "number" ? formatBytes(drawer.bytes) : ""}
			</span>
		</button>
	);
};
