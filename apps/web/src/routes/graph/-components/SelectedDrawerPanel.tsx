import {
	EmptyState,
	ErrorState,
	LoadingState,
	type MetadataRecord,
	MetadataTable,
} from "@memui/ui/components";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { FC } from "react";
import { getDrawer } from "../../../server/functions";

export type SelectedDrawerPanelProps = {
	drawerId: string;
	/** Set while this drawer is isolated (12.6); carries its 2-hop neighbor count. */
	isolate?: { neighborCount: number } | null;
	onClose: () => void;
};

const neighborLabel = (count: number): string =>
	`Isolated · ${count} ${count === 1 ? "neighbor" : "neighbors"}`;

const toMetadataRecord = (raw: unknown): MetadataRecord => {
	if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
	return raw as MetadataRecord;
};

/**
 * Bottom-panel detail for the node the user clicked in the graph. Fetches the
 * full drawer via `getDrawer` and shows its scope, metadata, and a content
 * preview. Closing clears the selection upstream.
 */
export const SelectedDrawerPanel: FC<SelectedDrawerPanelProps> = (props) => {
	const { drawerId, isolate, onClose } = props;

	const drawerQuery = useQuery({
		queryKey: ["palace", "drawer", drawerId],
		queryFn: () => getDrawer({ data: { id: drawerId } }),
	});

	const drawer = drawerQuery.data ?? null;

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center justify-between gap-2 border-b border-secondary-200 px-4 py-3">
				<div className="flex min-w-0 items-center gap-2">
					<span className="truncate font-mono text-xs text-secondary-700" title={drawerId}>
						{drawerId}
					</span>
					{isolate ? (
						<span className="shrink-0 rounded-full bg-primary-700 px-2 py-0.5 text-xs font-medium text-primary-50">
							{neighborLabel(isolate.neighborCount)}
						</span>
					) : null}
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close drawer detail"
					className="inline-flex size-7 items-center justify-center rounded text-secondary-700 hover:bg-secondary-100 hover:text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
				>
					<X aria-hidden="true" className="size-4" />
				</button>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{drawerQuery.isLoading ? (
					<LoadingState label="Loading drawer…" />
				) : drawerQuery.isError ? (
					<ErrorState
						title="Could not load drawer"
						description={
							drawerQuery.error instanceof Error ? drawerQuery.error.message : "Unknown error"
						}
					/>
				) : !drawer ? (
					<EmptyState
						title="Drawer not found"
						description={`No drawer with id ${drawerId} in the current palace.`}
					/>
				) : (
					<div className="flex flex-col gap-4">
						<MetadataTable data={toMetadataRecord(drawer.metadata)} dense />
						<div>
							<h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary-700">
								Content
							</h3>
							<pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border border-secondary-200 bg-secondary-50 p-3 font-mono text-xs leading-relaxed text-primary-900">
								{drawer.content}
							</pre>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
