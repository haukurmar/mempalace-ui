// @memui/palace-clients — Node-only. Never import from a browser
// bundle: better-sqlite3 is a native binding and the MCP client
// spawns a child process. Use from TanStack Start server functions.

export type { Connection, ConnectionStatus, ConnectOpts } from "./connect";
export { connect } from "./connect";
export type { Logger } from "./logger";
export type {
	CreateMcpClientOpts,
	DrawerIdResolver,
	FindTunnelsOpts,
	ListRoomsToolOpts,
	McpClient,
	McpServerInfo,
	McpStatus,
	SearchSemanticOpts,
} from "./mcp-client";
export {
	createMcpClient,
	IncompatibleMcpError,
	McpUnavailableError,
} from "./mcp-client";
export type {
	CreateSqliteClientOpts,
	EmbeddingSummaryResult,
	FindDrawerIdByLocatorOpts,
	IncompatiblePalaceInfo,
	ListDrawerSummariesByRoomOpts,
	ListDrawerSummariesByWingOpts,
	ListDrawersByRoomOpts,
	ListRoomsOpts,
	SqliteClient,
	SqliteStatus,
} from "./sqlite-client";
export {
	createSqliteClient,
	IncompatiblePalaceError,
} from "./sqlite-client";
