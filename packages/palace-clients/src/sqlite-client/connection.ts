import { join } from "node:path";
import Database from "better-sqlite3";

export type SqliteConnection = {
	db: Database.Database;
	palacePath: string;
	schemaVersion: number;
	dispose: () => void;
};

export type IncompatiblePalaceInfo = {
	palacePath: string;
	schemaVersion: number;
	hasDrawersCollection: boolean;
	hasClosetsCollection: boolean;
	openErrorCode?: string;
};

export class IncompatiblePalaceError extends Error {
	readonly info: IncompatiblePalaceInfo;
	constructor(message: string, info: IncompatiblePalaceInfo) {
		super(message);
		this.name = "IncompatiblePalaceError";
		this.info = info;
	}
}

const REQUIRED_SYSDB_VERSION = 10;
const REQUIRED_COLLECTIONS = ["mempalace_drawers", "mempalace_closets"] as const;

const isSqliteErrorCode = (err: unknown): string | undefined => {
	if (err === null || typeof err !== "object") return undefined;
	const code = (err as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
};

/**
 * Open a read-only handle on `<palacePath>/chroma.sqlite3`, apply a 5s
 * busy timeout, and assert the v3.3.4+ schema gate before returning.
 * Throws `IncompatiblePalaceError` when the file is missing, locked,
 * not a database, or when the sysdb migration level / expected
 * collections don't match.
 */
export const createSqliteConnection = (palacePath: string): SqliteConnection => {
	const dbPath = join(palacePath, "chroma.sqlite3");
	let db: Database.Database;
	try {
		db = new Database(dbPath, { readonly: true, fileMustExist: true });
	} catch (err) {
		const code = isSqliteErrorCode(err);
		if (code === "SQLITE_CANTOPEN" || code === "SQLITE_NOTADB" || code === "SQLITE_BUSY") {
			throw new IncompatiblePalaceError(
				`Could not open palace at ${palacePath} (${code ?? "unknown"}): ${(err as Error).message}`,
				{
					palacePath,
					schemaVersion: 0,
					hasDrawersCollection: false,
					hasClosetsCollection: false,
					openErrorCode: code,
				},
			);
		}
		throw err;
	}
	db.pragma("busy_timeout = 5000");

	const versionRow = db
		.prepare("SELECT MAX(version) AS v FROM migrations WHERE dir = 'sysdb'")
		.get() as { v: number | null } | undefined;
	const schemaVersion = versionRow?.v ?? 0;

	const collectionRow = db
		.prepare(
			"SELECT COUNT(*) AS n FROM collections WHERE name IN ('mempalace_drawers', 'mempalace_closets')",
		)
		.get() as { n: number } | undefined;
	const collectionCount = collectionRow?.n ?? 0;

	if (schemaVersion < REQUIRED_SYSDB_VERSION || collectionCount !== REQUIRED_COLLECTIONS.length) {
		const drawersRow = db
			.prepare("SELECT COUNT(*) AS n FROM collections WHERE name = 'mempalace_drawers'")
			.get() as { n: number } | undefined;
		const closetsRow = db
			.prepare("SELECT COUNT(*) AS n FROM collections WHERE name = 'mempalace_closets'")
			.get() as { n: number } | undefined;
		const info: IncompatiblePalaceInfo = {
			palacePath,
			schemaVersion,
			hasDrawersCollection: (drawersRow?.n ?? 0) > 0,
			hasClosetsCollection: (closetsRow?.n ?? 0) > 0,
		};
		db.close();
		throw new IncompatiblePalaceError(
			`Palace at ${palacePath} is not MemPalace v3.3.4+ compatible (sysdb=${schemaVersion}, collections=${collectionCount}).`,
			info,
		);
	}

	let closed = false;
	return {
		db,
		palacePath,
		schemaVersion,
		dispose: () => {
			if (closed) return;
			closed = true;
			db.close();
		},
	};
};
