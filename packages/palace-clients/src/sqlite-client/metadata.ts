// Used by searchSemantic's post-filter path: after MCP returns N candidate
// drawers, hydrate their metadata so we can evaluate the user's where-clause
// in JS. When MemPalace adds native `where` support to `mempalace_search`,
// this helper is no longer needed for search but remains useful for any
// future feature that needs batch metadata lookup.

import type { MetadataRecord, MetadataValue } from "@memui/palace-types/metadata";
import type { SqliteConnection } from "./connection";

const DRAWERS_COLLECTION = "mempalace_drawers";
// SQLite caps bound parameters at 32766 (`SQLITE_MAX_VARIABLE_NUMBER`);
// 1000 is a sane upper bound and leaves room for the segment-id placeholders.
const MAX_BATCH = 1000;

const placeholders = (n: number): string => Array.from({ length: n }, () => "?").join(",");

const drawerSegmentIds = (conn: SqliteConnection): readonly string[] => {
	const rows = conn.db
		.prepare(
			`SELECT s.id AS id FROM segments s
			 JOIN collections c ON s.collection = c.id
			 WHERE c.name = ?`,
		)
		.all(DRAWERS_COLLECTION) as { id: string }[];
	return rows.map((r) => r.id);
};

type Row = {
	embedding_id: string;
	key: string | null;
	string_value: string | null;
	int_value: number | null;
	float_value: number | null;
	bool_value: number | null;
};

const valueFromRow = (row: Row): MetadataValue => {
	// Priority order matches the EAV pivot: string > int > float > bool.
	// `chroma:document` lands in `string_value` like everything else but
	// is filtered out at SQL level — a 100KB drawer body has no place in
	// a metadata predicate evaluation.
	if (row.string_value !== null) return row.string_value;
	if (row.int_value !== null) return row.int_value;
	if (row.float_value !== null) return row.float_value;
	if (row.bool_value !== null) return row.bool_value === 1;
	return null;
};

/**
 * Hydrate metadata records for a batch of drawer IDs.
 *
 * **Caps inputs at `MAX_BATCH` (1000) to defend SQLite's
 * `SQLITE_MAX_VARIABLE_NUMBER` (32766) bound-parameter ceiling.** Inputs
 * above that cap are SILENTLY TRUNCATED via `Array.prototype.slice` —
 * callers exceeding 1000 ids will receive incomplete results without an
 * error. The cap is comfortably above realistic post-filter batch sizes:
 * `searchSemantic`'s overfetch is `requestedLimit × overfetchFactor`,
 * with `overfetchFactor` clamped to `[1, 5]` and `requestedLimit`
 * typically ≤ 100, so a worst-case batch is a few hundred ids.
 *
 * If a future caller needs to look up more than 1000 drawers at once,
 * either chunk at the call site or extend this helper to chunk
 * internally. Until then the cap is fine.
 */
export const getDrawersMetadata = async (
	conn: SqliteConnection,
	embeddingIds: readonly string[],
): Promise<Map<string, MetadataRecord>> => {
	const out = new Map<string, MetadataRecord>();
	if (embeddingIds.length === 0) return out;
	const segIds = drawerSegmentIds(conn);
	if (segIds.length === 0) return out;

	const ids = embeddingIds.slice(0, MAX_BATCH);

	const rows = conn.db
		.prepare(
			`SELECT e.embedding_id AS embedding_id,
			        em.key AS key,
			        em.string_value AS string_value,
			        em.int_value AS int_value,
			        em.float_value AS float_value,
			        em.bool_value AS bool_value
			 FROM embeddings e
			 LEFT JOIN embedding_metadata em ON em.id = e.id
			 WHERE e.embedding_id IN (${placeholders(ids.length)})
			   AND e.segment_id IN (${placeholders(segIds.length)})
			   AND (em.key IS NULL OR em.key != 'chroma:document')`,
		)
		.all(...ids, ...segIds) as Row[];

	for (const row of rows) {
		let bucket = out.get(row.embedding_id);
		if (!bucket) {
			bucket = {} as MetadataRecord;
			out.set(row.embedding_id, bucket);
		}
		if (row.key === null) continue;
		(bucket as Record<string, MetadataValue>)[row.key] = valueFromRow(row);
	}

	return out;
};
