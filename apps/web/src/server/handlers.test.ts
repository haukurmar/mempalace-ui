import type { Connection, EmbeddingSummaryResult } from "@memui/palace-clients";
import type { Drawer, DrawerSummary } from "@memui/palace-types/drawer";
import type { Room } from "@memui/palace-types/room";
import type { SearchResponse } from "@memui/palace-types/search";
import type { Tunnel } from "@memui/palace-types/tunnel";
import type { Wing } from "@memui/palace-types/wing";
import { describe, expect, it, vi } from "vitest";
import { IncompatibleMcpVersionError, McpUnavailableError, PalaceUnavailableError } from "./errors";
import {
	findTunnelsHandler,
	getDrawerEmbeddingSummaryHandler,
	getDrawerHandler,
	getRoomTreeHandler,
	getStatusHandler,
	listDrawerSummariesByRoomHandler,
	listDrawerSummariesByWingHandler,
	listDrawersByRoomHandler,
	listRoomsHandler,
	listWingsHandler,
	reconnectMcpHandler,
	searchSemanticHandler,
} from "./handlers";

type MockOpts = {
	sqliteOk?: boolean;
	sqliteError?: Error;
	mcpStatus?: Connection["status"]["mcp"];
	wings?: Wing[];
	rooms?: Room[];
	roomsByWing?: Record<string, Room[]>;
	drawers?: Drawer[];
	drawerById?: Drawer | null;
	summariesByRoom?: DrawerSummary[];
	summariesByWing?: DrawerSummary[];
	search?: SearchResponse;
	tunnels?: Tunnel[];
	embeddingSummary?: EmbeddingSummaryResult;
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
			listDrawerSummariesByRoom: vi.fn(async () => opts.summariesByRoom ?? []),
			listDrawerSummariesByWing: vi.fn(async () => opts.summariesByWing ?? []),
			listWings: vi.fn(async () => opts.wings ?? []),
			listRooms: vi.fn(async (o?: { wingId?: string }) => {
				if (opts.roomsByWing && o?.wingId) return opts.roomsByWing[o.wingId] ?? [];
				return opts.rooms ?? [];
			}),
			getDrawerEmbeddingSummary: vi.fn(
				async (): Promise<EmbeddingSummaryResult> => opts.embeddingSummary ?? { available: false },
			),
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

describe("getDrawerEmbeddingSummaryHandler", () => {
	it("returns the summary stats when the queue has the vector", async () => {
		const preview = Array.from({ length: 16 }, (_, i) => i * 0.1);
		const summary: EmbeddingSummaryResult = {
			dimensions: 768,
			norm: 12.34,
			min: -0.5,
			max: 0.5,
			preview,
		};
		const conn = makeConnection({ embeddingSummary: summary });
		const result = await getDrawerEmbeddingSummaryHandler(conn, { id: "abc" });
		expect(result).toEqual(summary);
		expect(result).toHaveProperty("preview");
		if ("preview" in result) {
			expect(result.preview).toHaveLength(16);
			expect(result.preview).toEqual(preview);
		}
		expect(conn.sqlite.getDrawerEmbeddingSummary).toHaveBeenCalledWith("abc");
	});

	it("forwards the compacted-queue { available: false } shape", async () => {
		const conn = makeConnection({ embeddingSummary: { available: false } });
		const result = await getDrawerEmbeddingSummaryHandler(conn, { id: "abc" });
		expect(result).toEqual({ available: false });
	});

	it("throws PalaceUnavailableError when sqlite is errored", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(getDrawerEmbeddingSummaryHandler(conn, { id: "abc" })).rejects.toBeInstanceOf(
			PalaceUnavailableError,
		);
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

describe("listDrawerSummariesByRoomHandler", () => {
	it("forwards args to the sqlite client", async () => {
		const conn = makeConnection({ summariesByRoom: [] });
		await listDrawerSummariesByRoomHandler(conn, {
			wingId: "code",
			roomId: "general",
			limit: 50,
			offset: 0,
		});
		expect(conn.sqlite.listDrawerSummariesByRoom).toHaveBeenCalledWith({
			wingId: "code",
			roomId: "general",
			limit: 50,
			offset: 0,
		});
	});

	it("throws PalaceUnavailableError when sqlite is errored", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(listDrawerSummariesByRoomHandler(conn, { wingId: "code" })).rejects.toBeInstanceOf(
			PalaceUnavailableError,
		);
	});
});

describe("listDrawerSummariesByWingHandler", () => {
	it("forwards args to the sqlite client", async () => {
		const conn = makeConnection({ summariesByWing: [] });
		await listDrawerSummariesByWingHandler(conn, { wingId: "code", limit: 100, offset: 200 });
		expect(conn.sqlite.listDrawerSummariesByWing).toHaveBeenCalledWith({
			wingId: "code",
			limit: 100,
			offset: 200,
		});
	});

	it("throws PalaceUnavailableError when sqlite is errored", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(listDrawerSummariesByWingHandler(conn, { wingId: "code" })).rejects.toBeInstanceOf(
			PalaceUnavailableError,
		);
	});
});

describe("reconnectMcpHandler", () => {
	it("delegates to conn.mcp.reconnect()", async () => {
		const conn = makeConnection();
		await reconnectMcpHandler(conn);
		expect(conn.mcp.reconnect).toHaveBeenCalledTimes(1);
	});

	it("invokes reconnect even when MCP is currently unavailable", async () => {
		const conn = makeConnection({ mcpStatus: { status: "unavailable", reason: "spawn ENOENT" } });
		await reconnectMcpHandler(conn);
		expect(conn.mcp.reconnect).toHaveBeenCalledTimes(1);
	});

	it("propagates errors from the underlying client", async () => {
		const conn = makeConnection();
		(conn.mcp.reconnect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
		await expect(reconnectMcpHandler(conn)).rejects.toThrow("boom");
	});
});

describe("getRoomTreeHandler", () => {
	it("composes wings and rooms into a nested structure", async () => {
		const wings: Wing[] = [
			{ id: "code", name: "code", drawerCount: 12 },
			{ id: "docs", name: "docs", drawerCount: 4 },
		];
		const roomsByWing: Record<string, Room[]> = {
			code: [
				{ id: "code/general", name: "general", wingId: "code", drawerCount: 8 },
				{ id: "code/decision", name: "decision", wingId: "code", drawerCount: 4 },
			],
			docs: [{ id: "docs/general", name: "general", wingId: "docs", drawerCount: 4 }],
		};
		const conn = makeConnection({ wings, roomsByWing });
		const tree = await getRoomTreeHandler(conn);
		expect(tree.wings).toHaveLength(2);
		expect(tree.wings[0]).toEqual({
			id: "code",
			name: "code",
			drawerCount: 12,
			rooms: [
				{ id: "code/general", name: "general", drawerCount: 8 },
				{ id: "code/decision", name: "decision", drawerCount: 4 },
			],
		});
		expect(tree.wings[1].rooms).toHaveLength(1);
	});

	it("throws PalaceUnavailableError when sqlite is errored", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(getRoomTreeHandler(conn)).rejects.toBeInstanceOf(PalaceUnavailableError);
	});
});
