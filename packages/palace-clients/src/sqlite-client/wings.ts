import type { Room } from "@memui/palace-types/room";
import type { Wing } from "@memui/palace-types/wing";
import type { SqliteConnection } from "./connection";

const DRAWERS_COLLECTION = "mempalace_drawers";

/**
 * Aggregate drawer counts by `wing` metadata. The
 * `embedding_metadata_string_value(key, string_value)` index makes the
 * GROUP BY an index scan. `COUNT(DISTINCT em.id)` so a drawer that
 * accidentally carries multiple `wing` rows in EAV doesn't double-count.
 */
export const listWings = async (conn: SqliteConnection): Promise<Wing[]> => {
	const rows = conn.db
		.prepare(
			`SELECT em.string_value AS name, COUNT(DISTINCT em.id) AS drawer_count
			 FROM embedding_metadata em
			 JOIN embeddings e ON e.id = em.id
			 JOIN segments s ON e.segment_id = s.id
			 JOIN collections c ON s.collection = c.id
			 WHERE em.key = 'wing'
			   AND em.string_value IS NOT NULL
			   AND c.name = ?
			 GROUP BY em.string_value
			 ORDER BY em.string_value ASC`,
		)
		.all(DRAWERS_COLLECTION) as { name: string; drawer_count: number }[];

	return rows.map((row) => ({
		id: row.name,
		name: row.name,
		drawerCount: row.drawer_count,
	}));
};

export type ListRoomsOpts = {
	wingId?: string;
};

/**
 * Aggregate drawer counts by `room` metadata, optionally constrained
 * to a wing. When a wing filter is supplied we self-join
 * `embedding_metadata` on the same drawer id to require both keys.
 *
 * `Room.id` is namespaced as `<wing>/<room>` so cross-wing slug
 * collisions (`general` exists in many wings) don't collapse — see
 * the `Room` doc comment in `@memui/palace-types/room`.
 */
export const listRooms = async (
	conn: SqliteConnection,
	opts: ListRoomsOpts = {},
): Promise<Room[]> => {
	if (opts.wingId) {
		const rows = conn.db
			.prepare(
				`SELECT em_r.string_value AS room,
				        em_w.string_value AS wing,
				        COUNT(DISTINCT em_r.id) AS drawer_count
				 FROM embedding_metadata em_r
				 JOIN embedding_metadata em_w ON em_w.id = em_r.id
				 JOIN embeddings e ON e.id = em_r.id
				 JOIN segments s ON e.segment_id = s.id
				 JOIN collections c ON s.collection = c.id
				 WHERE em_r.key = 'room'
				   AND em_w.key = 'wing'
				   AND em_w.string_value = ?
				   AND c.name = ?
				 GROUP BY em_r.string_value
				 ORDER BY em_r.string_value ASC`,
			)
			.all(opts.wingId, DRAWERS_COLLECTION) as {
			room: string;
			wing: string;
			drawer_count: number;
		}[];
		return rows.map((row) => ({
			id: `${row.wing}/${row.room}`,
			name: row.room,
			wingId: row.wing,
			drawerCount: row.drawer_count,
		}));
	}

	const rows = conn.db
		.prepare(
			`SELECT em_r.string_value AS room,
			        em_w.string_value AS wing,
			        COUNT(DISTINCT em_r.id) AS drawer_count
			 FROM embedding_metadata em_r
			 JOIN embedding_metadata em_w ON em_w.id = em_r.id
			 JOIN embeddings e ON e.id = em_r.id
			 JOIN segments s ON e.segment_id = s.id
			 JOIN collections c ON s.collection = c.id
			 WHERE em_r.key = 'room'
			   AND em_w.key = 'wing'
			   AND c.name = ?
			 GROUP BY em_w.string_value, em_r.string_value
			 ORDER BY em_w.string_value ASC, em_r.string_value ASC`,
		)
		.all(DRAWERS_COLLECTION) as { room: string; wing: string; drawer_count: number }[];
	return rows.map((row) => ({
		id: `${row.wing}/${row.room}`,
		name: row.room,
		wingId: row.wing,
		drawerCount: row.drawer_count,
	}));
};
