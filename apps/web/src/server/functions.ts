import { createServerFn } from "@tanstack/react-start";
import { getConnection } from "./connection";
import {
	findTunnelsHandler,
	getDrawerEmbeddingSummaryHandler,
	getDrawerHandler,
	getRoomTreeHandler,
	getStatusHandler,
	listDrawerSummariesByRoomHandler,
	listDrawerSummariesByWingHandler,
	listDrawersByRoomHandler,
	listGraphNodesHandler,
	listRoomsHandler,
	listWingsHandler,
	reconnectMcpHandler,
	searchSemanticHandler,
} from "./handlers";
import {
	validateFindTunnels,
	validateGetDrawer,
	validateGetDrawerEmbeddingSummary,
	validateListDrawerSummariesByRoom,
	validateListDrawerSummariesByWing,
	validateListDrawersByRoom,
	validateListGraphNodes,
	validateListRooms,
	validateSearchSemantic,
} from "./validators";
import { getLastChangeAt } from "./watch";

export const getStatus = createServerFn({ method: "GET" }).handler(async () => {
	const conn = await getConnection();
	return getStatusHandler(conn);
});

export const listWings = createServerFn({ method: "GET" }).handler(async () => {
	const conn = await getConnection();
	return listWingsHandler(conn);
});

export const listRooms = createServerFn({ method: "GET" })
	.inputValidator(validateListRooms)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return listRoomsHandler(conn, data);
	});

export const listDrawersByRoom = createServerFn({ method: "GET" })
	.inputValidator(validateListDrawersByRoom)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return listDrawersByRoomHandler(conn, data);
	});

export const listDrawerSummariesByRoom = createServerFn({ method: "GET" })
	.inputValidator(validateListDrawerSummariesByRoom)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return listDrawerSummariesByRoomHandler(conn, data);
	});

export const listDrawerSummariesByWing = createServerFn({ method: "GET" })
	.inputValidator(validateListDrawerSummariesByWing)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return listDrawerSummariesByWingHandler(conn, data);
	});

export const getRoomTree = createServerFn({ method: "GET" }).handler(async () => {
	const conn = await getConnection();
	return getRoomTreeHandler(conn);
});

export const getDrawer = createServerFn({ method: "GET" })
	.inputValidator(validateGetDrawer)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return getDrawerHandler(conn, data);
	});

export const getDrawerEmbeddingSummary = createServerFn({ method: "GET" })
	.inputValidator(validateGetDrawerEmbeddingSummary)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return getDrawerEmbeddingSummaryHandler(conn, data);
	});

export const searchSemantic = createServerFn({ method: "POST" })
	.inputValidator(validateSearchSemantic)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return searchSemanticHandler(conn, data);
	});

export const listGraphNodes = createServerFn({ method: "GET" })
	.inputValidator(validateListGraphNodes)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return listGraphNodesHandler(conn, data);
	});

export const findTunnels = createServerFn({ method: "GET" })
	.inputValidator(validateFindTunnels)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return findTunnelsHandler(conn, data);
	});

export const getPalaceChangeStamp = createServerFn({ method: "GET" }).handler(async () => {
	// Touch the connection so the watcher is started even if getStatus hasn't been called yet.
	await getConnection();
	return { changedAt: getLastChangeAt() };
});

export const reconnectMcp = createServerFn({ method: "POST" }).handler(async () => {
	const conn = await getConnection();
	await reconnectMcpHandler(conn);
	return { ok: true } as const;
});
