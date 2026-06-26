import type { Drawer, DrawerSummary } from "@memui/palace-types/drawer";
import type { Logger } from "../logger";
import type { SqliteConnection } from "./connection";
import { type EavRow, pivotEavGroups, pivotEavRows } from "./eav";

const DRAWERS_COLLECTION = "mempalace_drawers";
// SQLite caps bound parameters at 32766 (`SQLITE_MAX_VARIABLE_NUMBER`);
// 1000 is a sane upper bound for a list page and leaves room for the
// segment-id + wing/room placeholders.
const MAX_LIST_LIMIT = 1000;
const DEFAULT_LIST_LIMIT = 50;
const SNIPPET_BYTES = 200;

/**
 * Resolve the chromadb segment ids for the drawers collection. Cached
 * per-connection on first call — segment ids are stable for the
 * lifetime of the collection.
 */
const segmentIdCache = new WeakMap<SqliteConnection, readonly string[]>();
const drawerSegmentIds = (conn: SqliteConnection): readonly string[] => {
	const cached = segmentIdCache.get(conn);
	if (cached) return cached;
	const rows = conn.db
		.prepare(
			`SELECT s.id AS id FROM segments s
			 JOIN collections c ON s.collection = c.id
			 WHERE c.name = ?`,
		)
		.all(DRAWERS_COLLECTION) as { id: string }[];
	const ids = rows.map((r) => r.id);
	segmentIdCache.set(conn, ids);
	return ids;
};

const placeholders = (n: number): string => Array.from({ length: n }, () => "?").join(",");

const clampLimit = (limit?: number): number => {
	if (limit === undefined) return DEFAULT_LIST_LIMIT;
	if (limit <= 0) return DEFAULT_LIST_LIMIT;
	return Math.min(limit, MAX_LIST_LIMIT);
};

export const getDrawer = async (
	conn: SqliteConnection,
	embeddingId: string,
	logger?: Logger,
): Promise<Drawer | null> => {
	const segIds = drawerSegmentIds(conn);
	if (segIds.length === 0) return null;

	const rows = conn.db
		.prepare(
			`SELECT e.embedding_id AS embedding_id,
			        e.created_at AS created_at,
			        em.key AS key,
			        em.string_value AS string_value,
			        em.int_value AS int_value,
			        em.float_value AS float_value,
			        em.bool_value AS bool_value
			 FROM embeddings e
			 LEFT JOIN embedding_metadata em ON em.id = e.id
			 WHERE e.embedding_id = ? AND e.segment_id IN (${placeholders(segIds.length)})`,
		)
		.all(embeddingId, ...segIds) as EavRow[];

	return pivotEavRows(rows, logger);
};

export type ListDrawersByRoomOpts = {
	wingId: string;
	roomId?: string;
	limit?: number;
	offset?: number;
};

export const listDrawersByRoom = async (
	conn: SqliteConnection,
	opts: ListDrawersByRoomOpts,
	logger?: Logger,
): Promise<Drawer[]> => {
	const segIds = drawerSegmentIds(conn);
	if (segIds.length === 0) return [];
	const limit = clampLimit(opts.limit);
	const offset = opts.offset ?? 0;

	// Two-step: candidate embeddings.id set via the wing index (and
	// optionally room), then load all metadata for those rows. The
	// `embedding_metadata_string_value(key, string_value)` index makes
	// the candidate scan an index lookup.
	// Order by `created_at DESC, e.id DESC` so a `mempalace repair`
	// (which renumbers ids) still surfaces recent drawers first.
	const candidateSql = opts.roomId
		? `SELECT em_w.id AS id, e.created_at AS created_at
		   FROM embedding_metadata em_w
		   JOIN embedding_metadata em_r ON em_r.id = em_w.id
		   JOIN embeddings e ON e.id = em_w.id
		   WHERE em_w.key = 'wing' AND em_w.string_value = ?
		     AND em_r.key = 'room' AND em_r.string_value = ?
		     AND e.segment_id IN (${placeholders(segIds.length)})
		   ORDER BY e.created_at DESC, e.id DESC
		   LIMIT ? OFFSET ?`
		: `SELECT em_w.id AS id, e.created_at AS created_at
		   FROM embedding_metadata em_w
		   JOIN embeddings e ON e.id = em_w.id
		   WHERE em_w.key = 'wing' AND em_w.string_value = ?
		     AND e.segment_id IN (${placeholders(segIds.length)})
		   ORDER BY e.created_at DESC, e.id DESC
		   LIMIT ? OFFSET ?`;

	const params: (string | number)[] = opts.roomId
		? [opts.wingId, opts.roomId, ...segIds, limit, offset]
		: [opts.wingId, ...segIds, limit, offset];

	const candidateRows = conn.db.prepare(candidateSql).all(...params) as {
		id: number;
		created_at: string;
	}[];
	if (candidateRows.length === 0) return [];

	const ids = candidateRows.map((r) => r.id);
	const rows = conn.db
		.prepare(
			`SELECT e.embedding_id AS embedding_id,
			        e.created_at AS created_at,
			        em.key AS key,
			        em.string_value AS string_value,
			        em.int_value AS int_value,
			        em.float_value AS float_value,
			        em.bool_value AS bool_value
			 FROM embeddings e
			 LEFT JOIN embedding_metadata em ON em.id = e.id
			 WHERE e.id IN (${placeholders(ids.length)})
			 ORDER BY e.created_at DESC, e.id DESC`,
		)
		.all(...ids) as EavRow[];

	return pivotEavGroups(rows, logger);
};

export type ListDrawerSummariesByRoomOpts = ListDrawersByRoomOpts;

export type ListDrawerSummariesByWingOpts = {
	wingId: string;
	limit?: number;
	offset?: number;
};

type SummaryCandidate = {
	id: number;
	embedding_id: string;
	created_at: string;
	bytes: number | null;
	snippet: string | null;
	wing: string | null;
	room: string | null;
};

/**
 * Lightweight projection over `listDrawersByRoom` for list pages that
 * only render snippet + wing + room + recency. Pulls only the
 * `chroma:document` snippet (truncated to the first `SNIPPET_BYTES`
 * bytes server-side via `substr`) and reports total document length
 * via `length(...)`. No metadata pivot, no closet/tunnel pointers.
 */
export const listDrawerSummariesByRoom = async (
	conn: SqliteConnection,
	opts: ListDrawerSummariesByRoomOpts,
): Promise<DrawerSummary[]> => {
	const segIds = drawerSegmentIds(conn);
	if (segIds.length === 0) return [];
	const limit = clampLimit(opts.limit);
	const offset = opts.offset ?? 0;

	// Aggregate the three EAV keys we need (`chroma:document`, `wing`,
	// `room`) using conditional MAX so a single row per drawer comes
	// back. Candidate filtering happens in the inner query so the
	// outer `MAX(...)` only touches rows that already passed wing/room.
	const innerSql = opts.roomId
		? `SELECT em_w.id AS id, e.embedding_id AS embedding_id, e.created_at AS created_at
		   FROM embedding_metadata em_w
		   JOIN embedding_metadata em_r ON em_r.id = em_w.id
		   JOIN embeddings e ON e.id = em_w.id
		   WHERE em_w.key = 'wing' AND em_w.string_value = ?
		     AND em_r.key = 'room' AND em_r.string_value = ?
		     AND e.segment_id IN (${placeholders(segIds.length)})
		   ORDER BY e.created_at DESC, e.id DESC
		   LIMIT ? OFFSET ?`
		: `SELECT em_w.id AS id, e.embedding_id AS embedding_id, e.created_at AS created_at
		   FROM embedding_metadata em_w
		   JOIN embeddings e ON e.id = em_w.id
		   WHERE em_w.key = 'wing' AND em_w.string_value = ?
		     AND e.segment_id IN (${placeholders(segIds.length)})
		   ORDER BY e.created_at DESC, e.id DESC
		   LIMIT ? OFFSET ?`;

	const sql = `SELECT cand.id AS id,
	                    cand.embedding_id AS embedding_id,
	                    cand.created_at AS created_at,
	                    MAX(CASE WHEN em.key = 'chroma:document' THEN length(em.string_value) END) AS bytes,
	                    MAX(CASE WHEN em.key = 'chroma:document' THEN substr(em.string_value, 1, ${SNIPPET_BYTES}) END) AS snippet,
	                    MAX(CASE WHEN em.key = 'wing' THEN em.string_value END) AS wing,
	                    MAX(CASE WHEN em.key = 'room' THEN em.string_value END) AS room
	             FROM (${innerSql}) cand
	             LEFT JOIN embedding_metadata em ON em.id = cand.id
	             GROUP BY cand.id, cand.embedding_id, cand.created_at
	             ORDER BY cand.created_at DESC, cand.id DESC`;

	const params: (string | number)[] = opts.roomId
		? [opts.wingId, opts.roomId, ...segIds, limit, offset]
		: [opts.wingId, ...segIds, limit, offset];

	const rows = conn.db.prepare(sql).all(...params) as SummaryCandidate[];

	const summaries: DrawerSummary[] = [];
	for (const row of rows) {
		if (!row.wing || !row.room) continue;
		const summary: DrawerSummary = {
			id: row.embedding_id,
			contentSnippet: row.snippet ?? "",
			wingId: row.wing,
			roomId: row.room,
			createdAt: row.created_at,
		};
		if (row.bytes !== null) {
			summaries.push({ ...summary, bytes: row.bytes });
		} else {
			summaries.push(summary);
		}
	}
	return summaries;
};

export type FindDrawerIdByLocatorOpts = {
	wingId: string;
	roomId: string;
	sourceFile: string;
};

// Escape the LIKE wildcards (`%`, `_`) and the escape char itself so a
// basename that legitimately contains them (e.g. `knowledge_graph.jsonl`)
// is matched literally rather than as a pattern.
const LIKE_SPECIAL = /[\\%_]/g;
const escapeLike = (value: string): string => value.replace(LIKE_SPECIAL, (ch) => `\\${ch}`);

// Last path segment of a `/`-separated path. Returns the input unchanged
// when there is no slash (i.e. it is already a bare basename).
const basename = (path: string): string => {
	const idx = path.lastIndexOf("/");
	return idx === -1 ? path : path.slice(idx + 1);
};

/**
 * Recover a public drawer id (the `embedding_id`, e.g.
 * `drawer_<wing>_<room>_<24hex>`) from a `(wing, room, source_file)`
 * locator. `mempalace_search` does not return drawer ids in its result
 * shape, so the search handler enriches its rows by calling this helper.
 *
 * **`source_file` matching is basename-aware.** `mempalace_search` reports
 * `source_file` as a bare basename (e.g. `bqhncg1rr.txt`), but the
 * `embedding_metadata.source_file` value is the full absolute path the
 * memory was mined from (e.g. `/Users/…/tool-results/bqhncg1rr.txt`). An
 * exact-equality match would therefore resolve nothing. We match either the
 * exact stored value (covers installs that store bare basenames, and the
 * future case where search returns a full path) OR any stored path whose
 * final `/`-segment equals the locator's basename.
 *
 * When a single source file produced multiple chunks, returns the first
 * by `chunk_index ASC` (falling back to `created_at ASC, e.id ASC` when
 * `chunk_index` is missing). Returns `null` when no row matches.
 */
export const findDrawerIdByLocator = async (
	conn: SqliteConnection,
	opts: FindDrawerIdByLocatorOpts,
): Promise<string | null> => {
	const segIds = drawerSegmentIds(conn);
	if (segIds.length === 0) return null;

	const sql = `SELECT e.embedding_id AS embedding_id,
	                    em_chunk.int_value AS chunk_index,
	                    e.created_at AS created_at,
	                    e.id AS id
	             FROM embedding_metadata em_w
	             JOIN embedding_metadata em_r ON em_r.id = em_w.id
	             JOIN embedding_metadata em_s ON em_s.id = em_w.id
	             JOIN embeddings e ON e.id = em_w.id
	             LEFT JOIN embedding_metadata em_chunk
	               ON em_chunk.id = em_w.id AND em_chunk.key = 'chunk_index'
	             WHERE em_w.key = 'wing' AND em_w.string_value = ?
	               AND em_r.key = 'room' AND em_r.string_value = ?
	               AND em_s.key = 'source_file'
	               AND (em_s.string_value = ? OR em_s.string_value LIKE ? ESCAPE '\\')
	               AND e.segment_id IN (${placeholders(segIds.length)})
	             ORDER BY (em_chunk.int_value IS NULL) ASC,
	                      em_chunk.int_value ASC,
	                      e.created_at ASC,
	                      e.id ASC
	             LIMIT 1`;

	// Suffix pattern matches any stored path ending in `/<basename>`. The
	// leading slash in the pattern prevents `foo.md` matching `barfoo.md`.
	const suffixPattern = `%/${escapeLike(basename(opts.sourceFile))}`;
	const params: (string | number)[] = [
		opts.wingId,
		opts.roomId,
		opts.sourceFile,
		suffixPattern,
		...segIds,
	];
	const row = conn.db.prepare(sql).get(...params) as { embedding_id: string } | undefined;
	return row?.embedding_id ?? null;
};

/**
 * Wing-scoped variant of `listDrawerSummariesByRoom` — lists every
 * drawer under a wing across all its rooms, ordered by recency.
 * Used by the wing overview page where the room filter is omitted.
 */
export const listDrawerSummariesByWing = async (
	conn: SqliteConnection,
	opts: ListDrawerSummariesByWingOpts,
): Promise<DrawerSummary[]> => {
	const segIds = drawerSegmentIds(conn);
	if (segIds.length === 0) return [];
	const limit = clampLimit(opts.limit);
	const offset = opts.offset ?? 0;

	const innerSql = `SELECT em_w.id AS id, e.embedding_id AS embedding_id, e.created_at AS created_at
		   FROM embedding_metadata em_w
		   JOIN embeddings e ON e.id = em_w.id
		   WHERE em_w.key = 'wing' AND em_w.string_value = ?
		     AND e.segment_id IN (${placeholders(segIds.length)})
		   ORDER BY e.created_at DESC, e.id DESC
		   LIMIT ? OFFSET ?`;

	const sql = `SELECT cand.id AS id,
	                    cand.embedding_id AS embedding_id,
	                    cand.created_at AS created_at,
	                    MAX(CASE WHEN em.key = 'chroma:document' THEN length(em.string_value) END) AS bytes,
	                    MAX(CASE WHEN em.key = 'chroma:document' THEN substr(em.string_value, 1, ${SNIPPET_BYTES}) END) AS snippet,
	                    MAX(CASE WHEN em.key = 'wing' THEN em.string_value END) AS wing,
	                    MAX(CASE WHEN em.key = 'room' THEN em.string_value END) AS room
	             FROM (${innerSql}) cand
	             LEFT JOIN embedding_metadata em ON em.id = cand.id
	             GROUP BY cand.id, cand.embedding_id, cand.created_at
	             ORDER BY cand.created_at DESC, cand.id DESC`;

	const params: (string | number)[] = [opts.wingId, ...segIds, limit, offset];
	const rows = conn.db.prepare(sql).all(...params) as SummaryCandidate[];

	const summaries: DrawerSummary[] = [];
	for (const row of rows) {
		if (!row.wing || !row.room) continue;
		const summary: DrawerSummary = {
			id: row.embedding_id,
			contentSnippet: row.snippet ?? "",
			wingId: row.wing,
			roomId: row.room,
			createdAt: row.created_at,
		};
		if (row.bytes !== null) {
			summaries.push({ ...summary, bytes: row.bytes });
		} else {
			summaries.push(summary);
		}
	}
	return summaries;
};
