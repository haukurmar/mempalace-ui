import { ErrorState, LoadingState, type RoomNode, RoomTree } from "@memui/ui/components";
import { ListDetailLayout } from "@memui/ui/patterns";
import { createFileRoute, Outlet, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { type FC, useMemo } from "react";
import { getRoomTree } from "../../server/functions";
import { DrawerDetail } from "./-components/drawer-detail";
import { ROOM_TREE_QUERY_KEY, useRoomTree } from "./-components/use-room-tree";

export type BrowseSearch = {
	drawer?: string;
};

const validateBrowseSearch = (raw: Record<string, unknown>): BrowseSearch => {
	const drawer = raw.drawer;
	if (typeof drawer === "string" && drawer.length > 0) return { drawer };
	return {};
};

const BrowseLayout: FC = () => {
	const treeQuery = useRoomTree();
	const navigate = useNavigate();
	const params = useParams({
		strict: false,
		select: (p) => ({
			wing: typeof p.wing === "string" ? p.wing : undefined,
			room: typeof p.room === "string" ? p.room : undefined,
		}),
	});
	const search = useSearch({ from: "/browse" });
	const drawerId = search.drawer;

	const treeData = useMemo(() => {
		if (!treeQuery.data) return { wings: [] };
		return {
			wings: treeQuery.data.wings.map((wing) => ({
				id: wing.id,
				name: wing.name,
				drawerCount: wing.drawerCount,
				rooms: wing.rooms.map<RoomNode>((room) => ({
					id: room.id,
					name: room.name,
					drawerCount: room.drawerCount,
				})),
			})),
		};
	}, [treeQuery.data]);

	const expandedIds = useMemo(() => {
		const ids = new Set<string>();
		if (params.wing) ids.add(params.wing);
		return ids;
	}, [params.wing]);

	const selectedId = params.room ? `${params.wing}/${params.room}` : params.wing;

	const handleSelect = (id: string, kind: "wing" | "room") => {
		if (kind === "wing") {
			navigate({
				to: "/browse/$wing",
				params: { wing: id },
				search: (s) => ({ ...s, drawer: undefined }),
			});
			return;
		}
		const slash = id.indexOf("/");
		if (slash === -1) return;
		const wingId = id.slice(0, slash);
		const roomId = id.slice(slash + 1);
		navigate({
			to: "/browse/$wing/$room",
			params: { wing: wingId, room: roomId },
			search: (s) => ({ ...s, drawer: undefined }),
		});
	};

	const handleCloseDetail = () => {
		navigate({ to: ".", search: (s) => ({ ...s, drawer: undefined }) });
	};

	const sidebar = (
		<div className="flex h-full flex-col gap-3 p-3">
			<h2 className="px-2 text-xs font-medium uppercase tracking-wide text-secondary-700">
				Palace
			</h2>
			{treeQuery.isLoading ? (
				<LoadingState label="Loading palace…" />
			) : treeQuery.isError ? (
				<ErrorState
					title="Could not load palace tree"
					description={treeQuery.error instanceof Error ? treeQuery.error.message : "Unknown error"}
				/>
			) : (
				<RoomTree
					data={treeData}
					selectedId={selectedId}
					expandedIds={expandedIds}
					onSelect={handleSelect}
				/>
			)}
		</div>
	);

	return (
		<div className="h-screen w-screen">
			<ListDetailLayout
				sidebar={sidebar}
				main={<Outlet />}
				detail={drawerId ? <DrawerDetail drawerId={drawerId} onClose={handleCloseDetail} /> : null}
				detailOpen={Boolean(drawerId)}
				onDetailClose={handleCloseDetail}
			/>
		</div>
	);
};

export const Route = createFileRoute("/browse")({
	component: BrowseLayout,
	validateSearch: validateBrowseSearch,
	loader: async ({ context }) => {
		try {
			await context.queryClient.ensureQueryData({
				queryKey: ROOM_TREE_QUERY_KEY,
				queryFn: () => getRoomTree(),
			});
		} catch {
			// Component surfaces the error via `useQuery.isError`; don't fail route load.
		}
	},
});
