import type {
	FindTunnelsInput,
	GetDrawerEmbeddingSummaryInput,
	GetDrawerInput,
	ListDrawerSummariesByRoomInput,
	ListDrawerSummariesByWingInput,
	ListDrawersByRoomInput,
	ListRoomsInput,
	SearchSemanticInput,
} from "./handlers";

const isObject = (v: unknown): v is Record<string, unknown> =>
	v !== null && typeof v === "object" && !Array.isArray(v);

const optString = (v: unknown, name: string): string | undefined => {
	if (v === undefined) return undefined;
	if (typeof v !== "string") throw new TypeError(`${name} must be a string`);
	return v;
};

const optPositiveInt = (v: unknown, name: string): number | undefined => {
	if (v === undefined) return undefined;
	if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
		throw new TypeError(`${name} must be a positive integer`);
	}
	return v;
};

const optNonNegativeInt = (v: unknown, name: string): number | undefined => {
	if (v === undefined) return undefined;
	if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
		throw new TypeError(`${name} must be a non-negative integer`);
	}
	return v;
};

const optBoundedNumber = (
	v: unknown,
	name: string,
	min: number,
	max: number,
): number | undefined => {
	if (v === undefined) return undefined;
	if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
		throw new TypeError(`${name} must be a finite number in [${min}, ${max}]`);
	}
	return v;
};

const reqString = (v: unknown, name: string): string => {
	if (typeof v !== "string" || v.length === 0) {
		throw new TypeError(`${name} is required and must be a non-empty string`);
	}
	return v;
};

export const validateListRooms = (raw: unknown): ListRoomsInput => {
	if (raw === undefined) return {};
	if (!isObject(raw)) throw new TypeError("listRooms input must be an object");
	const out: ListRoomsInput = {};
	const wingId = optString(raw.wingId, "wingId");
	if (wingId !== undefined) out.wingId = wingId;
	return out;
};

export const validateListDrawersByRoom = (raw: unknown): ListDrawersByRoomInput => {
	if (!isObject(raw)) throw new TypeError("listDrawersByRoom input must be an object");
	const wingId = reqString(raw.wingId, "wingId");
	const out: ListDrawersByRoomInput = { wingId };
	const roomId = optString(raw.roomId, "roomId");
	if (roomId !== undefined) out.roomId = roomId;
	const limit = optPositiveInt(raw.limit, "limit");
	if (limit !== undefined) out.limit = limit;
	const offset = optNonNegativeInt(raw.offset, "offset");
	if (offset !== undefined) out.offset = offset;
	return out;
};

export const validateListDrawerSummariesByRoom = (raw: unknown): ListDrawerSummariesByRoomInput => {
	if (!isObject(raw)) throw new TypeError("listDrawerSummariesByRoom input must be an object");
	const wingId = reqString(raw.wingId, "wingId");
	const out: ListDrawerSummariesByRoomInput = { wingId };
	const roomId = optString(raw.roomId, "roomId");
	if (roomId !== undefined) out.roomId = roomId;
	const limit = optPositiveInt(raw.limit, "limit");
	if (limit !== undefined) out.limit = limit;
	const offset = optNonNegativeInt(raw.offset, "offset");
	if (offset !== undefined) out.offset = offset;
	return out;
};

export const validateListDrawerSummariesByWing = (raw: unknown): ListDrawerSummariesByWingInput => {
	if (!isObject(raw)) throw new TypeError("listDrawerSummariesByWing input must be an object");
	const wingId = reqString(raw.wingId, "wingId");
	const out: ListDrawerSummariesByWingInput = { wingId };
	const limit = optPositiveInt(raw.limit, "limit");
	if (limit !== undefined) out.limit = limit;
	const offset = optNonNegativeInt(raw.offset, "offset");
	if (offset !== undefined) out.offset = offset;
	return out;
};

export const validateGetDrawer = (raw: unknown): GetDrawerInput => {
	if (!isObject(raw)) throw new TypeError("getDrawer input must be an object");
	return { id: reqString(raw.id, "id") };
};

export const validateGetDrawerEmbeddingSummary = (raw: unknown): GetDrawerEmbeddingSummaryInput => {
	if (!isObject(raw)) throw new TypeError("getDrawerEmbeddingSummary input must be an object");
	return { id: reqString(raw.id, "id") };
};

export const validateSearchSemantic = (raw: unknown): SearchSemanticInput => {
	if (!isObject(raw)) throw new TypeError("searchSemantic input must be an object");
	const query = reqString(raw.query, "query");
	const out: SearchSemanticInput = { query };
	const limit = optPositiveInt(raw.limit, "limit");
	if (limit !== undefined) out.limit = limit;
	const wing = optString(raw.wing, "wing");
	if (wing !== undefined) out.wing = wing;
	const room = optString(raw.room, "room");
	if (room !== undefined) out.room = room;
	const maxDistance = optBoundedNumber(raw.maxDistance, "maxDistance", 0, 2);
	if (maxDistance !== undefined) out.maxDistance = maxDistance;
	return out;
};

export const validateFindTunnels = (raw: unknown): FindTunnelsInput => {
	if (raw === undefined) return {};
	if (!isObject(raw)) throw new TypeError("findTunnels input must be an object");
	const out: FindTunnelsInput = {};
	const wingA = optString(raw.wingA, "wingA");
	if (wingA !== undefined) out.wingA = wingA;
	const wingB = optString(raw.wingB, "wingB");
	if (wingB !== undefined) out.wingB = wingB;
	return out;
};
