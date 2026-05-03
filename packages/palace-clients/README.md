## @memui/palace-clients

Node-only clients for the local MemPalace v3.3.4+ runtime. **Never import this package into browser code paths** — `better-sqlite3` is a native binding and the MCP client spawns a child process. Use it from TanStack Start server functions only.

The package exposes two clients plus a top-level `connect()` orchestrator:

- `sqliteClient` — read-only `better-sqlite3` handle over `chroma.sqlite3`. Used for the hot read paths (drawer detail, room/wing aggregations, status, embedding summaries). Opens with `readonly: true` and `busy_timeout = 5000`; never touches the journal mode (chromadb owns that).
- `mcpClient` — stdio JSON-RPC client for `mempalace-mcp`. Currently **read-only** (`mempalace_search`, `mempalace_find_tunnels`, `mempalace_get_drawer`, `mempalace_list_wings`, `mempalace_list_rooms`, `mempalace_status`, `mempalace_reconnect`). Write tools (`update`, `delete`, `add` drawer, tunnels) are deferred to a later wave — they land when the curation feature actually needs them.

---

### Subpath exports

| Subpath | What it exports |
|---------|-----------------|
| `@memui/palace-clients` | `connect`, `createSqliteClient`, `createMcpClient`, plus error classes |
| `@memui/palace-clients/sqlite-client` | `createSqliteClient`, `SqliteClient`, `IncompatiblePalaceError` |
| `@memui/palace-clients/mcp-client` | `createMcpClient`, `McpClient`, `McpUnavailableError`, `IncompatibleMcpError` |
| `@memui/palace-clients/connect` | `connect`, `Connection`, `ConnectionStatus` |

---

### Schema gate

On open, the SQLite client asserts:

- `MAX(version) FROM migrations WHERE dir = 'sysdb'` is `>= 10` (chromadb sysdb level shipped in MemPalace v3.3.4)
- `mempalace_drawers` and `mempalace_closets` collections both exist

Either failure throws `IncompatiblePalaceError` carrying the detected schema info; the caller surfaces a blocking upgrade prompt.

---

### EAV pivot note

chromadb stores drawer metadata as a row-per-key EAV table (`embedding_metadata`). The drawer's body lives at `key='chroma:document'` `string_value` — there is no separate content column. The client centralizes this pivot in `sqlite-client/eav.ts` so other modules just receive typed `Drawer` objects.

---

### Concurrency

- All reads are short prepared statements; no long transactions, no `db.transaction()` wrappers.
- After a CLI-side `mempalace mine` completes, the server orchestrator should call `mcp.reconnect()` to force the MCP server to reload its in-memory HNSW. SQL reads see fresh data immediately.

---

### Lifecycle

This package is **Node-only** — `better-sqlite3` is a native binding and the MCP client spawns a child process. Never import it from a browser bundle.

**Ownership.** A single `Connection` (returned by `connect()`) owns the long-lived `mempalace-mcp` child process and the `better-sqlite3` handle. Treat it as a process-scoped singleton in your TanStack Start server (one per Node process), not as a per-request resource.

**Disposal.** Call `connection.dispose()` exactly once before process exit (e.g. on `SIGTERM` / `SIGINT`). It is **idempotent** — repeated calls are no-ops. Internally:

- `sqlite.dispose()` closes the database handle once (subsequent calls are noops).
- `mcp.dispose()` calls `transport.close()` to shut the child gracefully, races a 2 s grace period, and escalates to `SIGKILL` against the child PID if the SDK doesn't exit in time.

Disposal failures are logged via the injected `logger` and do not throw — partial cleanup never blocks shutdown.

**Reconnect behavior.** If the MCP child exits unexpectedly, the next tool call respawns it. Reconnection is bounded: more than **3 boot/crash events within 30 s** surfaces `McpUnavailableError` instead of looping forever. A stable failure mode (e.g. binary not installed) trips the limit deterministically — restart the server to clear.

**Version gate.** The transport asserts the mempalace-mcp server reports a version `>= 3.3.4` from MCP `initialize`. Below that floor, every tool call throws `IncompatibleMcpError`; `connect()` surfaces this as `mcp.status === "incompatible"`. Pre-release versions (e.g. `3.3.4-rc.1`) compare strictly LESS than the same release, per semver §11.

**`getStatus()` cost.** The SQLite client's `getStatus()` is fast (single `COUNT(*)` query). The MCP client's `getStatus()` calls `mempalace_status` server-side and walks the full palace — it can be slow on large palaces. The SQLite path is what the connection panel should poll; reach for the MCP path only when you need the richer aggregate (closet/tunnel counts, per-wing breakdown).

**Stub fallback.** `connect()` constructs a stub `SqliteClient` if the palace can't be opened. Every method on the stub rejects with the original error, so consumers see a clear failure rather than a silent one. The MCP client is still attempted in this case so write paths and graph queries can recover independently.

**Logging.** Library code never writes to `console.*` directly. Pass a `Logger` (`{ info?, warn?, error? }`) into `connect`, `createMcpClient`, or `createSqliteClient` to route diagnostics — child-process stderr forwarding, EAV corruption warnings, dispose failures — through your server's structured-logging pipeline. Default falls back to `console`.
