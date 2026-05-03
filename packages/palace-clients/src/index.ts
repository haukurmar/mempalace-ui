// @memui/palace-clients — Node-only. Never import from a browser
// bundle: better-sqlite3 is a native binding and the MCP client
// spawns a child process. Use from TanStack Start server functions.

export { connect } from "./connect";
export type { Connection, ConnectionStatus, ConnectOpts } from "./connect";
export type { Logger } from "./logger";
export {
	createMcpClient,
	IncompatibleMcpError,
	McpUnavailableError,
} from "./mcp-client";
export type {
	CreateMcpClientOpts,
	FindTunnelsOpts,
	ListRoomsToolOpts,
	McpClient,
	McpServerInfo,
	McpStatus,
	SearchSemanticOpts,
} from "./mcp-client";
export {
	createSqliteClient,
	IncompatiblePalaceError,
} from "./sqlite-client";
export type {
	CreateSqliteClientOpts,
	EmbeddingSummaryResult,
	IncompatiblePalaceInfo,
	ListDrawerSummariesByRoomOpts,
	ListDrawerSummariesByWingOpts,
	ListDrawersByRoomOpts,
	ListRoomsOpts,
	SqliteClient,
	SqliteStatus,
} from "./sqlite-client";
