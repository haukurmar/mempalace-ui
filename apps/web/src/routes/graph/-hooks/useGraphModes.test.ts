import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphColorMode } from "../-renderer/GraphRenderer";
import {
	COLOR_KEY,
	COLOR_MODE_ORDER,
	isColorMode,
	isLayoutMode,
	nextColorMode,
	persist,
	readPersisted,
	readPersistedBool,
	TUNNEL_HIGHLIGHT_DEFAULT,
	TUNNEL_KEY,
} from "./graphModes";

// Minimal in-memory localStorage so the persistence helpers can be exercised in
// the node test env (which has no window/localStorage of its own).
const createStorage = (seed: Record<string, string> = {}) => {
	const store = new Map<string, string>(Object.entries(seed));
	return {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, value);
		},
	};
};

const stubWindow = (seed?: Record<string, string>): ReturnType<typeof createStorage> => {
	const localStorage = createStorage(seed);
	vi.stubGlobal("window", { localStorage });
	return localStorage;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("readPersisted", () => {
	it("falls back to the default when nothing is stored", () => {
		stubWindow();
		expect(readPersisted(COLOR_KEY, isColorMode, "room")).toBe("room");
	});

	it("restores a valid stored value", () => {
		stubWindow({ [COLOR_KEY]: "recency" });
		expect(readPersisted(COLOR_KEY, isColorMode, "room")).toBe("recency");
	});

	it("rejects a garbage stored value and falls back", () => {
		stubWindow({ [COLOR_KEY]: "not-a-real-mode" });
		expect(readPersisted(COLOR_KEY, isColorMode, "room")).toBe("room");
	});

	it("returns the fallback when window is undefined (SSR guard)", () => {
		vi.stubGlobal("window", undefined);
		expect(readPersisted(COLOR_KEY, isColorMode, "size")).toBe("size");
	});
});

describe("readPersistedBool / persist round-trip", () => {
	it("uses the default when nothing is stored", () => {
		stubWindow();
		expect(readPersistedBool(TUNNEL_KEY, TUNNEL_HIGHLIGHT_DEFAULT)).toBe(true);
	});

	it("persists and restores true/false as the canonical strings", () => {
		const storage = stubWindow();

		persist(TUNNEL_KEY, String(false));
		expect(storage.getItem(TUNNEL_KEY)).toBe("false");
		expect(readPersistedBool(TUNNEL_KEY, true)).toBe(false);

		persist(TUNNEL_KEY, String(true));
		expect(storage.getItem(TUNNEL_KEY)).toBe("true");
		expect(readPersistedBool(TUNNEL_KEY, false)).toBe(true);
	});

	it("returns the fallback when window is undefined (SSR guard)", () => {
		vi.stubGlobal("window", undefined);
		expect(readPersistedBool(TUNNEL_KEY, true)).toBe(true);
	});

	it("no-ops without throwing on persist when window is undefined (SSR guard)", () => {
		vi.stubGlobal("window", undefined);
		expect(() => persist(COLOR_KEY, "recency")).not.toThrow();
	});
});

describe("nextColorMode", () => {
	it("advances through the fixed order", () => {
		expect(nextColorMode("room")).toBe("recency");
		expect(nextColorMode("recency")).toBe("size");
		expect(nextColorMode("size")).toBe("decay");
		expect(nextColorMode("decay")).toBe("cluster");
	});

	it("wraps cluster → room", () => {
		expect(nextColorMode("cluster")).toBe("room");
	});

	it("cycles through every mode and returns to the start", () => {
		let mode: GraphColorMode = "room";
		for (let i = 0; i < COLOR_MODE_ORDER.length; i++) mode = nextColorMode(mode);
		expect(mode).toBe("room");
	});
});

describe("mode guards", () => {
	it("validate color + layout modes and reject garbage", () => {
		expect(isColorMode("cluster")).toBe(true);
		expect(isColorMode("bogus")).toBe(false);
		expect(isColorMode(null)).toBe(false);
		expect(isLayoutMode("orbit")).toBe(true);
		expect(isLayoutMode("nope")).toBe(false);
	});
});
