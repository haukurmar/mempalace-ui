import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqliteConnection } from "./connection";
import { getDrawersMetadata } from "./metadata";

const buildTestDb = (): SqliteConnection => {
	const db = new Database(":memory:");
	db.exec(`
		CREATE TABLE collections (id TEXT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE segments (id TEXT PRIMARY KEY, collection TEXT NOT NULL);
		CREATE TABLE embeddings (
			id INTEGER PRIMARY KEY,
			embedding_id TEXT NOT NULL,
			segment_id TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
		CREATE TABLE embedding_metadata (
			id INTEGER NOT NULL,
			key TEXT NOT NULL,
			string_value TEXT,
			int_value INTEGER,
			float_value REAL,
			bool_value INTEGER
		);
	`);
	db.prepare("INSERT INTO collections (id, name) VALUES (?, ?)").run("c1", "mempalace_drawers");
	db.prepare("INSERT INTO segments (id, collection) VALUES (?, ?)").run("seg1", "c1");
	return {
		db,
		palacePath: ":memory:",
		schemaVersion: 10,
		dispose: () => db.close(),
	};
};

const seedRow = (
	conn: SqliteConnection,
	id: number,
	embeddingId: string,
	createdAt: string,
): void => {
	conn.db
		.prepare(
			"INSERT INTO embeddings (id, embedding_id, segment_id, created_at) VALUES (?, ?, ?, ?)",
		)
		.run(id, embeddingId, "seg1", createdAt);
};

const seedString = (conn: SqliteConnection, id: number, key: string, value: string) => {
	conn.db
		.prepare("INSERT INTO embedding_metadata (id, key, string_value) VALUES (?, ?, ?)")
		.run(id, key, value);
};

const seedInt = (conn: SqliteConnection, id: number, key: string, value: number) => {
	conn.db
		.prepare("INSERT INTO embedding_metadata (id, key, int_value) VALUES (?, ?, ?)")
		.run(id, key, value);
};

const seedFloat = (conn: SqliteConnection, id: number, key: string, value: number) => {
	conn.db
		.prepare("INSERT INTO embedding_metadata (id, key, float_value) VALUES (?, ?, ?)")
		.run(id, key, value);
};

const seedBool = (conn: SqliteConnection, id: number, key: string, value: boolean) => {
	conn.db
		.prepare("INSERT INTO embedding_metadata (id, key, bool_value) VALUES (?, ?, ?)")
		.run(id, key, value ? 1 : 0);
};

describe("getDrawersMetadata", () => {
	let conn: SqliteConnection;

	beforeEach(() => {
		conn = buildTestDb();
	});

	afterEach(() => {
		conn.dispose();
	});

	it("returns an empty map for an empty input", async () => {
		const result = await getDrawersMetadata(conn, []);
		expect(result.size).toBe(0);
	});

	it("returns metadata pivoted into JS-typed values", async () => {
		seedRow(conn, 1, "drawer_a", "2026-01-01T00:00:00Z");
		seedString(conn, 1, "wing", "code");
		seedString(conn, 1, "room", "general");
		seedInt(conn, 1, "bytes", 500);
		seedFloat(conn, 1, "score", 0.42);
		seedBool(conn, 1, "archived", false);

		const result = await getDrawersMetadata(conn, ["drawer_a"]);
		const record = result.get("drawer_a");
		expect(record).toBeDefined();
		expect(record?.wing).toBe("code");
		expect(record?.room).toBe("general");
		expect(record?.bytes).toBe(500);
		expect(record?.score).toBeCloseTo(0.42);
		expect(record?.archived).toBe(false);
	});

	it("skips chroma:document (large body, not used by filters)", async () => {
		seedRow(conn, 1, "drawer_a", "2026-01-01T00:00:00Z");
		seedString(conn, 1, "wing", "code");
		seedString(conn, 1, "chroma:document", "a very long document body...");

		const result = await getDrawersMetadata(conn, ["drawer_a"]);
		const record = result.get("drawer_a");
		expect(record?.wing).toBe("code");
		expect(record).not.toHaveProperty("chroma:document");
	});

	it("omits ids that don't exist (does not throw)", async () => {
		seedRow(conn, 1, "drawer_a", "2026-01-01T00:00:00Z");
		seedString(conn, 1, "wing", "code");

		const result = await getDrawersMetadata(conn, ["drawer_a", "drawer_missing"]);
		expect(result.has("drawer_a")).toBe(true);
		expect(result.has("drawer_missing")).toBe(false);
	});

	it("returns empty map when no drawer segments exist", async () => {
		conn.db.exec("DELETE FROM segments");
		const result = await getDrawersMetadata(conn, ["drawer_a"]);
		expect(result.size).toBe(0);
	});

	it("hydrates many drawers in one call", async () => {
		seedRow(conn, 1, "drawer_a", "2026-01-01T00:00:00Z");
		seedString(conn, 1, "wing", "code");
		seedRow(conn, 2, "drawer_b", "2026-01-02T00:00:00Z");
		seedString(conn, 2, "wing", "docs");
		seedRow(conn, 3, "drawer_c", "2026-01-03T00:00:00Z");
		seedString(conn, 3, "wing", "research");

		const result = await getDrawersMetadata(conn, ["drawer_a", "drawer_b", "drawer_c"]);
		expect(result.size).toBe(3);
		expect(result.get("drawer_a")?.wing).toBe("code");
		expect(result.get("drawer_b")?.wing).toBe("docs");
		expect(result.get("drawer_c")?.wing).toBe("research");
	});
});
