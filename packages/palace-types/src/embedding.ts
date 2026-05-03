/**
 * A drawer's embedding vector is large (768–1536 floats) so the UI never
 * loads it eagerly. The detail panel renders a *summary* — dimensionality,
 * L2 norm, min/max — and optionally a windowed slice of the raw vector
 * for inspection. The full vector is fetched on demand via a separate
 * server function.
 */
export type EmbeddingSummary = {
	dimensions: number;
	norm: number;
	min: number;
	max: number;
	model?: string;
	preview?: readonly number[];
};
