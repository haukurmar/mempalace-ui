import { createServerFn } from "@tanstack/react-start";
import { getConnection } from "./connection";
import {
	findTunnelsHandler,
	getDrawerHandler,
	getStatusHandler,
	listDrawersByRoomHandler,
	listRoomsHandler,
	listWingsHandler,
	searchSemanticHandler,
} from "./handlers";
import { getLastChangeAt } from "./watch";
import {
	validateFindTunnels,
	validateGetDrawer,
	validateListDrawersByRoom,
	validateListRooms,
	validateSearchSemantic,
} from "./validators";

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

export const getDrawer = createServerFn({ method: "GET" })
	.inputValidator(validateGetDrawer)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return getDrawerHandler(conn, data);
	});

export const searchSemantic = createServerFn({ method: "POST" })
	.inputValidator(validateSearchSemantic)
	.handler(async ({ data }) => {
		const conn = await getConnection();
		return searchSemanticHandler(conn, data);
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
