import type { RoomSummary } from "./room";
import type { WingSummary } from "./wing";

/**
 * Score components returned by `mempalace_search`. Live response
 * carries `similarity`, `distance`, `effective_distance`,
 * `closet_boost`, and `bm25_score`. We expose the two scores the UI
 * actually shows on result cards (`cosine` similarity in [0, 1] and
 * BM25 keyword score) plus the optional rerank components for power
 * users who want to debug ranking.
 */
export type SearchScores = {
	cosine?: number;
	bm25?: number;
	distance?: number;
	effectiveDistance?: number;
	closetBoost?: number;
};

/**
 * One row in the result list rendered by `ResultRow`. `snippet` is the
 * verbatim text returned by MCP (the `text` field) — already trimmed by
 * the server, never a full drawer body. `wing` and `room` are denormalized
 * onto every result so the breadcrumb can render without extra lookups.
 *
 * `drawerId` is optional because `mempalace_search` does not include drawer
 * IDs in its response shape; recovery happens in a later layer via SQL
 * lookup. Consumers that need a stable drawer reference must handle the
 * undefined case (or wait for the recovery layer to populate it).
 */
export type SearchResult = {
	drawerId?: string;
	snippet: string;
	wing: WingSummary;
	room: RoomSummary;
	scores: SearchScores;
	createdAt?: string;
	updatedAt?: string;
	matchedVia?: "drawer" | "closet" | "tunnel";
};

/**
 * The full server response wrapping a result list. Mirrors the shape of
 * `mempalace_search`: the originating query, the scope filters that were
 * applied, the unfiltered candidate count (so the UI can show "X of Y
 * results above the distance threshold"), and the result rows.
 */
export type SearchResponse = {
	query: string;
	filters: {
		wing?: string;
		room?: string;
	};
	totalBeforeFilter: number;
	results: readonly SearchResult[];
};
