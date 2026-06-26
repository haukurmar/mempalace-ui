import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqliteConnection } from "./connection";
import { findDrawerIdByLocator } from "./drawers";

/**
 * Build an in-memory chromadb-like schema with just the tables we touch
 * (`collections`, `segments`, `embeddings`, `embedding_metadata`). This
 * is intentionally minimal — we test SQL behavior, not schema parity.
 */
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

type DrawerSeed = {
	id: number;
	embeddingId: string;
	segmentId?: string;
	createdAt: string;
	wing: string;
	room: string;
	sourceFile: string;
	chunkIndex?: number;
};

const seedDrawer = (conn: SqliteConnection, drawer: DrawerSeed) => {
	conn.db
		.prepare(
			"INSERT INTO embeddings (id, embedding_id, segment_id, created_at) VALUES (?, ?, ?, ?)",
		)
		.run(drawer.id, drawer.embeddingId, drawer.segmentId ?? "seg1", drawer.createdAt);
	const insertString = conn.db.prepare(
		"INSERT INTO embedding_metadata (id, key, string_value) VALUES (?, ?, ?)",
	);
	insertString.run(drawer.id, "wing", drawer.wing);
	insertString.run(drawer.id, "room", drawer.room);
	insertString.run(drawer.id, "source_file", drawer.sourceFile);
	if (drawer.chunkIndex !== undefined) {
		conn.db
			.prepare("INSERT INTO embedding_metadata (id, key, int_value) VALUES (?, ?, ?)")
			.run(drawer.id, "chunk_index", drawer.chunkIndex);
	}
};

describe("findDrawerIdByLocator", () => {
	let conn: SqliteConnection;

	beforeEach(() => {
		conn = buildTestDb();
	});

	afterEach(() => {
		conn.dispose();
	});

	it("returns the embedding id when the locator matches one drawer", async () => {
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_aaa",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "/tmp/foo.md",
		});
		expect(result).toBe("drawer_code_general_aaa");
	});

	it("resolves a basename locator against a stored full path", async () => {
		// `mempalace_search` reports `source_file` as a bare basename, but
		// SQLite stores the full absolute path. The locator must still match.
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_sessions_technical_aaa",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "sessions",
			room: "technical",
			sourceFile: "/Users/me/.claude/projects/x/tool-results/bqhncg1rr.txt",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "sessions",
			roomId: "technical",
			sourceFile: "bqhncg1rr.txt",
		});
		expect(result).toBe("drawer_sessions_technical_aaa");
	});

	it("does not match a basename that is only a partial filename suffix", async () => {
		// A leading-slash anchor in the suffix pattern prevents `foo.md`
		// from matching a stored path ending in `barfoo.md`.
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_partial",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/barfoo.md",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "foo.md",
		});
		expect(result).toBeNull();
	});

	it("matches a basename containing a LIKE wildcard literally", async () => {
		// `_` is a LIKE wildcard; the helper escapes it so `a_b.md` does not
		// also match `axb.md`.
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_literal",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/axb.md",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "a_b.md",
		});
		expect(result).toBeNull();
	});

	it("returns null when no drawer matches", async () => {
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_aaa",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/other.md",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "/tmp/missing.md",
		});
		expect(result).toBeNull();
	});

	it("returns the chunk with the lowest chunk_index when multiple chunks share a locator", async () => {
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_chunk2",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
			chunkIndex: 2,
		});
		seedDrawer(conn, {
			id: 2,
			embeddingId: "drawer_code_general_chunk0",
			createdAt: "2026-01-01T00:01:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
			chunkIndex: 0,
		});
		seedDrawer(conn, {
			id: 3,
			embeddingId: "drawer_code_general_chunk1",
			createdAt: "2026-01-01T00:02:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
			chunkIndex: 1,
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "/tmp/foo.md",
		});
		expect(result).toBe("drawer_code_general_chunk0");
	});

	it("falls back to oldest by created_at when chunk_index is missing", async () => {
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_newer",
			createdAt: "2026-01-02T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
		});
		seedDrawer(conn, {
			id: 2,
			embeddingId: "drawer_code_general_older",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "/tmp/foo.md",
		});
		expect(result).toBe("drawer_code_general_older");
	});

	it("respects wing and room filters independently", async () => {
		seedDrawer(conn, {
			id: 1,
			embeddingId: "drawer_code_general_xyz",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "code",
			room: "general",
			sourceFile: "/tmp/foo.md",
		});
		seedDrawer(conn, {
			id: 2,
			embeddingId: "drawer_docs_general_xyz",
			createdAt: "2026-01-01T00:00:00Z",
			wing: "docs",
			room: "general",
			sourceFile: "/tmp/foo.md",
		});
		const result = await findDrawerIdByLocator(conn, {
			wingId: "docs",
			roomId: "general",
			sourceFile: "/tmp/foo.md",
		});
		expect(result).toBe("drawer_docs_general_xyz");
	});

	it("returns null when there are no drawer segments", async () => {
		// Wipe the segments to simulate a freshly opened palace before
		// the drawers collection has been provisioned.
		conn.db.exec("DELETE FROM segments");
		const result = await findDrawerIdByLocator(conn, {
			wingId: "code",
			roomId: "general",
			sourceFile: "/tmp/foo.md",
		});
		expect(result).toBeNull();
	});
});
