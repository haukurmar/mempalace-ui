import type { Connection } from "@memui/palace-clients";
import type { Drawer } from "@memui/palace-types/drawer";
import type { Room } from "@memui/palace-types/room";
import type { SearchResponse } from "@memui/palace-types/search";
import type { Tunnel } from "@memui/palace-types/tunnel";
import type { Wing } from "@memui/palace-types/wing";
import { describe, expect, it, vi } from "vitest";
import { IncompatibleMcpVersionError, McpUnavailableError, PalaceUnavailableError } from "./errors";
import {
	findTunnelsHandler,
	getDrawerHandler,
	getStatusHandler,
	listDrawersByRoomHandler,
	listRoomsHandler,
	listWingsHandler,
	searchSemanticHandler,
} from "./handlers";

type MockOpts = {
	sqliteOk?: boolean;
	sqliteError?: Error;
	mcpStatus?: Connection["status"]["mcp"];
	wings?: Wing[];
	rooms?: Room[];
	drawers?: Drawer[];
	drawerById?: Drawer | null;
	search?: SearchResponse;
	tunnels?: Tunnel[];
};

const makeConnection = (opts: MockOpts = {}): Connection => {
	const sqliteOk = opts.sqliteOk ?? true;
	const sqlite: Connection["status"]["sqlite"] = sqliteOk
		? { status: "ok" }
		: { status: "error", error: opts.sqliteError ?? new Error("no palace") };
	const mcp: Connection["status"]["mcp"] = opts.mcpStatus ?? { status: "ok", version: "3.3.4" };

	return {
		sqlite: {
			getStatus: vi.fn(),
			getDrawer: vi.fn(async (_id: string) => opts.drawerById ?? null),
			listDrawersByRoom: vi.fn(async () => opts.drawers ?? []),
			listDrawerSummariesByRoom: vi.fn(async () => []),
			listWings: vi.fn(async () => opts.wings ?? []),
			listRooms: vi.fn(async () => opts.rooms ?? []),
			getDrawerEmbeddingSummary: vi.fn(),
			dispose: vi.fn(),
		},
		mcp: {
			getServerInfo: vi.fn(),
			getStatus: vi.fn(),
			getDrawer: vi.fn(),
			listWings: vi.fn(),
			listRooms: vi.fn(),
			searchSemantic: vi.fn(
				async () =>
					opts.search ?? {
						query: "",
						filters: {},
						totalBeforeFilter: 0,
						results: [],
					},
			),
			findTunnels: vi.fn(async () => opts.tunnels ?? []),
			reconnect: vi.fn(),
			dispose: vi.fn(),
		},
		status: {
			palacePath: "/tmp/test-palace",
			sqlite,
			mcp,
			totalDrawers: 7,
			schemaVersion: 10,
		},
		dispose: vi.fn(),
	};
};

describe("getStatusHandler", () => {
	it("returns the connection status payload", () => {
		const conn = makeConnection();
		const result = getStatusHandler(conn);
		expect(result.palacePath).toBe("/tmp/test-palace");
		expect(result.totalDrawers).toBe(7);
		expect(result.schemaVersion).toBe(10);
		expect(result.sqlite.status).toBe("ok");
		expect(result.mcp.status).toBe("ok");
	});

	it("surfaces sqlite errors via the status payload (no throw)", () => {
		const conn = makeConnection({ sqliteOk: false, sqliteError: new Error("boom") });
		const result = getStatusHandler(conn);
		expect(result.sqlite.status).toBe("error");
	});

	it("projects sqlite Error to a plain { status, message } shape", () => {
		const err = new Error("disk full");
		(err as Error & { cause?: unknown }).cause = new Error("inner cause");
		const conn = makeConnection({ sqliteOk: false, sqliteError: err });
		const result = getStatusHandler(conn);
		expect(result.sqlite).toEqual({ status: "error", message: "disk full" });
		expect("error" in result.sqlite).toBe(false);
		expect("cause" in result.sqlite).toBe(false);
	});
});

describe("listWingsHandler", () => {
	it("returns wings from the sqlite client", async () => {
		const wings: Wing[] = [{ id: "code", name: "code", drawerCount: 12 }];
		const conn = makeConnection({ wings });
		const result = await listWingsHandler(conn);
		expect(result).toEqual(wings);
	});

	it("throws PalaceUnavailableError when sqlite is errored", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(listWingsHandler(conn)).rejects.toBeInstanceOf(PalaceUnavailableError);
	});
});

describe("listRoomsHandler", () => {
	it("forwards the wing filter", async () => {
		const conn = makeConnection({ rooms: [] });
		await listRoomsHandler(conn, { wingId: "code" });
		expect(conn.sqlite.listRooms).toHaveBeenCalledWith({ wingId: "code" });
	});
});

describe("listDrawersByRoomHandler", () => {
	it("passes pagination through to the sqlite client", async () => {
		const conn = makeConnection({ drawers: [] });
		await listDrawersByRoomHandler(conn, {
			wingId: "code",
			roomId: "general",
			limit: 10,
			offset: 20,
		});
		expect(conn.sqlite.listDrawersByRoom).toHaveBeenCalledWith({
			wingId: "code",
			roomId: "general",
			limit: 10,
			offset: 20,
		});
	});
});

describe("getDrawerHandler", () => {
	it("returns null for missing drawers", async () => {
		const conn = makeConnection({ drawerById: null });
		const result = await getDrawerHandler(conn, { id: "missing" });
		expect(result).toBeNull();
	});
});

describe("searchSemanticHandler", () => {
	it("forwards search args to mcp client", async () => {
		const response: SearchResponse = {
			query: "hello",
			filters: { wing: "code" },
			totalBeforeFilter: 1,
			results: [],
		};
		const conn = makeConnection({ search: response });
		const result = await searchSemanticHandler(conn, { query: "hello", limit: 5, wing: "code" });
		expect(result).toEqual(response);
		expect(conn.mcp.searchSemantic).toHaveBeenCalledWith({
			query: "hello",
			limit: 5,
			wing: "code",
		});
	});

	it("throws McpUnavailableError when MCP is offline", async () => {
		const conn = makeConnection({ mcpStatus: { status: "unavailable", reason: "spawn ENOENT" } });
		await expect(searchSemanticHandler(conn, { query: "x" })).rejects.toBeInstanceOf(
			McpUnavailableError,
		);
	});

	it("throws IncompatibleMcpVersionError on incompatible MCP", async () => {
		const conn = makeConnection({
			mcpStatus: { status: "incompatible", detectedVersion: "3.2.0" },
		});
		await expect(searchSemanticHandler(conn, { query: "x" })).rejects.toBeInstanceOf(
			IncompatibleMcpVersionError,
		);
	});
});

describe("findTunnelsHandler", () => {
	it("forwards optional wing filters", async () => {
		const conn = makeConnection({ tunnels: [] });
		await findTunnelsHandler(conn, { wingA: "code" });
		expect(conn.mcp.findTunnels).toHaveBeenCalledWith({ wingA: "code" });
	});
});
