import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getPalaceChangeStamp, getRoomTree } from "../../../server/functions";

const POLL_INTERVAL_MS = 5_000;

export const ROOM_TREE_QUERY_KEY = ["palace", "tree"] as const;

export const useRoomTree = () => {
	const queryClient = useQueryClient();

	const treeQuery = useQuery({
		queryKey: ROOM_TREE_QUERY_KEY,
		queryFn: () => getRoomTree(),
	});

	const stampQuery = useQuery({
		queryKey: ["palace", "changeStamp"],
		queryFn: () => getPalaceChangeStamp(),
		refetchInterval: POLL_INTERVAL_MS,
	});

	const lastSeenStamp = useRef<number | null>(null);

	useEffect(() => {
		const stamp = stampQuery.data?.changedAt;
		if (stamp === undefined) return;
		if (lastSeenStamp.current !== null && stamp > lastSeenStamp.current) {
			// Invalidate the entire ["palace", *] namespace — any palace write may affect tree, drawer lists, and future derivations.
			queryClient.invalidateQueries({ queryKey: ["palace"] });
		}
		lastSeenStamp.current = stamp;
	}, [stampQuery.data, queryClient]);

	return treeQuery;
};
