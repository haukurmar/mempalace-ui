import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { defaultLogger, type Logger } from "../logger";
import { compareSemver, InvalidSemverError } from "../util/semver";

const CLIENT_INFO = { name: "@memui/palace-clients", version: "0.0.0" };
const RECONNECT_WINDOW_MS = 30_000;
const RECONNECT_LIMIT = 3;
const KILL_GRACE_MS = 2000;
const KILL_FOLLOWUP_MS = 1000;

/** The minimum mempalace-mcp server version this package supports. */
export const REQUIRED_MCP_VERSION = "3.3.4";

export class McpUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "McpUnavailableError";
	}
}

export class IncompatibleMcpError extends Error {
	readonly detectedVersion: string;
	constructor(message: string, detectedVersion: string) {
		super(message);
		this.name = "IncompatibleMcpError";
		this.detectedVersion = detectedVersion;
	}
}

export type McpServerInfo = {
	name: string;
	version: string;
};

export type McpTransportOpts = {
	binaryPath?: string;
	palacePath?: string;
	logger?: Logger;
};

type Bound = {
	client: Client;
	transport: StdioClientTransport;
	serverInfo: McpServerInfo;
};

export type McpTransport = {
	getClient: () => Promise<Client>;
	getServerInfo: () => Promise<McpServerInfo>;
	dispose: () => Promise<void>;
};

const DEFAULT_BINARY = "mempalace-mcp";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lazy stdio transport for `mempalace-mcp`. The child process is
 * spawned on first call. Bounded reconnect: if 3 boots/crashes occur
 * within a 30s window, surface `McpUnavailableError` instead of
 * looping forever. The version gate is enforced at boot time —
 * servers older than `REQUIRED_MCP_VERSION` cause `IncompatibleMcpError`
 * to bubble out of any tool call.
 */
export const createMcpTransport = (opts: McpTransportOpts = {}): McpTransport => {
	const binary = opts.binaryPath ?? DEFAULT_BINARY;
	const palaceArgs = opts.palacePath ? ["--palace", opts.palacePath] : [];
	const logger = opts.logger ?? defaultLogger;

	let bound: Bound | null = null;
	let bootInProgress: Promise<Bound> | null = null;
	let disposed = false;
	const eventTimestamps: number[] = [];

	const trackEvent = (now: number): void => {
		while (eventTimestamps.length > 0 && now - (eventTimestamps[0] ?? 0) > RECONNECT_WINDOW_MS) {
			eventTimestamps.shift();
		}
		eventTimestamps.push(now);
	};

	const overReconnectLimit = (now: number): boolean => {
		while (eventTimestamps.length > 0 && now - (eventTimestamps[0] ?? 0) > RECONNECT_WINDOW_MS) {
			eventTimestamps.shift();
		}
		return eventTimestamps.length >= RECONNECT_LIMIT;
	};

	const boot = async (): Promise<Bound> => {
		if (overReconnectLimit(Date.now())) {
			throw new McpUnavailableError(
				`mempalace-mcp restarted ${RECONNECT_LIMIT} times within ${RECONNECT_WINDOW_MS}ms; giving up.`,
			);
		}

		const transport = new StdioClientTransport({
			command: binary,
			args: palaceArgs,
			stderr: "pipe",
		});
		const client = new Client(CLIENT_INFO, {
			capabilities: {},
		});

		// Surface child stderr without crashing — useful for debugging
		// MCP server problems while keeping the parent process alive.
		const stderr = transport.stderr;
		if (stderr) {
			stderr.on("data", (chunk: Buffer | string) => {
				const line = typeof chunk === "string" ? chunk : chunk.toString("utf8");
				if (line.trim().length > 0) {
					logger.warn?.(`[mempalace-mcp] ${line.trimEnd()}`);
				}
			});
		}

		transport.onclose = () => {
			if (bound?.transport === transport) {
				bound = null;
			}
			// Crash close (not intentional dispose). Track the timestamp
			// so a server that crashes on initialize doesn't get
			// respawned forever.
			if (!disposed) trackEvent(Date.now());
		};
		transport.onerror = (err) => {
			logger.warn?.(`[mempalace-mcp] transport error: ${err.message}`);
		};

		try {
			await client.connect(transport);
		} catch (err) {
			trackEvent(Date.now());
			throw new McpUnavailableError(
				`Failed to spawn or initialize mempalace-mcp at "${binary}": ${(err as Error).message}`,
			);
		}

		const info = client.getServerVersion();
		const serverInfo: McpServerInfo = {
			name: info?.name ?? "mempalace-mcp",
			version: info?.version ?? "0.0.0",
		};

		try {
			if (compareSemver(serverInfo.version, REQUIRED_MCP_VERSION) < 0) {
				await transport.close().catch(() => {});
				throw new IncompatibleMcpError(
					`mempalace-mcp ${serverInfo.version} is below the required ${REQUIRED_MCP_VERSION} floor.`,
					serverInfo.version,
				);
			}
		} catch (err) {
			if (err instanceof IncompatibleMcpError) throw err;
			if (err instanceof InvalidSemverError) {
				await transport.close().catch(() => {});
				throw new IncompatibleMcpError(
					`mempalace-mcp reported an unparseable version "${serverInfo.version}".`,
					serverInfo.version,
				);
			}
			throw err;
		}

		const next: Bound = { client, transport, serverInfo };
		bound = next;
		return next;
	};

	const ensure = async (): Promise<Bound> => {
		if (disposed) {
			throw new McpUnavailableError("mempalace-mcp transport has been disposed.");
		}
		if (bound) return bound;
		if (bootInProgress) return bootInProgress;
		// Pre-flight: surface the same unavailable error users would see
		// inside boot() so callers don't pay for a spawn attempt.
		if (overReconnectLimit(Date.now())) {
			throw new McpUnavailableError(
				`mempalace-mcp restarted ${RECONNECT_LIMIT} times within ${RECONNECT_WINDOW_MS}ms; giving up.`,
			);
		}
		bootInProgress = boot().finally(() => {
			bootInProgress = null;
		});
		return bootInProgress;
	};

	const dispose = async (): Promise<void> => {
		disposed = true;
		const current = bound;
		bound = null;
		if (!current) return;
		const pid = current.transport.pid;
		const closePromise = current.transport.close().catch(() => {});
		const graceWon = await Promise.race<boolean>([
			closePromise.then(() => true),
			sleep(KILL_GRACE_MS).then(() => false),
		]);
		if (graceWon) return;
		// SDK didn't exit within KILL_GRACE_MS; escalate to SIGKILL via the
		// child PID exposed by StdioClientTransport.
		if (typeof pid === "number") {
			try {
				process.kill(pid, "SIGKILL");
			} catch {
				// already gone — fine.
			}
		}
		await sleep(KILL_FOLLOWUP_MS);
	};

	return {
		getClient: async () => (await ensure()).client,
		getServerInfo: async () => (await ensure()).serverInfo,
		dispose,
	};
};
