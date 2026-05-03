import type { DrawerSummary } from "@memui/palace-types/drawer";
import { EmptyState, ErrorState, LoadingState } from "@memui/ui/components";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type FC, useEffect, useRef } from "react";

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
		<div ref={parentRef} className="h-full w-full overflow-auto">
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
							top={vi.start}
							height={vi.size}
							onSelect={onSelect}
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
	top: number;
	height: number;
	onSelect?: (id: string) => void;
};

const DrawerRow: FC<DrawerRowProps> = (props) => {
	const { drawer, top, height, onSelect } = props;

	const handleClick = () => {
		onSelect?.(drawer.id);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className="absolute left-0 grid w-full grid-cols-[120px_140px_minmax(0,1fr)_80px] items-center gap-3 border-b border-secondary-100 px-4 text-left text-small text-primary-900 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-400"
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
