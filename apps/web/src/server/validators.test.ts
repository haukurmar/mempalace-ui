import { describe, expect, it } from "vitest";
import {
	validateFindTunnels,
	validateGetDrawer,
	validateGetDrawerEmbeddingSummary,
	validateListDrawersByRoom,
	validateListRooms,
	validateSearchSemantic,
} from "./validators";

describe("validateListRooms", () => {
	it("accepts undefined", () => {
		expect(validateListRooms(undefined)).toEqual({});
	});
	it("forwards wingId", () => {
		expect(validateListRooms({ wingId: "code" })).toEqual({ wingId: "code" });
	});
	it("rejects non-string wingId", () => {
		expect(() => validateListRooms({ wingId: 42 })).toThrow();
	});
});

describe("validateListDrawersByRoom", () => {
	it("requires wingId", () => {
		expect(() => validateListDrawersByRoom({})).toThrow();
	});
	it("accepts pagination", () => {
		const out = validateListDrawersByRoom({
			wingId: "code",
			roomId: "general",
			limit: 10,
			offset: 0,
		});
		expect(out).toEqual({ wingId: "code", roomId: "general", limit: 10, offset: 0 });
	});
	it("rejects limit < 1", () => {
		expect(() => validateListDrawersByRoom({ wingId: "code", limit: 0 })).toThrow(TypeError);
	});
	it("rejects non-integer limit", () => {
		expect(() => validateListDrawersByRoom({ wingId: "code", limit: 1.5 })).toThrow(TypeError);
	});
	it("rejects negative offset", () => {
		expect(() => validateListDrawersByRoom({ wingId: "code", offset: -1 })).toThrow(TypeError);
	});
});

describe("validateGetDrawer", () => {
	it("requires non-empty id", () => {
		expect(() => validateGetDrawer({ id: "" })).toThrow();
	});
});

describe("validateGetDrawerEmbeddingSummary", () => {
	it("requires non-empty id", () => {
		expect(() => validateGetDrawerEmbeddingSummary({ id: "" })).toThrow();
		expect(() => validateGetDrawerEmbeddingSummary({})).toThrow();
		expect(() => validateGetDrawerEmbeddingSummary({ id: 42 })).toThrow();
	});
	it("returns parsed input on valid", () => {
		expect(validateGetDrawerEmbeddingSummary({ id: "abc" })).toEqual({ id: "abc" });
	});
});

describe("validateSearchSemantic", () => {
	it("requires query", () => {
		expect(() => validateSearchSemantic({})).toThrow();
	});
	it("forwards optional fields", () => {
		expect(
			validateSearchSemantic({
				query: "hi",
				limit: 5,
				wing: "code",
				room: "general",
				maxDistance: 0.4,
			}),
		).toEqual({
			query: "hi",
			limit: 5,
			wing: "code",
			room: "general",
			maxDistance: 0.4,
		});
	});
	it("rejects limit < 1", () => {
		expect(() => validateSearchSemantic({ query: "hi", limit: 0 })).toThrow(TypeError);
	});
	it("rejects negative maxDistance", () => {
		expect(() => validateSearchSemantic({ query: "hi", maxDistance: -0.1 })).toThrow(TypeError);
	});
	it("rejects maxDistance > 2", () => {
		expect(() => validateSearchSemantic({ query: "hi", maxDistance: 2.5 })).toThrow(TypeError);
	});
	it("forwards a where-clause object verbatim", () => {
		const where = { wing: { $eq: "code" } };
		expect(validateSearchSemantic({ query: "hi", where })).toEqual({ query: "hi", where });
	});
	it("rejects a non-object where", () => {
		expect(() => validateSearchSemantic({ query: "hi", where: "string" })).toThrow(TypeError);
		expect(() => validateSearchSemantic({ query: "hi", where: [] })).toThrow(TypeError);
	});
	it("forwards overfetchFactor in [1,5]", () => {
		expect(validateSearchSemantic({ query: "hi", overfetchFactor: 4 })).toEqual({
			query: "hi",
			overfetchFactor: 4,
		});
	});
	it("rejects overfetchFactor outside [1,5]", () => {
		expect(() => validateSearchSemantic({ query: "hi", overfetchFactor: 0 })).toThrow(TypeError);
		expect(() => validateSearchSemantic({ query: "hi", overfetchFactor: 6 })).toThrow(TypeError);
	});
});

describe("validateFindTunnels", () => {
	it("accepts undefined", () => {
		expect(validateFindTunnels(undefined)).toEqual({});
	});
	it("forwards wing filters", () => {
		expect(validateFindTunnels({ wingA: "code", wingB: "ml" })).toEqual({
			wingA: "code",
			wingB: "ml",
		});
	});
});
