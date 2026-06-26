import type { SqliteConnection } from "./connection";

const DRAWERS_COLLECTION = "mempalace_drawers";

/**
 * Columnar projection of every drawer for the WebGL graph view.
 *
 * Parallel arrays — index `i` across every array describes node `i`.
 * This is the shape WebGL renderers ingest directly (each column maps
 * to a buffer / typed-array attribute) and it keeps the wire payload an
 * order of magnitude smaller than `count` plain objects would.
 *
 * - `ids` — public drawer id (`embedding_id`), the node identity
 * - `wing` / `room` — structural placement (empty string when a drawer
 *   is missing the load-bearing key rather than dropping the node)
 * - `createdAt` — recency as epoch milliseconds, derived from `filed_at`
 *   (the per-drawer mining timestamp) and falling back to the embedding
 *   `created_at`; `0` when neither parses
 * - `size` — `length(chroma:document)`, the drawer body length
 * - `clusterId` — precomputed cluster index for Cluster color mode, or
 *   `null` when absent (it is absent on every drawer today — this reader
 *   tolerates that and never errors)
 * - `count` — number of nodes; equals every array's length
 */
export type GraphNodes = {
	readonly ids: readonly string[];
	readonly wing: readonly string[];
	readonly room: readonly string[];
	readonly createdAt: readonly number[];
	readonly size: readonly number[];
	readonly clusterId: readonly (number | null)[];
	readonly count: number;
};

export type ListGraphNodesOpts = {
	/** Optional single-wing filter; omit to return every drawer. */
	wing?: string;
};

type GraphRow = {
	id: string;
	created_at: string | null;
	filed_at: string | null;
	wing: string | null;
	room: string | null;
	size: number | null;
	cluster_int: number | null;
	cluster_float: number | null;
};

const toEpochMs = (filedAt: string | null, createdAt: string | null): number => {
	const raw = filedAt ?? createdAt;
	if (raw === null) return 0;
	const ms = Date.parse(raw);
	return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Read every drawer as a graph node in a single `GROUP BY` over
 * `embedding_metadata`, projecting wing / room / recency / size and an
 * optional precomputed `clusterId`.
 *
 * **Intentionally uncapped.** Unlike the list readers (which clamp at
 * `MAX_LIST_LIMIT` to bound a page), the graph needs the whole palace
 * (~164k drawers today) in one shot. better-sqlite3 is synchronous and a
 * single grouped scan over the drawers collection completes in well under
 * a second, so there is no pagination — the renderer ingests the full set.
 */
export const listGraphNodes = async (
	conn: SqliteConnection,
	opts: ListGraphNodesOpts = {},
): Promise<GraphNodes> => {
	const wingFilter = opts.wing;
	const wingJoin = wingFilter
		? "JOIN embedding_metadata em_w ON em_w.id = e.id AND em_w.key = 'wing' AND em_w.string_value = ?"
		: "";

	const sql = `SELECT e.embedding_id AS id,
	                    e.created_at AS created_at,
	                    MAX(CASE WHEN em.key = 'filed_at' THEN em.string_value END) AS filed_at,
	                    MAX(CASE WHEN em.key = 'wing' THEN em.string_value END) AS wing,
	                    MAX(CASE WHEN em.key = 'room' THEN em.string_value END) AS room,
	                    MAX(CASE WHEN em.key = 'chroma:document' THEN length(em.string_value) END) AS size,
	                    MAX(CASE WHEN em.key = 'clusterId' THEN em.int_value END) AS cluster_int,
	                    MAX(CASE WHEN em.key = 'clusterId' THEN em.float_value END) AS cluster_float
	             FROM embeddings e
	             JOIN segments s ON e.segment_id = s.id
	             JOIN collections c ON s.collection = c.id
	             ${wingJoin}
	             LEFT JOIN embedding_metadata em ON em.id = e.id
	             WHERE c.name = ?
	             GROUP BY e.id
	             ORDER BY e.id ASC`;

	const params: string[] = wingFilter ? [wingFilter, DRAWERS_COLLECTION] : [DRAWERS_COLLECTION];
	const rows = conn.db.prepare(sql).all(...params) as GraphRow[];

	const count = rows.length;
	const ids = new Array<string>(count);
	const wing = new Array<string>(count);
	const room = new Array<string>(count);
	const createdAt = new Array<number>(count);
	const size = new Array<number>(count);
	const clusterId = new Array<number | null>(count);

	for (let i = 0; i < count; i++) {
		const row = rows[i] as GraphRow;
		ids[i] = row.id;
		wing[i] = row.wing ?? "";
		room[i] = row.room ?? "";
		createdAt[i] = toEpochMs(row.filed_at, row.created_at);
		size[i] = row.size ?? 0;
		clusterId[i] = row.cluster_int ?? row.cluster_float ?? null;
	}

	return { ids, wing, room, createdAt, size, clusterId, count };
};
