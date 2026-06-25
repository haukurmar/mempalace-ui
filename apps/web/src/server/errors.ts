import type { Connection } from "@memui/palace-clients";

export class IncompatibleMcpVersionError extends Error {
	readonly detectedVersion: string | undefined;
	constructor(detectedVersion: string | undefined, message?: string) {
		super(
			message ??
				`Incompatible palace: detected MemPalace ${detectedVersion ?? "unknown"}, requires v3.3.4+`,
		);
		this.name = "IncompatibleMcpVersionError";
		this.detectedVersion = detectedVersion;
	}
}

export class PalaceUnavailableError extends Error {
	/**
	 * Optional discriminator code. The route layer reads this to render
	 * targeted UI states (e.g. `"filters_unavailable"` → the
	 * "metadata filters require SQLite" panel). Public string so it
	 * round-trips through TanStack Start's strict server-fn serializer
	 * without needing a custom `toJSON`.
	 */
	readonly code?: string;

	constructor(message: string, code?: string) {
		super(message);
		this.name = "PalaceUnavailableError";
		if (code !== undefined) this.code = code;
	}
}

export class McpUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "McpUnavailableError";
	}
}

export const assertSqliteReady = (conn: Connection): void => {
	if (conn.status.sqlite.status === "error") {
		throw new PalaceUnavailableError(
			`Palace SQLite unavailable at ${conn.status.palacePath}: ${conn.status.sqlite.error.message}`,
		);
	}
};

export const assertMcpReady = (conn: Connection): void => {
	const mcp = conn.status.mcp;
	if (mcp.status === "incompatible") {
		throw new IncompatibleMcpVersionError(mcp.detectedVersion);
	}
	if (mcp.status === "unavailable") {
		throw new McpUnavailableError(`mempalace-mcp is offline: ${mcp.reason}`);
	}
};
