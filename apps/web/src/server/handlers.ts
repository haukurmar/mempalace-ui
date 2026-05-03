import { type Connection, IncompatiblePalaceError } from "@memui/palace-clients";
import type { Drawer } from "@memui/palace-types/drawer";
import type { Room } from "@memui/palace-types/room";
import type { SearchResponse } from "@memui/palace-types/search";
import type { Tunnel } from "@memui/palace-types/tunnel";
import type { Wing } from "@memui/palace-types/wing";
import { assertMcpReady, assertSqliteReady } from "./errors";

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

export type GetDrawerInput = { id: string };

export const getDrawerHandler = async (
	conn: Connection,
	input: GetDrawerInput,
): Promise<Drawer | null> => {
	assertSqliteReady(conn);
	return conn.sqlite.getDrawer(input.id);
};

export type SearchSemanticInput = {
	query: string;
	limit?: number;
	wing?: string;
	room?: string;
	maxDistance?: number;
};

export const searchSemanticHandler = async (
	conn: Connection,
	input: SearchSemanticInput,
): Promise<SearchResponse> => {
	assertMcpReady(conn);
	return conn.mcp.searchSemantic(input);
};

export type FindTunnelsInput = { wingA?: string; wingB?: string };

export const findTunnelsHandler = async (
	conn: Connection,
	input: FindTunnelsInput,
): Promise<Tunnel[]> => {
	assertMcpReady(conn);
	return conn.mcp.findTunnels(input);
};
