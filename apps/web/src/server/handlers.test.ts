import type { Connection, EmbeddingSummaryResult, GraphNodes } from "@memui/palace-clients";
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
	listGraphNodesHandler,
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
	graphNodes?: GraphNodes;
};

const emptyGraphNodes = (): GraphNodes => ({
	ids: [],
	wing: [],
	room: [],
	createdAt: [],
	size: [],
	clusterId: [],
	count: 0,
});

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
			findDrawerIdByLocator: vi.fn(async () => null),
			getDrawersMetadata: vi.fn(async () => new Map()),
			listGraphNodes: vi.fn(async () => opts.graphNodes ?? emptyGraphNodes()),
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
						totalAfterFilter: 0,
						candidatesScanned: 0,
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
	it("forwards search args to mcp client and supplies a resolver when sqlite is ready", async () => {
		const response: SearchResponse = {
			query: "hello",
			filters: { wing: "code" },
			totalBeforeFilter: 1,
			totalAfterFilter: 1,
			candidatesScanned: 1,
			results: [],
		};
		const conn = makeConnection({ search: response });
		const result = await searchSemanticHandler(conn, { query: "hello", limit: 5, wing: "code" });
		expect(result).toEqual(response);
		expect(conn.mcp.searchSemantic).toHaveBeenCalledTimes(1);
		const call = (conn.mcp.searchSemantic as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
			query: string;
			limit?: number;
			wing?: string;
			resolveDrawerId?: unknown;
			filterByMetadata?: unknown;
		};
		expect(call.query).toBe("hello");
		expect(call.limit).toBe(5);
		expect(call.wing).toBe("code");
		expect(typeof call.resolveDrawerId).toBe("function");
		expect(typeof call.filterByMetadata).toBe("function");
	});

	it("forwards locator lookups to sqlite when the resolver fires", async () => {
		const response: SearchResponse = {
			query: "hello",
			filters: {},
			totalBeforeFilter: 0,
			totalAfterFilter: 0,
			candidatesScanned: 0,
			results: [],
		};
		const conn = makeConnection({ search: response });
		// Capture the resolver passed to the MCP client and exercise it
		// directly — proves the handler bridges the SQL helper into the
		// search code path without coupling to mempalace_search internals.
		(conn.mcp.searchSemantic as ReturnType<typeof vi.fn>).mockImplementationOnce(async (opts) => {
			const resolver = (opts as { resolveDrawerId?: unknown }).resolveDrawerId as
				| ((l: { wingId: string; roomId: string; sourceFile: string }) => Promise<string | null>)
				| undefined;
			if (resolver) {
				await resolver({ wingId: "code", roomId: "general", sourceFile: "/tmp/foo.md" });
			}
			return response;
		});
		(conn.sqlite.findDrawerIdByLocator as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			"drawer_code_general_abc",
		);
		await searchSemanticHandler(conn, { query: "hello" });
		expect(conn.sqlite.findDrawerIdByLocator).toHaveBeenCalledWith({
			wingId: "code",
			roomId: "general",
			sourceFile: "/tmp/foo.md",
		});
	});

	it("omits the resolver when sqlite is offline", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await searchSemanticHandler(conn, { query: "hello" });
		const call = (conn.mcp.searchSemantic as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
			resolveDrawerId?: unknown;
		};
		expect(call.resolveDrawerId).toBeUndefined();
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

	it("forwards a filterByMetadata hook that delegates to getDrawersMetadata", async () => {
		const conn = makeConnection();
		(conn.mcp.searchSemantic as ReturnType<typeof vi.fn>).mockImplementationOnce(async (opts) => {
			const filterByMetadata = (opts as { filterByMetadata?: unknown }).filterByMetadata as
				| ((ids: readonly string[]) => Promise<Map<string, unknown>>)
				| undefined;
			if (filterByMetadata) await filterByMetadata(["drawer_a"]);
			return {
				query: "hello",
				filters: {},
				totalBeforeFilter: 0,
				totalAfterFilter: 0,
				candidatesScanned: 0,
				results: [],
			} as SearchResponse;
		});
		await searchSemanticHandler(conn, {
			query: "hello",
			where: { wing: { $eq: "code" } },
		});
		expect(conn.sqlite.getDrawersMetadata).toHaveBeenCalledWith(["drawer_a"]);
	});

	it("fails closed (PalaceUnavailableError) when SQLite is offline and a where clause is provided", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(
			searchSemanticHandler(conn, {
				query: "hello",
				where: { wing: { $eq: "code" } },
			}),
		).rejects.toBeInstanceOf(PalaceUnavailableError);
	});

	it("tags the fail-closed error with code='filters_unavailable' for UI dispatch", async () => {
		const conn = makeConnection({ sqliteOk: false });
		try {
			await searchSemanticHandler(conn, {
				query: "hello",
				where: { wing: { $eq: "code" } },
			});
			expect.fail("expected PalaceUnavailableError");
		} catch (error) {
			expect(error).toBeInstanceOf(PalaceUnavailableError);
			expect((error as PalaceUnavailableError).code).toBe("filters_unavailable");
			// Round-trip the error through the same JSON shape TanStack Start
			// uses for server-fn responses to confirm the discriminator
			// survives the strict serializer.
			const serialized = JSON.parse(
				JSON.stringify({
					name: (error as Error).name,
					message: (error as Error).message,
					code: (error as PalaceUnavailableError).code,
				}),
			) as { name: string; message: string; code?: string };
			expect(serialized.name).toBe("PalaceUnavailableError");
			expect(serialized.code).toBe("filters_unavailable");
		}
	});

	it("does not pass filterByMetadata when SQLite is offline and no filter is set", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await searchSemanticHandler(conn, { query: "hello" });
		const call = (conn.mcp.searchSemantic as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
			filterByMetadata?: unknown;
		};
		expect(call.filterByMetadata).toBeUndefined();
	});
});

describe("listGraphNodesHandler", () => {
	it("returns the columnar graph-node payload from the sqlite client", async () => {
		const graphNodes: GraphNodes = {
			ids: ["drawer_a", "drawer_b"],
			wing: ["code", "docs"],
			room: ["general", "api"],
			createdAt: [1_700_000_000_000, 1_700_000_100_000],
			size: [120, 340],
			clusterId: [null, null],
			count: 2,
		};
		const conn = makeConnection({ graphNodes });
		const result = await listGraphNodesHandler(conn, {});
		expect(result).toEqual(graphNodes);
		expect(result.ids).toHaveLength(result.count);
		expect(conn.sqlite.listGraphNodes).toHaveBeenCalledWith(undefined);
	});

	it("forwards the optional wing filter to the sqlite client", async () => {
		const conn = makeConnection();
		await listGraphNodesHandler(conn, { wing: "code" });
		expect(conn.sqlite.listGraphNodes).toHaveBeenCalledWith({ wing: "code" });
	});

	it("throws PalaceUnavailableError when sqlite is errored", async () => {
		const conn = makeConnection({ sqliteOk: false });
		await expect(listGraphNodesHandler(conn, {})).rejects.toBeInstanceOf(PalaceUnavailableError);
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
