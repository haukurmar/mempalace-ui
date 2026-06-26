import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqliteConnection } from "./connection";
import { listGraphNodes } from "./graph";

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

type NodeSeed = {
	id: number;
	embeddingId: string;
	createdAt: string;
	wing?: string;
	room?: string;
	filedAt?: string;
	document?: string;
	clusterIdInt?: number;
	clusterIdFloat?: number;
};

const seedNode = (conn: SqliteConnection, node: NodeSeed): void => {
	conn.db
		.prepare(
			"INSERT INTO embeddings (id, embedding_id, segment_id, created_at) VALUES (?, ?, ?, ?)",
		)
		.run(node.id, node.embeddingId, "seg1", node.createdAt);
	const insertString = conn.db.prepare(
		"INSERT INTO embedding_metadata (id, key, string_value) VALUES (?, ?, ?)",
	);
	if (node.wing !== undefined) insertString.run(node.id, "wing", node.wing);
	if (node.room !== undefined) insertString.run(node.id, "room", node.room);
	if (node.filedAt !== undefined) insertString.run(node.id, "filed_at", node.filedAt);
	if (node.document !== undefined) insertString.run(node.id, "chroma:document", node.document);
	if (node.clusterIdInt !== undefined) {
		conn.db
			.prepare("INSERT INTO embedding_metadata (id, key, int_value) VALUES (?, ?, ?)")
			.run(node.id, "clusterId", node.clusterIdInt);
	}
	if (node.clusterIdFloat !== undefined) {
		conn.db
			.prepare("INSERT INTO embedding_metadata (id, key, float_value) VALUES (?, ?, ?)")
			.run(node.id, "clusterId", node.clusterIdFloat);
	}
};

describe("listGraphNodes", () => {
	let conn: SqliteConnection;

	beforeEach(() => {
		conn = buildTestDb();
	});

	afterEach(() => {
		conn.dispose();
	});

	it("returns columnar parallel arrays of equal length", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_code_general_a",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
			filedAt: "2026-04-09T01:08:01.154544",
			document: "hello world",
		});
		seedNode(conn, {
			id: 2,
			embeddingId: "drawer_docs_api_b",
			createdAt: "2026-01-02 00:00:00",
			wing: "docs",
			room: "api",
			filedAt: "2026-04-10T01:08:01.000000",
			document: "a longer body here",
		});

		const nodes = await listGraphNodes(conn);

		expect(nodes.count).toBe(2);
		expect(nodes.ids).toHaveLength(2);
		expect(nodes.wing).toHaveLength(2);
		expect(nodes.room).toHaveLength(2);
		expect(nodes.createdAt).toHaveLength(2);
		expect(nodes.size).toHaveLength(2);
		expect(nodes.clusterId).toHaveLength(2);

		// Ordered by e.id ASC, so index 0 is drawer 1.
		expect(nodes.ids[0]).toBe("drawer_code_general_a");
		expect(nodes.wing[0]).toBe("code");
		expect(nodes.room[0]).toBe("general");
		expect(nodes.size[0]).toBe("hello world".length);
		expect(nodes.size[1]).toBe("a longer body here".length);
	});

	it("emits clusterId as all null when the key is absent on every drawer", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_code_general_a",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
		});
		seedNode(conn, {
			id: 2,
			embeddingId: "drawer_code_general_b",
			createdAt: "2026-01-02 00:00:00",
			wing: "code",
			room: "general",
		});

		const nodes = await listGraphNodes(conn);

		expect(nodes.count).toBe(2);
		expect(nodes.clusterId).toEqual([null, null]);
	});

	it("surfaces a precomputed integer clusterId when present", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_code_general_a",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
			clusterIdInt: 7,
		});

		const nodes = await listGraphNodes(conn);
		expect(nodes.clusterId[0]).toBe(7);
	});

	it("derives recency from filed_at as epoch ms, falling back to created_at", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_filed",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
			filedAt: "2026-04-09T01:08:01.154544",
		});
		seedNode(conn, {
			id: 2,
			embeddingId: "drawer_nofiled",
			createdAt: "2026-02-01 00:00:00",
			wing: "code",
			room: "general",
		});

		const nodes = await listGraphNodes(conn);
		expect(nodes.createdAt[0]).toBe(Date.parse("2026-04-09T01:08:01.154544"));
		expect(nodes.createdAt[1]).toBe(Date.parse("2026-02-01 00:00:00"));
	});

	it("does not drop drawers missing wing/room — coerces to empty string", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_orphan",
			createdAt: "2026-01-01 00:00:00",
			document: "no placement",
		});

		const nodes = await listGraphNodes(conn);
		expect(nodes.count).toBe(1);
		expect(nodes.wing[0]).toBe("");
		expect(nodes.room[0]).toBe("");
		expect(nodes.size[0]).toBe("no placement".length);
	});

	it("defaults size to 0 when the document body is absent", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_nodoc",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
		});

		const nodes = await listGraphNodes(conn);
		expect(nodes.size[0]).toBe(0);
	});

	it("restricts to a single wing when the wing filter is supplied", async () => {
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_code_a",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
		});
		seedNode(conn, {
			id: 2,
			embeddingId: "drawer_docs_b",
			createdAt: "2026-01-02 00:00:00",
			wing: "docs",
			room: "general",
		});

		const nodes = await listGraphNodes(conn, { wing: "docs" });
		expect(nodes.count).toBe(1);
		expect(nodes.ids[0]).toBe("drawer_docs_b");
		expect(nodes.wing[0]).toBe("docs");
	});

	it("returns an empty columnar result when the collection has no drawers", async () => {
		const nodes = await listGraphNodes(conn);
		expect(nodes.count).toBe(0);
		expect(nodes.ids).toEqual([]);
		expect(nodes.clusterId).toEqual([]);
	});

	it("ignores embeddings outside the drawers collection", async () => {
		conn.db
			.prepare("INSERT INTO collections (id, name) VALUES (?, ?)")
			.run("c2", "mempalace_closets");
		conn.db.prepare("INSERT INTO segments (id, collection) VALUES (?, ?)").run("seg2", "c2");
		conn.db
			.prepare(
				"INSERT INTO embeddings (id, embedding_id, segment_id, created_at) VALUES (?, ?, ?, ?)",
			)
			.run(99, "closet_x", "seg2", "2026-01-01 00:00:00");
		seedNode(conn, {
			id: 1,
			embeddingId: "drawer_code_a",
			createdAt: "2026-01-01 00:00:00",
			wing: "code",
			room: "general",
		});

		const nodes = await listGraphNodes(conn);
		expect(nodes.count).toBe(1);
		expect(nodes.ids[0]).toBe("drawer_code_a");
	});
});
