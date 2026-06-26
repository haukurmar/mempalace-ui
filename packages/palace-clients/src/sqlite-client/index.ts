import type { Drawer, DrawerSummary } from "@memui/palace-types/drawer";
import type { MetadataRecord } from "@memui/palace-types/metadata";
import type { Room } from "@memui/palace-types/room";
import type { Wing } from "@memui/palace-types/wing";
import type { Logger } from "../logger";
import { createSqliteConnection } from "./connection";
import {
	type FindDrawerIdByLocatorOpts,
	findDrawerIdByLocator,
	getDrawer,
	type ListDrawerSummariesByRoomOpts,
	type ListDrawerSummariesByWingOpts,
	type ListDrawersByRoomOpts,
	listDrawerSummariesByRoom,
	listDrawerSummariesByWing,
	listDrawersByRoom,
} from "./drawers";
import { type EmbeddingSummaryResult, getDrawerEmbeddingSummary } from "./embeddings";
import { type GraphNodes, type ListGraphNodesOpts, listGraphNodes } from "./graph";
import { getDrawersMetadata } from "./metadata";
import { getStatus, type SqliteStatus } from "./status";
import { type ListRoomsOpts, listRooms, listWings } from "./wings";

export type SqliteClient = {
	getStatus: () => Promise<SqliteStatus>;
	getDrawer: (id: string) => Promise<Drawer | null>;
	listDrawersByRoom: (opts: ListDrawersByRoomOpts) => Promise<Drawer[]>;
	listDrawerSummariesByRoom: (opts: ListDrawerSummariesByRoomOpts) => Promise<DrawerSummary[]>;
	listDrawerSummariesByWing: (opts: ListDrawerSummariesByWingOpts) => Promise<DrawerSummary[]>;
	listWings: () => Promise<Wing[]>;
	listRooms: (opts?: ListRoomsOpts) => Promise<Room[]>;
	getDrawerEmbeddingSummary: (id: string) => Promise<EmbeddingSummaryResult>;
	findDrawerIdByLocator: (opts: FindDrawerIdByLocatorOpts) => Promise<string | null>;
	getDrawersMetadata: (embeddingIds: readonly string[]) => Promise<Map<string, MetadataRecord>>;
	listGraphNodes: (opts?: ListGraphNodesOpts) => Promise<GraphNodes>;
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
		listDrawerSummariesByWing: (o) => listDrawerSummariesByWing(conn, o),
		listWings: () => listWings(conn),
		listRooms: (o) => listRooms(conn, o),
		getDrawerEmbeddingSummary: (id) => getDrawerEmbeddingSummary(conn, id),
		findDrawerIdByLocator: (o) => findDrawerIdByLocator(conn, o),
		getDrawersMetadata: (ids) => getDrawersMetadata(conn, ids),
		listGraphNodes: (o) => listGraphNodes(conn, o),
		dispose: conn.dispose,
	};
};

export type { IncompatiblePalaceInfo } from "./connection";
export { IncompatiblePalaceError } from "./connection";
export type {
	FindDrawerIdByLocatorOpts,
	ListDrawerSummariesByRoomOpts,
	ListDrawerSummariesByWingOpts,
	ListDrawersByRoomOpts,
} from "./drawers";
export type { EmbeddingSummaryResult } from "./embeddings";
export type { GraphNodes, ListGraphNodesOpts } from "./graph";
export type { SqliteStatus } from "./status";
export type { ListRoomsOpts } from "./wings";
