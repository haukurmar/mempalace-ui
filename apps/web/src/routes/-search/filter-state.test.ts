import type { WhereClause } from "@memui/ui/components";
import { describe, expect, it } from "vitest";
import { parseFiltersParam, stringifyFiltersParam } from "./filter-state";

/**
 * Pin structural fidelity through `stringify → parse`. The readonly-ness
 * loss across `JSON.parse` is fine; what matters is that the where-clause
 * shape (operators, arrays, nested $and/$or) survives the round trip.
 */
describe("parseFiltersParam — round trip", () => {
	it("returns null for empty input", () => {
		expect(parseFiltersParam(undefined)).toBeNull();
		expect(parseFiltersParam("")).toBeNull();
	});

	it("preserves a bare-scalar field clause", () => {
		const where: WhereClause = { wing: "code" };
		const stringified = stringifyFiltersParam(where);
		expect(stringified).toBeDefined();
		const parsed = parseFiltersParam(stringified);
		expect(parsed).toEqual(where);
	});

	it("preserves an $in array clause", () => {
		const where: WhereClause = { wing: { $in: ["code", "docs"] } };
		const stringified = stringifyFiltersParam(where);
		const parsed = parseFiltersParam(stringified);
		expect(parsed).toEqual(where);
		// Array preserved as a plain array.
		const wingClause = (parsed as { wing: { $in: string[] } }).wing;
		expect(Array.isArray(wingClause.$in)).toBe(true);
		expect(wingClause.$in).toEqual(["code", "docs"]);
	});

	it("preserves a nested compound $and / $eq clause", () => {
		const where: WhereClause = {
			$and: [{ wing: "code" }, { added_by: { $eq: "manual" } }],
		};
		const stringified = stringifyFiltersParam(where);
		const parsed = parseFiltersParam(stringified);
		expect(parsed).toEqual(where);
	});

	it("returns null for malformed JSON without throwing", () => {
		expect(parseFiltersParam("{not json")).toBeNull();
		expect(parseFiltersParam("[]")).toBeNull();
		expect(parseFiltersParam("null")).toBeNull();
		expect(parseFiltersParam("42")).toBeNull();
	});
});
