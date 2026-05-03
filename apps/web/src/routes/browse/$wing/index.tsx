import { ScopeChip } from "@memui/ui/components";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FC, useCallback, useMemo } from "react";
import { getRoomTree, listDrawerSummariesByWing } from "../../../server/functions";
import { ROOM_TREE_QUERY_KEY } from "../-components/use-room-tree";
import { VirtualizedDrawerList } from "../-components/virtualized-drawer-list";

const PAGE_SIZE = 100;

const WingPage: FC = () => {
	const { wing } = Route.useParams();

	const treeQuery = useQuery({
		queryKey: ROOM_TREE_QUERY_KEY,
		queryFn: () => getRoomTree(),
	});
	const wingNode = treeQuery.data?.wings.find((w) => w.id === wing);
	const wingName = wingNode?.name ?? wing;

	const query = useInfiniteQuery({
		queryKey: ["palace", "drawers", "wing", wing],
		queryFn: ({ pageParam }) =>
			listDrawerSummariesByWing({
				data: { wingId: wing, limit: PAGE_SIZE, offset: pageParam },
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
				<ScopeChip wing={{ id: wing, name: wingName }} />
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
					emptyTitle="No drawers in this wing yet"
					emptyDescription="Mine some memories with `mempalace mine` to fill it up."
				/>
			</div>
		</div>
	);
};

export const Route = createFileRoute("/browse/$wing/")({
	component: WingPage,
	beforeLoad: ({ params }) => {
		if (!params.wing) throw redirect({ to: "/browse" });
	},
});
