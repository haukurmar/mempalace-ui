/**
 * Single source of truth for the `where` clause AST. The shape mirrors
 * chromadb 1.5.8's native `where` JSON grammar 1:1, so the AST can be
 * serialized straight onto the wire the day MemPalace exposes `where` on
 * `mempalace_search`. Until then, `@memui/palace-clients` evaluates this
 * tree client-side as a post-filter step.
 *
 * Grammar reference: chromadb/api/types.py + chromadb/db/sqlite.py (the
 * `_value_criterion` / `_where_to_sql` helpers). See also
 * `packages/palace-clients/src/where/evaluate.ts` for the JS evaluator
 * that mirrors those semantics.
 */

/**
 * Operators are constrained to the chromadb 1.5.8 `where` grammar.
 * The local SQLite segment does NOT implement `$contains`, `$startsWith`,
 * `$endsWith`, or `$not`, so they are deliberately absent. Adding
 * client-only operators here would silently break the day MemPalace
 * adopts upstream `where` — keep parity with chromadb.
 */
export type Operator = "$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte" | "$in" | "$nin";

export type LogicalOperator = "$and" | "$or";

/** Scalar operands accepted by the field-level operators. */
export type LiteralValue = string | number | boolean;

/**
 * A leaf rule in the editor tree. The `id` is editor-only state; the AST
 * shape that travels to chromadb is produced by `toWhereClause` in
 * `@memui/ui`.
 */
export type Rule = {
	id: string;
	field: string;
	operator: Operator;
	value: LiteralValue | readonly LiteralValue[];
};

/** A grouping node in the editor tree. */
export type RuleGroup = {
	id: string;
	op: LogicalOperator;
	children: ReadonlyArray<Rule | RuleGroup>;
};

/**
 * The chromadb-shaped `where` clause. Single-key dicts at every level —
 * the key is either a logical operator (`$and` / `$or`) or a metadata
 * field name. Bare scalars at field keys are sugar for `{ $eq: scalar }`.
 *
 * `$and` and `$or` arrays must contain ≥2 children to satisfy chromadb's
 * own validator; the editor enforces this via `toWhereClause` collapsing
 * single-child groups.
 */
export type WhereClause =
	| { readonly [field: string]: { readonly [op: string]: unknown } | LiteralValue }
	| { readonly $and: readonly WhereClause[] }
	| { readonly $or: readonly WhereClause[] };
