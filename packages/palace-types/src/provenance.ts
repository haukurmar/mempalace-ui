/**
 * How a drawer entered the palace.
 *
 * Canonical taxonomy modes:
 *   - `manual`    — hand-authored via UI or CLI
 *   - `auto`      — typical `mempalace mine` flow
 *   - `imported`  — bulk ingest from another palace or external dump
 *   - `synthetic` — LLM-generated content (summaries, hypotheticals)
 *
 * Live `added_by` values seen on the v3.3.4 dataset:
 *   - `mempalace`  — written by the CLI `mempalace mine` pipeline
 *   - `mcp`        — written by the MCP server during a tool call
 *
 * `unknown` is the safe fallback when the source string is not
 * recognized; the original string can still be inspected on the raw
 * metadata record (`metadata.added_by`).
 */
export type MiningMode =
	| "manual"
	| "auto"
	| "imported"
	| "synthetic"
	| "mempalace"
	| "mcp"
	| "unknown";

/**
 * Created/updated timestamps + the on-disk source the drawer was mined
 * from. Live mining data carries `source_file` (absolute path) and
 * `filed_at` (ISO 8601). `updatedAt` is absent until the drawer is
 * curated through MCP, since first-mining only writes `filed_at`.
 *
 * Timestamps are ISO 8601 strings (not `Date`) because they cross the
 * server-function boundary as JSON.
 */
export type Provenance = {
	readonly createdAt: string;
	readonly updatedAt?: string;
	readonly sourcePath: string;
	readonly miningMode: MiningMode;
};
