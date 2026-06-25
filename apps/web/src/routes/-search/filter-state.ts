import type { FieldDefinition, Group, WhereClause } from "@memui/ui/components";
import { fromWhereClause } from "@memui/ui/components";

export const SEARCH_FILTER_FIELDS: FieldDefinition[] = [
	{ name: "wing", label: "Wing", type: "string" },
	{ name: "room", label: "Room", type: "string" },
	{ name: "source_file", label: "Source file", type: "string" },
	{ name: "added_by", label: "Mining mode", type: "string" },
	{ name: "filed_at", label: "Filed at", type: "date" },
];

const isObject = (v: unknown): v is Record<string, unknown> =>
	v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Parse a `filters` URL search-param. We accept the JSON-stringified
 * chromadb where-clause that the FilterRuleBuilder emits via
 * `toWhereClause`. Malformed JSON or shapes outside the where-clause
 * grammar fall back to `null` so the caller can surface a clean
 * "no filters" state instead of crashing.
 */
export const parseFiltersParam = (raw: string | undefined): WhereClause | null => {
	if (!raw || raw.length === 0) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!isObject(parsed)) return null;
		return parsed as WhereClause;
	} catch {
		return null;
	}
};

export const stringifyFiltersParam = (where: WhereClause | null): string | undefined => {
	if (!where) return undefined;
	const json = JSON.stringify(where);
	if (json === "{}" || json === '""') return undefined;
	return json;
};

/**
 * Build the FilterRuleBuilder's controlled `Group` state from a raw URL
 * filter param. Returns `null` when the param is empty, so the caller
 * can fall back to the builder's empty-tree state.
 */
export const groupFromFiltersParam = (raw: string | undefined): Group | null => {
	const where = parseFiltersParam(raw);
	if (!where) return null;
	try {
		return fromWhereClause(where as never);
	} catch {
		return null;
	}
};
