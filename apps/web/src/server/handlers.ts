import {
	type Connection,
	type EmbeddingSummaryResult,
	IncompatiblePalaceError,
} from "@memui/palace-clients";
import type { Drawer, DrawerSummary } from "@memui/palace-types/drawer";
import type { Room } from "@memui/palace-types/room";
import type { SearchResponse } from "@memui/palace-types/search";
import type { Tunnel } from "@memui/palace-types/tunnel";
import type { WhereClause } from "@memui/palace-types/where";
import type { Wing } from "@memui/palace-types/wing";
import { assertMcpReady, assertSqliteReady, PalaceUnavailableError } from "./errors";

export type SqliteStatusPayload =
	| { status: "ok" }
	| { status: "error"; message: string; openErrorCode?: string };

export type McpStatusPayload =
	| { status: "ok"; version: string }
	| { status: "unavailable"; reason: string }
	| { status: "incompatible"; detectedVersion: string };

export type StatusPayload = {
	palacePath: string;
	sqlite: SqliteStatusPayload;
	mcp: McpStatusPayload;
	totalDrawers: number | undefined;
	schemaVersion: number | undefined;
};

const toSqlitePayload = (s: Connection["status"]["sqlite"]): SqliteStatusPayload => {
	if (s.status === "ok") return { status: "ok" };
	const out: { status: "error"; message: string; openErrorCode?: string } = {
		status: "error",
		message: s.error.message,
	};
	if (s.error instanceof IncompatiblePalaceError && s.error.info.openErrorCode !== undefined) {
		out.openErrorCode = s.error.info.openErrorCode;
	}
	return out;
};

export const getStatusHandler = (conn: Connection): StatusPayload => ({
	palacePath: conn.status.palacePath,
	sqlite: toSqlitePayload(conn.status.sqlite),
	mcp: conn.status.mcp,
	totalDrawers: conn.status.totalDrawers,
	schemaVersion: conn.status.schemaVersion,
});

export const listWingsHandler = async (conn: Connection): Promise<Wing[]> => {
	assertSqliteReady(conn);
	return conn.sqlite.listWings();
};

export type ListRoomsInput = { wingId?: string };

export const listRoomsHandler = async (
	conn: Connection,
	input: ListRoomsInput,
): Promise<Room[]> => {
	assertSqliteReady(conn);
	return conn.sqlite.listRooms({ wingId: input.wingId });
};

export type ListDrawersByRoomInput = {
	wingId: string;
	roomId?: string;
	limit?: number;
	offset?: number;
};

export const listDrawersByRoomHandler = async (
	conn: Connection,
	input: ListDrawersByRoomInput,
): Promise<Drawer[]> => {
	assertSqliteReady(conn);
	return conn.sqlite.listDrawersByRoom(input);
};

export type ListDrawerSummariesByRoomInput = {
	wingId: string;
	roomId?: string;
	limit?: number;
	offset?: number;
};

export const listDrawerSummariesByRoomHandler = async (
	conn: Connection,
	input: ListDrawerSummariesByRoomInput,
): Promise<DrawerSummary[]> => {
	assertSqliteReady(conn);
	return conn.sqlite.listDrawerSummariesByRoom(input);
};

export type ListDrawerSummariesByWingInput = {
	wingId: string;
	limit?: number;
	offset?: number;
};

export const listDrawerSummariesByWingHandler = async (
	conn: Connection,
	input: ListDrawerSummariesByWingInput,
): Promise<DrawerSummary[]> => {
	assertSqliteReady(conn);
	return conn.sqlite.listDrawerSummariesByWing(input);
};

export type RoomTreeRoom = {
	readonly id: string;
	readonly name: string;
	readonly drawerCount: number;
};

export type RoomTreeWing = {
	readonly id: string;
	readonly name: string;
	readonly drawerCount: number;
	readonly rooms: ReadonlyArray<RoomTreeRoom>;
};

export type RoomTreeData = {
	readonly wings: ReadonlyArray<RoomTreeWing>;
};

export const getRoomTreeHandler = async (conn: Connection): Promise<RoomTreeData> => {
	assertSqliteReady(conn);
	const wings = await conn.sqlite.listWings();
	const wingsWithRooms: RoomTreeWing[] = [];
	for (const wing of wings) {
		const rooms = await conn.sqlite.listRooms({ wingId: wing.id });
		wingsWithRooms.push({
			id: wing.id,
			name: wing.name,
			drawerCount: wing.drawerCount,
			rooms: rooms.map((r) => ({ id: r.id, name: r.name, drawerCount: r.drawerCount })),
		});
	}
	return { wings: wingsWithRooms };
};

export type GetDrawerInput = { id: string };

export const getDrawerHandler = async (
	conn: Connection,
	input: GetDrawerInput,
): Promise<Drawer | null> => {
	assertSqliteReady(conn);
	return conn.sqlite.getDrawer(input.id);
};

export type GetDrawerEmbeddingSummaryInput = { id: string };

export const getDrawerEmbeddingSummaryHandler = async (
	conn: Connection,
	input: GetDrawerEmbeddingSummaryInput,
): Promise<EmbeddingSummaryResult> => {
	assertSqliteReady(conn);
	return conn.sqlite.getDrawerEmbeddingSummary(input.id);
};

export type SearchSemanticInput = {
	query: string;
	limit?: number;
	wing?: string;
	room?: string;
	maxDistance?: number;
	where?: WhereClause;
	overfetchFactor?: number;
};

export const searchSemanticHandler = async (
	conn: Connection,
	input: SearchSemanticInput,
): Promise<SearchResponse> => {
	assertMcpReady(conn);
	// `mempalace_search` does not return drawer ids — recover them from
	// SQLite via (wing, room, source_file). Skip when SQLite is offline:
	// the search result still renders, click-through stays disabled.
	const sqliteOk = conn.status.sqlite.status === "ok";

	// Fail-closed: the user supplied a filter but SQLite is offline so we cannot
	// evaluate it. Returning unfiltered results would silently lie. Surface the
	// degraded state via the standard error-projection envelope so the UI can
	// render an explicit "filters unavailable" message.
	if (input.where !== undefined && !sqliteOk) {
		throw new PalaceUnavailableError(
			"Metadata filters require the local palace SQLite, which is offline.",
			"filters_unavailable",
		);
	}

	const resolveDrawerId = sqliteOk
		? async (locator: { wingId: string; roomId: string; sourceFile: string }) =>
				conn.sqlite.findDrawerIdByLocator(locator)
		: undefined;
	const filterByMetadata = sqliteOk
		? (ids: readonly string[]) => conn.sqlite.getDrawersMetadata(ids)
		: undefined;

	const opts = {
		...input,
		...(resolveDrawerId !== undefined ? { resolveDrawerId } : {}),
		...(filterByMetadata !== undefined ? { filterByMetadata } : {}),
	};
	return conn.mcp.searchSemantic(opts);
};

export type FindTunnelsInput = { wingA?: string; wingB?: string };

export const findTunnelsHandler = async (
	conn: Connection,
	input: FindTunnelsInput,
): Promise<Tunnel[]> => {
	assertMcpReady(conn);
	return conn.mcp.findTunnels(input);
};

/**
 * Re-probe `mempalace-mcp`. Intentionally does NOT call `assertMcpReady` —
 * "unavailable" is the most useful precondition for asking the transport
 * to try again. The underlying client triggers `ensure()` → `boot()`,
 * which respawns the child process if the bounded reconnect window
 * allows it. Surfaces transport errors (`McpUnavailableError`,
 * `IncompatibleMcpError`) to the caller.
 */
export const reconnectMcpHandler = async (conn: Connection): Promise<void> => {
	await conn.mcp.reconnect();
};
