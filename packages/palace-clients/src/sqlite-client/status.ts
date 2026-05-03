import type { SqliteConnection } from "./connection";

export type SqliteStatus = {
	status: "connected";
	palacePath: string;
	schemaVersion: number;
	totalDrawers: number;
};

const DRAWERS_COLLECTION = "mempalace_drawers";

/**
 * Fast SQL-only health: total drawer count, palace path, sysdb
 * migration level. This is the hot-path status used by the UI's
 * connection panel; for a full server-side palace overview, prefer
 * MCP's `mempalace_status`.
 */
export const getStatus = async (conn: SqliteConnection): Promise<SqliteStatus> => {
	const row = conn.db
		.prepare(
			`SELECT COUNT(*) AS n
			 FROM embeddings e
			 JOIN segments s ON e.segment_id = s.id
			 JOIN collections c ON s.collection = c.id
			 WHERE c.name = ?`,
		)
		.get(DRAWERS_COLLECTION) as { n: number } | undefined;

	return {
		status: "connected",
		palacePath: conn.palacePath,
		schemaVersion: conn.schemaVersion,
		totalDrawers: row?.n ?? 0,
	};
};
