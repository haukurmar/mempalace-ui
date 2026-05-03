import type { Drawer, DrawerSummary } from "@memui/palace-types/drawer";
import type { Room } from "@memui/palace-types/room";
import type { Wing } from "@memui/palace-types/wing";
import type { Logger } from "../logger";
import { createSqliteConnection } from "./connection";
import {
	getDrawer,
	listDrawersByRoom,
	type ListDrawerSummariesByRoomOpts,
	listDrawerSummariesByRoom,
	type ListDrawersByRoomOpts,
} from "./drawers";
import { type EmbeddingSummaryResult, getDrawerEmbeddingSummary } from "./embeddings";
import { getStatus, type SqliteStatus } from "./status";
import { listRooms, type ListRoomsOpts, listWings } from "./wings";

export type SqliteClient = {
	getStatus: () => Promise<SqliteStatus>;
	getDrawer: (id: string) => Promise<Drawer | null>;
	listDrawersByRoom: (opts: ListDrawersByRoomOpts) => Promise<Drawer[]>;
	listDrawerSummariesByRoom: (opts: ListDrawerSummariesByRoomOpts) => Promise<DrawerSummary[]>;
	listWings: () => Promise<Wing[]>;
	listRooms: (opts?: ListRoomsOpts) => Promise<Room[]>;
	getDrawerEmbeddingSummary: (id: string) => Promise<EmbeddingSummaryResult>;
	dispose: () => void;
};

export type CreateSqliteClientOpts = {
	palacePath: string;
	logger?: Logger;
};

export const createSqliteClient = (opts: CreateSqliteClientOpts): SqliteClient => {
	const conn = createSqliteConnection(opts.palacePath);
	const logger = opts.logger;
	return {
		getStatus: () => getStatus(conn),
		getDrawer: (id) => getDrawer(conn, id, logger),
		listDrawersByRoom: (o) => listDrawersByRoom(conn, o, logger),
		listDrawerSummariesByRoom: (o) => listDrawerSummariesByRoom(conn, o),
		listWings: () => listWings(conn),
		listRooms: (o) => listRooms(conn, o),
		getDrawerEmbeddingSummary: (id) => getDrawerEmbeddingSummary(conn, id),
		dispose: conn.dispose,
	};
};

export { IncompatiblePalaceError } from "./connection";
export type { IncompatiblePalaceInfo } from "./connection";
export type { ListDrawerSummariesByRoomOpts, ListDrawersByRoomOpts } from "./drawers";
export type { EmbeddingSummaryResult } from "./embeddings";
export type { SqliteStatus } from "./status";
export type { ListRoomsOpts } from "./wings";
