import type { Drawer } from "@memui/palace-types/drawer";
import type { MetadataRecord, MetadataValue } from "@memui/palace-types/metadata";
import type { MiningMode, Provenance } from "@memui/palace-types/provenance";
import type { Logger } from "../logger";

/**
 * One row from the join `embeddings LEFT JOIN embedding_metadata` —
 * the public drawer id (`embedding_id`) plus a single key/value triple
 * from the EAV side. A drawer with N metadata keys produces N rows;
 * the `pivotEavRows` helper folds them back into one typed `Drawer`.
 */
export type EavRow = {
	embedding_id: string;
	created_at: string;
	key: string | null;
	string_value: string | null;
	int_value: number | null;
	float_value: number | null;
	bool_value: number | null;
};

const KNOWN_MINING_MODES: readonly MiningMode[] = [
	"manual",
	"auto",
	"imported",
	"synthetic",
	"mempalace",
	"mcp",
];

export const coerceMiningMode = (raw: unknown): MiningMode => {
	if (typeof raw !== "string") return "unknown";
	const lower = raw.toLowerCase();
	for (const mode of KNOWN_MINING_MODES) {
		if (mode === lower) return mode;
	}
	return "unknown";
};

const valueFromRow = (row: EavRow): MetadataValue => {
	if (row.string_value !== null) return row.string_value;
	if (row.int_value !== null) return row.int_value;
	if (row.float_value !== null) return row.float_value;
	if (row.bool_value !== null) return row.bool_value === 1;
	return null;
};

/**
 * Pivot the row-per-key EAV result set into a single typed `Drawer`.
 * Promotes provenance keys (`filed_at`, `source_file`, `added_by`) into
 * the `Provenance` shape; routes the `chroma:document` body into
 * `Drawer.content`; routes `wing` / `room` to top-level ids; everything
 * else lands on the open-ended `metadata` record.
 *
 * Returns `null` when the load-bearing `wing` or `room` keys are
 * missing or empty (corrupted EAV row) — emitting a partial drawer
 * with empty wing/room would silently drop it from wing/room
 * aggregations.
 */
export const pivotEavRows = (rows: readonly EavRow[], logger?: Logger): Drawer | null => {
	if (rows.length === 0) return null;
	const first = rows[0];
	if (!first) return null;

	let content = "";
	let wingId = "";
	let roomId = "";
	let filedAt: string | null = null;
	let sourcePath = "";
	let miningModeRaw: string | null = null;
	const metadata: Record<string, MetadataValue> = {};

	for (const row of rows) {
		if (row.key === null) continue;
		const v = valueFromRow(row);
		switch (row.key) {
			case "chroma:document":
				if (typeof v === "string") content = v;
				break;
			case "wing":
				if (typeof v === "string") wingId = v;
				break;
			case "room":
				if (typeof v === "string") roomId = v;
				break;
			case "filed_at":
				if (typeof v === "string") filedAt = v;
				break;
			case "source_file":
				if (typeof v === "string") sourcePath = v;
				break;
			case "added_by":
				if (typeof v === "string") miningModeRaw = v;
				break;
			default:
				metadata[row.key] = v;
				break;
		}
	}

	if (wingId.length === 0 || roomId.length === 0) {
		logger?.warn?.(
			`[palace-clients] drawer ${first.embedding_id} missing load-bearing wing/room metadata; skipping`,
		);
		return null;
	}

	const provenance: Provenance = {
		createdAt: filedAt ?? first.created_at,
		sourcePath,
		miningMode: coerceMiningMode(miningModeRaw),
	};

	return {
		id: first.embedding_id,
		content,
		wingId,
		roomId,
		metadata: metadata as MetadataRecord,
		provenance,
	};
};

/**
 * Group a flat EAV stream by `embedding_id` and pivot each bucket. Used
 * by list endpoints that fetch metadata for many drawers at once.
 * Drawers missing wing/room are filtered out (see `pivotEavRows`).
 */
export const pivotEavGroups = (rows: readonly EavRow[], logger?: Logger): Drawer[] => {
	const buckets = new Map<string, EavRow[]>();
	for (const row of rows) {
		const list = buckets.get(row.embedding_id);
		if (list) list.push(row);
		else buckets.set(row.embedding_id, [row]);
	}
	const drawers: Drawer[] = [];
	for (const list of buckets.values()) {
		const drawer = pivotEavRows(list, logger);
		if (drawer) drawers.push(drawer);
	}
	return drawers;
};
