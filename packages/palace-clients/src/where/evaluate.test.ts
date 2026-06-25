import type { MetadataRecord } from "@memui/palace-types/metadata";
import type { WhereClause } from "@memui/palace-types/where";
import { describe, expect, it } from "vitest";
import { evaluateWhere } from "./evaluate";

const record = (overrides: Partial<MetadataRecord> = {}): MetadataRecord => ({
	wing: "code",
	room: "general",
	bytes: 500,
	archived: false,
	filed_at: "2026-01-15",
	...overrides,
});

describe("evaluateWhere — operator matrix", () => {
	it("$eq matches when field equals literal", () => {
		expect(evaluateWhere({ wing: { $eq: "code" } }, record())).toBe(true);
	});

	it("$eq fails when field differs", () => {
		expect(evaluateWhere({ wing: { $eq: "docs" } }, record())).toBe(false);
	});

	it("$eq fails on type mismatch (chromadb does not cross-coerce)", () => {
		expect(evaluateWhere({ bytes: { $eq: "500" } }, record())).toBe(false);
	});

	it("$ne matches when field differs", () => {
		expect(evaluateWhere({ wing: { $ne: "docs" } }, record())).toBe(true);
	});

	it("$ne fails when field equals", () => {
		expect(evaluateWhere({ wing: { $ne: "code" } }, record())).toBe(false);
	});

	it("$ne matches on type mismatch (number stored vs string operand)", () => {
		// chromadb does not cross-coerce types; operand-type-mismatch ===
		// "not equal", so $ne is satisfied. Mirrors the NOT-IN semantics of
		// `_value_criterion`: a row that doesn't share the operand's type
		// can't match the corresponding EAV column row, and therefore lives
		// in the "not in" set.
		expect(evaluateWhere({ bytes: { $ne: "500" } }, record())).toBe(true);
	});

	it("$ne matches on type mismatch (string stored vs number operand)", () => {
		expect(evaluateWhere({ wing: { $ne: 42 } }, record())).toBe(true);
	});

	it("$gt / $gte / $lt / $lte work for numbers", () => {
		expect(evaluateWhere({ bytes: { $gt: 100 } }, record())).toBe(true);
		expect(evaluateWhere({ bytes: { $gt: 500 } }, record())).toBe(false);
		expect(evaluateWhere({ bytes: { $gte: 500 } }, record())).toBe(true);
		expect(evaluateWhere({ bytes: { $lt: 1000 } }, record())).toBe(true);
		expect(evaluateWhere({ bytes: { $lte: 500 } }, record())).toBe(true);
		expect(evaluateWhere({ bytes: { $lte: 499 } }, record())).toBe(false);
	});

	it("$gt fails on string-vs-number mismatch", () => {
		expect(evaluateWhere({ bytes: { $gt: "100" } }, record())).toBe(false);
	});

	it("$gt orders strings lexically (date strings are sortable as ISO)", () => {
		expect(evaluateWhere({ filed_at: { $gt: "2026-01-01" } }, record())).toBe(true);
		expect(evaluateWhere({ filed_at: { $gt: "2026-02-01" } }, record())).toBe(false);
	});

	it("$in matches a literal in the list", () => {
		expect(evaluateWhere({ wing: { $in: ["code", "docs"] } }, record())).toBe(true);
	});

	it("$in fails when literal is absent", () => {
		expect(evaluateWhere({ wing: { $in: ["docs", "research"] } }, record())).toBe(false);
	});

	it("$in with empty array matches nothing", () => {
		expect(evaluateWhere({ wing: { $in: [] } }, record())).toBe(false);
	});

	it("$nin matches when literal is absent", () => {
		expect(evaluateWhere({ wing: { $nin: ["docs", "research"] } }, record())).toBe(true);
	});

	it("$nin fails when literal is present", () => {
		expect(evaluateWhere({ wing: { $nin: ["code", "docs"] } }, record())).toBe(false);
	});

	it("$nin with empty array matches everything (vacuous true)", () => {
		expect(evaluateWhere({ wing: { $nin: [] } }, record())).toBe(true);
	});
});

describe("evaluateWhere — boolean composition", () => {
	it("$and requires every child to pass", () => {
		const where: WhereClause = {
			$and: [{ wing: { $eq: "code" } }, { bytes: { $gt: 100 } }],
		};
		expect(evaluateWhere(where, record())).toBe(true);
	});

	it("$and fails when any child fails", () => {
		const where: WhereClause = {
			$and: [{ wing: { $eq: "code" } }, { bytes: { $lt: 100 } }],
		};
		expect(evaluateWhere(where, record())).toBe(false);
	});

	it("$or passes when any child passes", () => {
		const where: WhereClause = {
			$or: [{ wing: { $eq: "docs" } }, { bytes: { $gte: 500 } }],
		};
		expect(evaluateWhere(where, record())).toBe(true);
	});

	it("$or fails when no child passes", () => {
		const where: WhereClause = {
			$or: [{ wing: { $eq: "docs" } }, { bytes: { $lt: 100 } }],
		};
		expect(evaluateWhere(where, record())).toBe(false);
	});

	it("nests $and and $or up to depth 3", () => {
		const where: WhereClause = {
			$and: [
				{ wing: { $eq: "code" } },
				{
					$or: [
						{ bytes: { $gt: 1000 } },
						{
							$and: [{ archived: { $eq: false } }, { filed_at: { $gte: "2026-01-01" } }],
						},
					],
				},
			],
		};
		expect(evaluateWhere(where, record())).toBe(true);
	});

	it("$and with empty array is vacuously true", () => {
		expect(evaluateWhere({ $and: [] } as WhereClause, record())).toBe(true);
	});

	it("$or with empty array is false", () => {
		expect(evaluateWhere({ $or: [] } as WhereClause, record())).toBe(false);
	});
});

describe("evaluateWhere — missing field semantics", () => {
	it("$ne passes when the field is missing (chromadb NOT IN semantics)", () => {
		expect(evaluateWhere({ tags: { $ne: "archived" } }, record())).toBe(true);
	});

	it("$nin passes when the field is missing", () => {
		expect(evaluateWhere({ tags: { $nin: ["archived", "spam"] } }, record())).toBe(true);
	});

	it("$eq fails when the field is missing", () => {
		expect(evaluateWhere({ tags: { $eq: "archived" } }, record())).toBe(false);
	});

	it("$gt / $gte / $lt / $lte fail when the field is missing", () => {
		expect(evaluateWhere({ extra: { $gt: 10 } }, record())).toBe(false);
		expect(evaluateWhere({ extra: { $gte: 10 } }, record())).toBe(false);
		expect(evaluateWhere({ extra: { $lt: 10 } }, record())).toBe(false);
		expect(evaluateWhere({ extra: { $lte: 10 } }, record())).toBe(false);
	});

	it("$in fails when the field is missing", () => {
		expect(evaluateWhere({ tags: { $in: ["a", "b"] } }, record())).toBe(false);
	});
});

describe("evaluateWhere — bare-literal sugar", () => {
	it("`{ field: literal }` is treated as `{ $eq: literal }`", () => {
		expect(evaluateWhere({ wing: "code" } as WhereClause, record())).toBe(true);
		expect(evaluateWhere({ wing: "docs" } as WhereClause, record())).toBe(false);
	});
});

describe("evaluateWhere — Array.prototype.filter compatibility", () => {
	it("preserves input order when used as a predicate", () => {
		const records: MetadataRecord[] = [
			{ wing: "code", bytes: 100 },
			{ wing: "docs", bytes: 200 },
			{ wing: "code", bytes: 300 },
			{ wing: "research", bytes: 400 },
		];
		const where: WhereClause = { wing: { $eq: "code" } };
		const filtered = records.filter((r) => evaluateWhere(where, r));
		expect(filtered).toEqual([
			{ wing: "code", bytes: 100 },
			{ wing: "code", bytes: 300 },
		]);
	});
});
