import type { DrawerHistoryEntry } from "@memui/palace-types/drawer";
import {
	EmptyState,
	ErrorState,
	LoadingState,
	MetadataTable,
	type MetadataRecord,
	ProvenanceFooter,
	ScopeChip,
} from "@memui/ui/components";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText, X } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDrawer, getDrawerEmbeddingSummary, getRoomTree } from "../../../server/functions";
import { ROOM_TREE_QUERY_KEY } from "./use-room-tree";

export type DrawerDetailProps = {
	drawerId: string;
	onClose: () => void;
};

const toMetadataRecord = (raw: unknown): MetadataRecord => {
	if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
	return raw as MetadataRecord;
};

export const DrawerDetail: FC<DrawerDetailProps> = (props) => {
	const { drawerId, onClose } = props;
	const [showRaw, setShowRaw] = useState(false);

	const drawerQuery = useQuery({
		queryKey: ["palace", "drawer", drawerId],
		queryFn: () => getDrawer({ data: { id: drawerId } }),
	});

	const embeddingQuery = useQuery({
		queryKey: ["palace", "drawer", drawerId, "embedding"],
		queryFn: () => getDrawerEmbeddingSummary({ data: { id: drawerId } }),
		enabled: drawerQuery.data !== null && drawerQuery.data !== undefined,
	});

	const treeQuery = useQuery({
		queryKey: ROOM_TREE_QUERY_KEY,
		queryFn: () => getRoomTree(),
	});

	const drawer = drawerQuery.data ?? null;

	const scope = useMemo(() => {
		if (!drawer) return null;
		const wingNode = treeQuery.data?.wings.find((w) => w.id === drawer.wingId);
		const wingName = wingNode?.name ?? drawer.wingId;
		const roomKey = `${drawer.wingId}/${drawer.roomId}`;
		const roomNode = wingNode?.rooms.find((r) => r.id === roomKey);
		const roomName = roomNode?.name ?? drawer.roomId;
		return {
			wing: { id: drawer.wingId, name: wingName },
			room: { id: drawer.roomId, name: roomName },
		};
	}, [drawer, treeQuery.data]);

	const handleToggleRaw = () => {
		setShowRaw((prev) => !prev);
	};

	return (
		<div className="flex h-full flex-col">
			<DetailHeader drawerId={drawerId} onClose={onClose} />
			<div className="min-h-0 flex-1 overflow-y-auto">
				{drawerQuery.isLoading ? (
					<div className="p-6">
						<LoadingState label="Loading drawer…" />
					</div>
				) : drawerQuery.isError ? (
					<div className="p-6">
						<ErrorState
							title="Could not load drawer"
							description={
								drawerQuery.error instanceof Error ? drawerQuery.error.message : "Unknown error"
							}
						/>
					</div>
				) : !drawer ? (
					<div className="p-6">
						<EmptyState
							title="Drawer not found"
							description={`No drawer with id ${drawerId} in the current palace.`}
						/>
					</div>
				) : (
					<div className="flex flex-col gap-6 p-4">
						{scope ? (
							<div>
								<ScopeChip wing={scope.wing} room={scope.room} />
							</div>
						) : null}

						<DetailSection
							title="Content"
							action={
								<button
									type="button"
									onClick={handleToggleRaw}
									className="inline-flex items-center gap-1 rounded border border-secondary-200 bg-secondary-0 px-2 py-1 font-mono text-xs text-secondary-700 hover:bg-secondary-50"
									aria-pressed={showRaw}
								>
									{showRaw ? (
										<>
											<Eye aria-hidden="true" className="size-3" />
											<span>Show rendered</span>
										</>
									) : (
										<>
											<FileText aria-hidden="true" className="size-3" />
											<span>Show raw</span>
										</>
									)}
								</button>
							}
						>
							{showRaw ? (
								<pre className="overflow-auto rounded-md border border-secondary-200 bg-secondary-50 p-3 font-mono text-xs leading-relaxed text-primary-900 whitespace-pre-wrap break-words">
									{drawer.content}
								</pre>
							) : (
								<MarkdownContent value={drawer.content} />
							)}
						</DetailSection>

						<DetailSection title="Metadata">
							<MetadataTable data={toMetadataRecord(drawer.metadata)} />
						</DetailSection>

						<DetailSection title="Embedding summary">
							<EmbeddingSummaryView query={embeddingQuery} />
						</DetailSection>

						<DetailSection title="Closets">
							<EmptyState
								title="Closet listing not available yet"
								description="Phase 12 wires this surface."
							/>
						</DetailSection>

						<DetailSection title="Tunnels">
							<EmptyState
								title="Tunnel listing not available yet"
								description="Cross-wing tunnel inspection lands with the curation phase."
							/>
						</DetailSection>

						{drawer.history && drawer.history.length > 0 ? (
							<DetailSection title="History">
								<HistoryList entries={drawer.history} />
							</DetailSection>
						) : null}

						<DetailSection title="Provenance">
							<ProvenanceFooter provenance={drawer.provenance} />
						</DetailSection>
					</div>
				)}
			</div>
		</div>
	);
};

type DetailHeaderProps = {
	drawerId: string;
	onClose: () => void;
};

const DetailHeader: FC<DetailHeaderProps> = (props) => {
	const { drawerId, onClose } = props;
	return (
		<div className="flex shrink-0 items-center justify-between gap-2 border-b border-secondary-200 px-4 py-3">
			<span className="truncate font-mono text-xs text-secondary-700" title={drawerId}>
				{drawerId}
			</span>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close drawer detail"
				className="inline-flex size-7 items-center justify-center rounded text-secondary-700 hover:bg-secondary-100 hover:text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
			>
				<X aria-hidden="true" className="size-4" />
			</button>
		</div>
	);
};

type DetailSectionProps = {
	title: string;
	action?: React.ReactNode;
	children: React.ReactNode;
};

const DetailSection: FC<DetailSectionProps> = (props) => {
	const { title, action, children } = props;
	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-xs font-medium uppercase tracking-wide text-secondary-700">{title}</h3>
				{action}
			</div>
			{children}
		</section>
	);
};

type MarkdownContentProps = {
	value: string;
};

const MarkdownContent: FC<MarkdownContentProps> = (props) => {
	const { value } = props;
	if (!value.trim()) {
		return <p className="text-sm italic text-secondary-700">Drawer content is empty.</p>;
	}
	return (
		<div className="space-y-4 text-sm leading-relaxed text-primary-900 [&_a]:text-primary-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-secondary-300 [&_blockquote]:pl-3 [&_blockquote]:text-secondary-700 [&_code]:rounded [&_code]:bg-secondary-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_hr]:border-secondary-200 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-secondary-100 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-secondary-200 [&_th]:bg-secondary-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_ul]:list-disc [&_ul]:pl-5">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
		</div>
	);
};

type EmbeddingSummaryQuery = ReturnType<
	typeof useQuery<Awaited<ReturnType<typeof getDrawerEmbeddingSummary>>>
>;

type EmbeddingSummaryViewProps = {
	query: EmbeddingSummaryQuery;
};

const EmbeddingSummaryView: FC<EmbeddingSummaryViewProps> = (props) => {
	const { query } = props;
	if (query.isLoading) return <LoadingState label="Loading embedding…" />;
	if (query.isError) {
		return (
			<ErrorState
				title="Could not load embedding"
				description={query.error instanceof Error ? query.error.message : "Unknown error"}
			/>
		);
	}
	const data = query.data;
	if (!data) return null;
	if ("available" in data) {
		return (
			<EmptyState
				title="Embedding vector not available"
				description="chromadb compacted the queue for this drawer."
			/>
		);
	}
	const stats: MetadataRecord = {
		dimensions: data.dimensions,
		norm: Number(data.norm.toFixed(4)),
		min: Number(data.min.toFixed(6)),
		max: Number(data.max.toFixed(6)),
	};
	if (data.model) stats.model = data.model;
	return (
		<div className="flex flex-col gap-3">
			<MetadataTable data={stats} dense />
			{data.preview.length > 0 ? (
				<div>
					<div className="text-xs uppercase tracking-wide text-secondary-700">
						First {data.preview.length} dimensions
					</div>
					<pre className="mt-1 overflow-x-auto rounded-md border border-secondary-200 bg-secondary-50 p-2 font-mono text-xs leading-relaxed text-primary-900">
						{data.preview.map((v) => v.toFixed(4)).join("  ")}
					</pre>
				</div>
			) : null}
		</div>
	);
};

type HistoryListProps = {
	entries: readonly DrawerHistoryEntry[];
};

const HistoryList: FC<HistoryListProps> = (props) => {
	const { entries } = props;
	return (
		<ol className="flex flex-col gap-1 text-xs text-secondary-700">
			{entries.map((entry, index) => (
				<li
					key={`${entry.at}-${index}`}
					className="flex items-baseline gap-2 border-b border-secondary-100 pb-1 last:border-b-0"
				>
					<span className="font-mono text-secondary-500">{entry.at}</span>
					<span className="font-medium text-primary-900">{entry.kind}</span>
					{entry.by ? <span>by {entry.by}</span> : null}
				</li>
			))}
		</ol>
	);
};
