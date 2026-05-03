import type { EmbeddingSummary } from "@memui/palace-types/embedding";
import type { SqliteConnection } from "./connection";

export type EmbeddingSummaryResult = EmbeddingSummary | { available: false };

const PREVIEW_WINDOW_SIZE = 16;

/**
 * Read the latest `embeddings_queue.vector` blob for a drawer and
 * compute summary stats. The queue may have been compacted away
 * (`mempalace repair --mode max-seq-id`) — return `{ available: false }`
 * in that case rather than throwing.
 */
export const getDrawerEmbeddingSummary = async (
	conn: SqliteConnection,
	embeddingId: string,
): Promise<EmbeddingSummaryResult> => {
	const row = conn.db
		.prepare(
			`SELECT eq.vector AS vector
			 FROM embeddings_queue eq
			 JOIN embeddings e ON eq.id = e.embedding_id
			 WHERE e.embedding_id = ?
			 ORDER BY eq.seq_id DESC
			 LIMIT 1`,
		)
		.get(embeddingId) as { vector: Buffer | null } | undefined;

	const buf = row?.vector;
	if (!buf || buf.byteLength < 4) return { available: false };

	const dimensions = Math.floor(buf.byteLength / 4);
	// better-sqlite3 returns Buffers whose `byteOffset` may not be 4-aligned;
	// `new Float32Array(buf.buffer, buf.byteOffset, ...)` throws when that
	// happens. Copying through a fresh Buffer guarantees an aligned view.
	const copy = Buffer.from(buf);
	const view = new Float32Array(copy.buffer, copy.byteOffset, dimensions);

	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	let sumSquares = 0;
	for (let i = 0; i < dimensions; i++) {
		const v = view[i] ?? 0;
		if (v < min) min = v;
		if (v > max) max = v;
		sumSquares += v * v;
	}
	const norm = Math.sqrt(sumSquares);
	const preview: ReadonlyArray<number> = Array.from(view.slice(0, PREVIEW_WINDOW_SIZE));

	return {
		dimensions,
		norm,
		min,
		max,
		preview,
	};
};
