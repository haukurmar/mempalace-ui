import { ScopeChip } from "@memui/ui/components";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FC, useCallback, useMemo } from "react";
import { getRoomTree, listDrawerSummariesByRoom } from "../../../server/functions";
import { ROOM_TREE_QUERY_KEY } from "../-components/use-room-tree";
import { VirtualizedDrawerList } from "../-components/virtualized-drawer-list";

const PAGE_SIZE = 100;

const RoomPage: FC = () => {
	const { wing, room } = Route.useParams();

	const treeQuery = useQuery({
		queryKey: ROOM_TREE_QUERY_KEY,
		queryFn: () => getRoomTree(),
	});
	const wingNode = treeQuery.data?.wings.find((w) => w.id === wing);
	const wingName = wingNode?.name ?? wing;
	const roomNode = wingNode?.rooms.find((r) => r.id === `${wing}/${room}`);
	const roomName = roomNode?.name ?? room;

	const query = useInfiniteQuery({
		queryKey: ["palace", "drawers", "room", wing, room],
		queryFn: ({ pageParam }) =>
			listDrawerSummariesByRoom({
				data: { wingId: wing, roomId: room, limit: PAGE_SIZE, offset: pageParam },
			}),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < PAGE_SIZE) return undefined;
			return allPages.length * PAGE_SIZE;
		},
	});

	const drawers = useMemo(() => {
		return query.data?.pages.flat() ?? [];
	}, [query.data]);

	const handleLoadMore = useCallback(() => {
		query.fetchNextPage();
	}, [query.fetchNextPage]);

	const errorMessage = query.error instanceof Error ? query.error.message : undefined;

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center gap-2 border-b border-secondary-200 px-4 py-3">
				<ScopeChip wing={{ id: wing, name: wingName }} room={{ id: room, name: roomName }} />
			</header>
			<div className="min-h-0 flex-1">
				<VirtualizedDrawerList
					drawers={drawers}
					isLoading={query.isLoading}
					isError={query.isError}
					errorMessage={errorMessage}
					hasNextPage={Boolean(query.hasNextPage)}
					isFetchingNextPage={query.isFetchingNextPage}
					onLoadMore={handleLoadMore}
					emptyTitle="No drawers in this room"
					emptyDescription="Try a different room or mine more memories."
				/>
			</div>
		</div>
	);
};

export const Route = createFileRoute("/browse/$wing/$room")({
	component: RoomPage,
	beforeLoad: ({ params }) => {
		if (!params.wing) throw redirect({ to: "/browse" });
		if (!params.room) throw redirect({ to: "/browse/$wing", params: { wing: params.wing } });
	},
});
