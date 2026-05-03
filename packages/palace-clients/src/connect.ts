import { homedir } from "node:os";
import { join } from "node:path";
import { defaultLogger, type Logger } from "./logger";
import {
	createMcpClient,
	IncompatibleMcpError,
	type McpClient,
	McpUnavailableError,
} from "./mcp-client";
import { createSqliteClient, type SqliteClient } from "./sqlite-client";

export type ConnectionStatus = {
	palacePath: string;
	sqlite: { status: "ok" } | { status: "error"; error: Error };
	mcp:
		| { status: "ok"; version: string }
		| { status: "unavailable"; reason: string }
		| { status: "incompatible"; detectedVersion: string };
	totalDrawers?: number;
	schemaVersion?: number;
};

export type Connection = {
	sqlite: SqliteClient;
	mcp: McpClient;
	status: ConnectionStatus;
	dispose: () => Promise<void>;
};

export type ConnectOpts = {
	palacePath?: string;
	mcpBinaryPath?: string;
	logger?: Logger;
};

const resolvePalacePath = (override?: string): string => {
	if (override) return override;
	const fromEnv = process.env.MEMPAL_PALACE_PATH;
	if (fromEnv && fromEnv.length > 0) return fromEnv;
	return join(homedir(), ".mempalace", "palace");
};

/**
 * Top-level orchestrator. Opens both clients, probes each, and surfaces
 * a unified status. SQLite errors are typically fatal (no palace, wrong
 * schema); MCP errors are tolerated — read paths still work.
 *
 * The mempalace-mcp version floor is enforced inside the transport; an
 * incompatible server surfaces here as `mcp.status === "incompatible"`.
 */
export const connect = async (opts: ConnectOpts = {}): Promise<Connection> => {
	const palacePath = resolvePalacePath(opts.palacePath);
	const logger = opts.logger ?? defaultLogger;

	let sqlite: SqliteClient;
	let sqliteStatus: ConnectionStatus["sqlite"];
	let totalDrawers: number | undefined;
	let schemaVersion: number | undefined;

	try {
		sqlite = createSqliteClient({ palacePath, logger });
		const s = await sqlite.getStatus();
		sqliteStatus = { status: "ok" };
		totalDrawers = s.totalDrawers;
		schemaVersion = s.schemaVersion;
	} catch (err) {
		sqliteStatus = { status: "error", error: err as Error };
		// Build a no-op SQLite client so the Connection shape stays
		// stable even when the palace is missing — every method just
		// rejects.
		sqlite = stubSqliteClient(err as Error);
	}

	const mcp = createMcpClient({
		binaryPath: opts.mcpBinaryPath,
		palacePath,
		logger,
	});

	let mcpStatus: ConnectionStatus["mcp"];
	try {
		const info = await mcp.getServerInfo();
		mcpStatus = { status: "ok", version: info.version };
	} catch (err) {
		if (err instanceof IncompatibleMcpError) {
			mcpStatus = { status: "incompatible", detectedVersion: err.detectedVersion };
		} else if (err instanceof McpUnavailableError) {
			mcpStatus = { status: "unavailable", reason: err.message };
		} else {
			mcpStatus = { status: "unavailable", reason: (err as Error).message };
		}
	}

	return {
		sqlite,
		mcp,
		status: {
			palacePath,
			sqlite: sqliteStatus,
			mcp: mcpStatus,
			totalDrawers,
			schemaVersion,
		},
		dispose: async () => {
			try {
				sqlite.dispose();
			} catch (err) {
				logger.warn?.(`[palace-clients] sqlite dispose failed: ${(err as Error).message}`);
			}
			try {
				await mcp.dispose();
			} catch (err) {
				logger.warn?.(`[palace-clients] mcp dispose failed: ${(err as Error).message}`);
			}
		},
	};
};

const stubSqliteClient = (err: Error): SqliteClient => {
	const reject = async <T>(): Promise<T> => {
		throw err;
	};
	return {
		getStatus: reject,
		getDrawer: reject,
		listDrawersByRoom: reject,
		listDrawerSummariesByRoom: reject,
		listWings: reject,
		listRooms: reject,
		getDrawerEmbeddingSummary: reject,
		dispose: () => {},
	};
};
