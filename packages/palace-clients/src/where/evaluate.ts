import type { MetadataRecord, MetadataValue } from "@memui/palace-types/metadata";
import type { LiteralValue, WhereClause } from "@memui/palace-types/where";

/**
 * Pure JS evaluator for chromadb 1.5.8 `where` clauses. Mirrors the
 * semantics of the local SQLite segment's `_value_criterion` helper
 * (chromadb/db/sqlite.py L688-L723) so that the post-filter step in
 * `searchSemantic` returns the same rows chromadb itself would return
 * if MemPalace had passed the clause upstream.
 *
 * Used as a fallback while `mempalace_search` does not accept a `where`
 * arg (see `util/capabilities.ts`). Once that lands, this evaluator can
 * stay as a useful library function for any future feature that wants
 * to filter an in-memory metadata collection — but the search code path
 * will short-circuit to upstream filtering.
 */

const isLogicalKey = (key: string): key is "$and" | "$or" => key === "$and" || key === "$or";

const isOperatorKey = (
	key: string,
): key is "$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte" | "$in" | "$nin" =>
	key === "$eq" ||
	key === "$ne" ||
	key === "$gt" ||
	key === "$gte" ||
	key === "$lt" ||
	key === "$lte" ||
	key === "$in" ||
	key === "$nin";

const isLiteral = (v: unknown): v is LiteralValue =>
	typeof v === "string" || typeof v === "number" || typeof v === "boolean";

/**
 * Compare two literals. chromadb does NOT cross-coerce `"42"` and `42`
 * — string vs number returns no match for `$eq` and false for the
 * numeric comparators. We mirror that by returning `null` for any
 * mixed-type pair, and let callers translate `null` to the operator's
 * "no match" answer.
 */
const cmp = (lhs: MetadataValue, rhs: LiteralValue): number | null => {
	if (typeof lhs === "number" && typeof rhs === "number") {
		if (lhs < rhs) return -1;
		if (lhs > rhs) return 1;
		return 0;
	}
	if (typeof lhs === "string" && typeof rhs === "string") {
		if (lhs < rhs) return -1;
		if (lhs > rhs) return 1;
		return 0;
	}
	if (typeof lhs === "boolean" && typeof rhs === "boolean") {
		return lhs === rhs ? 0 : lhs ? 1 : -1;
	}
	return null;
};

const eq = (lhs: MetadataValue, rhs: LiteralValue): boolean => {
	// Same chromadb rule as `cmp` — strict-equal across types only.
	if (typeof lhs === "number" && typeof rhs === "number") return lhs === rhs;
	if (typeof lhs === "string" && typeof rhs === "string") return lhs === rhs;
	if (typeof lhs === "boolean" && typeof rhs === "boolean") return lhs === rhs;
	return false;
};

const evaluateOperator = (op: string, value: unknown, lhs: MetadataValue | undefined): boolean => {
	// Missing-field semantics follow chromadb's `_value_criterion` (which
	// uses `NOT IN`): rows missing the metadata key SATISFY `$ne` and
	// `$nin`, and FAIL every other operator. Mirror that exactly so the
	// post-filter result set matches what chromadb would return.
	const present = lhs !== undefined;

	if (op === "$eq") {
		if (!present || !isLiteral(value)) return false;
		return eq(lhs, value);
	}
	if (op === "$ne") {
		if (!isLiteral(value)) return false;
		if (!present) return true;
		return !eq(lhs, value);
	}
	if (op === "$gt" || op === "$gte" || op === "$lt" || op === "$lte") {
		if (!present || !isLiteral(value) || lhs === null) return false;
		const c = cmp(lhs, value);
		if (c === null) return false;
		if (op === "$gt") return c > 0;
		if (op === "$gte") return c >= 0;
		if (op === "$lt") return c < 0;
		return c <= 0;
	}
	if (op === "$in") {
		// Empty `$in` matches nothing — validator should have rejected
		// this case but the evaluator must remain total.
		if (!Array.isArray(value)) return false;
		if (value.length === 0) return false;
		if (!present) return false;
		for (const candidate of value) {
			if (isLiteral(candidate) && eq(lhs, candidate)) return true;
		}
		return false;
	}
	if (op === "$nin") {
		// Empty `$nin` matches everything (vacuous true). Missing field
		// also satisfies — same NOT IN reasoning as `$ne`.
		if (!Array.isArray(value)) return false;
		if (!present) return true;
		if (value.length === 0) return true;
		for (const candidate of value) {
			if (isLiteral(candidate) && eq(lhs, candidate)) return false;
		}
		return true;
	}
	// Unknown operator — fail closed rather than pretend.
	return false;
};

export const evaluateWhere = (where: WhereClause, record: MetadataRecord): boolean => {
	const keys = Object.keys(where);
	if (keys.length === 0) {
		// chromadb itself rejects `{}`; treat it as vacuous true so a
		// stray empty clause does not nuke every row.
		return true;
	}
	if (keys.length > 1) {
		// Multi-key dicts are invalid in chromadb's grammar — wrap with
		// `$and` to compose. Defensive: treat as $and so we don't
		// silently drop later keys.
		for (const key of keys) {
			if (!evaluateWhere({ [key]: (where as Record<string, unknown>)[key] } as WhereClause, record))
				return false;
		}
		return true;
	}

	const key = keys[0] as string;
	const value = (where as Record<string, unknown>)[key];

	if (isLogicalKey(key)) {
		if (!Array.isArray(value)) return false;
		if (key === "$and") {
			// Empty `$and` is vacuously true — validator should reject
			// before we get here, but stay total.
			if (value.length === 0) return true;
			for (const child of value) {
				if (!evaluateWhere(child as WhereClause, record)) return false;
			}
			return true;
		}
		// $or
		if (value.length === 0) return false;
		for (const child of value) {
			if (evaluateWhere(child as WhereClause, record)) return true;
		}
		return false;
	}

	// Field key. Two valid shapes per chromadb:
	//   1. `{ field: { $op: literal } }` — explicit operator dict.
	//   2. `{ field: literal }`           — sugar for `{ $eq: literal }`.
	const lhs = record[key];

	if (isLiteral(value)) {
		return evaluateOperator("$eq", value, lhs);
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const opEntries = Object.entries(value as Record<string, unknown>);
	if (opEntries.length === 0) return false;
	// Per chromadb, the operator dict is single-key; multi-key dicts are
	// invalid input. Same defensive reasoning as multi-key field dicts.
	for (const [op, opValue] of opEntries) {
		if (!isOperatorKey(op)) return false;
		if (!evaluateOperator(op, opValue, lhs)) return false;
	}
	return true;
};
