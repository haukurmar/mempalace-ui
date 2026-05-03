import type { Drawer } from "@memui/palace-types/drawer";
import type { MetadataRecord, MetadataValue } from "@memui/palace-types/metadata";
import type { Provenance } from "@memui/palace-types/provenance";
import type { Room } from "@memui/palace-types/room";
import type { SearchResponse, SearchResult } from "@memui/palace-types/search";
import type { Tunnel } from "@memui/palace-types/tunnel";
import type { Wing } from "@memui/palace-types/wing";
import { coerceMiningMode } from "../sqlite-client/eav";
import { parseToolResult } from "./envelope";
import type { McpTransport } from "./transport";

export type SearchSemanticOpts = {
	query: string;
	limit?: number;
	wing?: string;
	room?: string;
	maxDistance?: number;
	/**
	 * Free-text hint about why the search is being performed. The live
	 * `mempalace_search` tool accepts this argument but does not yet use
	 * it for ranking — it is logged for future re-ranking experiments.
	 * Pass it through anyway; harmless if the server ignores it.
	 */
	context?: string;
};

export type FindTunnelsOpts = {
	wingA?: string;
	wingB?: string;
};

export type ListRoomsToolOpts = {
	wing?: string;
};

export type McpStatus = {
	status: string;
	palacePath?: string;
	totalDrawers?: number;
	wings?: number;
	rooms?: number;
	/**
	 * Escape hatch for debugging only — the typed fields above are the
	 * contract. Server-side `mempalace_status` payloads have grown new
	 * keys between versions, and this lets a UI dump the full envelope
	 * without a new package release. Do not key UI behavior off `_raw`.
	 */
	_raw: Record<string, MetadataValue>;
};

const callTool = async <T>(
	transport: McpTransport,
	name: string,
	args: Record<string, unknown>,
): Promise<T> => {
	const client = await transport.getClient();
	const raw = await client.callTool({ name, arguments: args });
	return parseToolResult<T>(raw);
};

type RawDrawer = {
	drawer_id?: string;
	id?: string;
	text?: string;
	content?: string;
	wing?: string;
	room?: string;
	source_file?: string;
	added_by?: string;
	filed_at?: string;
	created_at?: string;
	updated_at?: string;
	metadata?: Record<string, MetadataValue>;
};

const PROMOTED_KEYS = new Set([
	"wing",
	"room",
	"source_file",
	"added_by",
	"filed_at",
	"created_at",
	"updated_at",
	"text",
	"content",
	"drawer_id",
	"id",
]);

const stringFromMetadata = (
	metadata: Record<string, MetadataValue> | undefined,
	key: string,
): string | undefined => {
	if (!metadata) return undefined;
	const v = metadata[key];
	return typeof v === "string" ? v : undefined;
};

const drawerFromRaw = (raw: RawDrawer): Drawer => {
	// Some MCP tool responses flatten provenance/wing/room onto the
	// top-level object; others nest them under `metadata`. Read the
	// top level first, fall back through `metadata`, then strip the
	// promoted keys so they're not double-counted.
	const rawMetadata = raw.metadata;
	const wingId = raw.wing ?? stringFromMetadata(rawMetadata, "wing") ?? "";
	const roomId = raw.room ?? stringFromMetadata(rawMetadata, "room") ?? "";
	const sourcePath = raw.source_file ?? stringFromMetadata(rawMetadata, "source_file") ?? "";
	const addedBy = raw.added_by ?? stringFromMetadata(rawMetadata, "added_by");
	const filedAt = raw.filed_at ?? stringFromMetadata(rawMetadata, "filed_at");
	const createdAt =
		filedAt ?? raw.created_at ?? stringFromMetadata(rawMetadata, "created_at") ?? "";
	const updatedAt = raw.updated_at ?? stringFromMetadata(rawMetadata, "updated_at");

	const metadata: Record<string, MetadataValue> = {};
	if (rawMetadata) {
		for (const [k, v] of Object.entries(rawMetadata)) {
			if (PROMOTED_KEYS.has(k)) continue;
			metadata[k] = v;
		}
	}

	const provenance: Provenance = {
		createdAt,
		...(updatedAt !== undefined ? { updatedAt } : {}),
		sourcePath,
		miningMode: coerceMiningMode(addedBy),
	};
	return {
		id: raw.drawer_id ?? raw.id ?? "",
		content: raw.text ?? raw.content ?? "",
		wingId,
		roomId,
		metadata: metadata as MetadataRecord,
		provenance,
	};
};

type RawSearchResult = {
	drawer_id?: string;
	id?: string;
	text?: string;
	wing?: string;
	room?: string;
	source_file?: string;
	created_at?: string;
	updated_at?: string;
	similarity?: number;
	distance?: number;
	effective_distance?: number;
	closet_boost?: number;
	bm25_score?: number;
	matched_via?: SearchResult["matchedVia"];
};

type RawSearchResponse = {
	query: string;
	filters?: { wing?: string; room?: string };
	total_before_filter?: number;
	results?: readonly RawSearchResult[];
};

const searchResponseFromRaw = (raw: RawSearchResponse): SearchResponse => {
	const results: SearchResult[] = (raw.results ?? []).map((r) => {
		const drawerId = r.drawer_id ?? r.id;
		const result: SearchResult = {
			snippet: r.text ?? "",
			wing: { id: r.wing ?? "", name: r.wing ?? "" },
			room: { id: r.room ?? "", name: r.room ?? "" },
			scores: {
				cosine: r.similarity,
				bm25: r.bm25_score,
				distance: r.distance,
				effectiveDistance: r.effective_distance,
				closetBoost: r.closet_boost,
			},
			createdAt: r.created_at,
			updatedAt: r.updated_at,
			matchedVia: r.matched_via,
		};
		if (drawerId !== undefined) result.drawerId = drawerId;
		return result;
	});
	return {
		query: raw.query,
		filters: raw.filters ?? {},
		totalBeforeFilter: raw.total_before_filter ?? results.length,
		results,
	};
};

type RawTunnel = {
	tunnel_id?: string;
	id?: string;
	source_drawer_id?: string;
	target_drawer_id?: string;
	source_wing?: string;
	target_wing?: string;
	wing_a?: string;
	wing_b?: string;
	kind?: string;
	created_at?: string;
};

const tunnelFromRaw = (raw: RawTunnel): Tunnel => ({
	id: raw.tunnel_id ?? raw.id ?? "",
	sourceDrawerId: raw.source_drawer_id ?? null,
	targetDrawerId: raw.target_drawer_id ?? null,
	sourceWingId: raw.source_wing ?? raw.wing_a ?? "",
	targetWingId: raw.target_wing ?? raw.wing_b ?? "",
	kind: raw.kind,
	createdAt: raw.created_at ?? "",
});

export const searchSemantic = async (
	transport: McpTransport,
	opts: SearchSemanticOpts,
): Promise<SearchResponse> => {
	const args: Record<string, unknown> = { query: opts.query };
	if (opts.limit !== undefined) args.limit = opts.limit;
	if (opts.wing !== undefined) args.wing = opts.wing;
	if (opts.room !== undefined) args.room = opts.room;
	if (opts.maxDistance !== undefined) args.max_distance = opts.maxDistance;
	if (opts.context !== undefined) args.context = opts.context;
	const raw = await callTool<RawSearchResponse>(transport, "mempalace_search", args);
	return searchResponseFromRaw(raw);
};

export const findTunnels = async (
	transport: McpTransport,
	opts: FindTunnelsOpts = {},
): Promise<Tunnel[]> => {
	const args: Record<string, unknown> = {};
	if (opts.wingA !== undefined) args.wing_a = opts.wingA;
	if (opts.wingB !== undefined) args.wing_b = opts.wingB;
	const raw = await callTool<{ tunnels?: readonly RawTunnel[] } | readonly RawTunnel[]>(
		transport,
		"mempalace_find_tunnels",
		args,
	);
	const list: readonly RawTunnel[] = Array.isArray(raw)
		? (raw as readonly RawTunnel[])
		: ((raw as { tunnels?: readonly RawTunnel[] }).tunnels ?? []);
	return list.map(tunnelFromRaw);
};

export const getDrawer = async (
	transport: McpTransport,
	drawerId: string,
): Promise<Drawer | null> => {
	const raw = await callTool<RawDrawer | null>(transport, "mempalace_get_drawer", {
		drawer_id: drawerId,
	});
	if (raw === null || (typeof raw === "object" && Object.keys(raw).length === 0)) {
		return null;
	}
	return drawerFromRaw(raw);
};

type RawWingsResponse =
	| { wings?: Record<string, number> }
	| { wings?: readonly { wing: string; drawer_count: number }[] };

const sortByName = <T extends { name: string }>(arr: T[]): T[] =>
	arr.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

export const listWings = async (transport: McpTransport): Promise<Wing[]> => {
	const raw = await callTool<RawWingsResponse>(transport, "mempalace_list_wings", {});
	if ("wings" in raw && raw.wings !== undefined) {
		const w = raw.wings;
		if (Array.isArray(w)) {
			return sortByName(
				w.map((row) => ({
					id: row.wing,
					name: row.wing,
					drawerCount: row.drawer_count,
				})),
			);
		}
		// JS object iteration order isn't guaranteed for the wire shape
		// `{ name: count }`; sort the materialized list explicitly.
		return sortByName(
			Object.entries(w).map(([name, count]) => ({
				id: name,
				name,
				drawerCount: count,
			})),
		);
	}
	return [];
};

type RawRoomsResponse =
	| { rooms?: Record<string, number> }
	| { rooms?: readonly { wing: string; room: string; drawer_count: number }[] };

export const listRooms = async (
	transport: McpTransport,
	opts: ListRoomsToolOpts = {},
): Promise<Room[]> => {
	const args: Record<string, unknown> = {};
	if (opts.wing !== undefined) args.wing = opts.wing;
	const raw = await callTool<RawRoomsResponse>(transport, "mempalace_list_rooms", args);
	if ("rooms" in raw && raw.rooms !== undefined) {
		const r = raw.rooms;
		if (Array.isArray(r)) {
			const rooms = r.map((row) => ({
				id: `${row.wing}/${row.room}`,
				name: row.room,
				wingId: row.wing,
				drawerCount: row.drawer_count,
			}));
			return sortByName(rooms);
		}
		const wingId = opts.wing ?? "";
		const rooms = Object.entries(r).map(([name, count]) => ({
			id: `${wingId}/${name}`,
			name,
			wingId,
			drawerCount: count,
		}));
		return sortByName(rooms);
	}
	return [];
};

const countFromValue = (value: MetadataValue | undefined): number | undefined => {
	if (typeof value === "number") return value;
	if (value !== null && typeof value === "object" && !Array.isArray(value)) {
		return Object.keys(value).length;
	}
	return undefined;
};

export const getStatus = async (transport: McpTransport): Promise<McpStatus> => {
	// Note: server version comes from the MCP `initialize` handshake
	// (`getServerInfo()`), not from `mempalace_status` — that tool's
	// payload doesn't carry it. Use `getServerInfo()` if you need it.
	//
	// Live `mempalace_status` shapes `wings` / `rooms` as
	// `Record<slug, count>` objects, so we report distinct-key counts.
	const raw = await callTool<Record<string, MetadataValue>>(transport, "mempalace_status", {});
	const palacePath =
		typeof raw.palace_path === "string"
			? raw.palace_path
			: typeof raw.path === "string"
				? raw.path
				: undefined;
	const totalDrawers =
		typeof raw.total_drawers === "number"
			? raw.total_drawers
			: typeof raw.drawer_count === "number"
				? raw.drawer_count
				: undefined;
	return {
		status: typeof raw.status === "string" ? raw.status : "unknown",
		palacePath,
		totalDrawers,
		wings: countFromValue(raw.wing_count) ?? countFromValue(raw.wings),
		rooms: countFromValue(raw.room_count) ?? countFromValue(raw.rooms),
		_raw: raw,
	};
};

export const reconnect = async (transport: McpTransport): Promise<void> => {
	await callTool<unknown>(transport, "mempalace_reconnect", {});
};
