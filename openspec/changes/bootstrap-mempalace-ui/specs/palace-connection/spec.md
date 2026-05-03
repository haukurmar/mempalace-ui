## ADDED Requirements

### Requirement: Local palace path resolution
The system SHALL resolve the palace root directory at startup, defaulting to `~/.mempalace/palace/` and overridable via the `MEMPAL_PALACE_PATH` environment variable.

#### Scenario: Default path used when no override
- **WHEN** the server boots without `MEMPAL_PALACE_PATH` set
- **THEN** it opens `~/.mempalace/palace/chroma.sqlite3`
- **AND** logs the resolved path at info level

#### Scenario: Environment override honored
- **WHEN** `MEMPAL_PALACE_PATH=/custom/path` is exported and the server boots
- **THEN** it opens `/custom/path/chroma.sqlite3` instead of the default
- **AND** the UI's connection panel shows the custom path

#### Scenario: Missing palace surfaced clearly
- **WHEN** the resolved path does not contain a `chroma.sqlite3`
- **THEN** the server boots successfully but reports `status: "no-palace"` via a server function
- **AND** the UI shows an actionable empty-state explaining how to point the app at a palace

### Requirement: Read-only SQLite access
The system SHALL open SQLite in read-only mode with a busy timeout so the chromadb-managed rollback journal is never modified and concurrent `mempalace mine` writers can proceed without our reads holding write locks.

#### Scenario: Read-only mode applied
- **WHEN** the SQLite handle is opened
- **THEN** the connection is opened with `readonly: true` and a 5000ms `busy_timeout`; the chromadb-managed journal mode (rollback) is not modified
- **AND** writes via this handle are not possible at the database level

#### Scenario: Concurrent mining tolerated
- **WHEN** `mempalace mine` is actively writing to the palace
- **AND** the UI issues a read query
- **THEN** the read returns a consistent snapshot without errors
- **AND** the read-only handle uses shared locks that the miner's short writes do not contend with for typical access patterns
- **AND** the UI displays an "indexing in progress" indicator until writes settle

### Requirement: MCP availability probe
The system SHALL probe the local `mempalace-mcp` process at startup, cache the connection if reachable, and continue booting (with reduced functionality) if it is not.

#### Scenario: MCP reachable
- **WHEN** the server boots and `mempalace-mcp` is on PATH and responsive
- **THEN** the server marks MCP as available
- **AND** the UI enables write actions (edit, delete, add drawer)

#### Scenario: MCP unreachable
- **WHEN** `mempalace-mcp` is not installed or not responsive
- **THEN** the server marks MCP as unavailable
- **AND** the UI shows a banner explaining MCP is offline
- **AND** every write action surface (button, menu item) is disabled with a tooltip

### Requirement: MemPalace version compatibility gate
The system SHALL refuse to operate on palace databases written by MemPalace versions older than v3.3.4 and surface a clear upgrade prompt.

#### Scenario: Compatible version
- **WHEN** the palace was last written by MemPalace v3.3.4 or newer
- **THEN** the server reports a compatible status
- **AND** the UI proceeds normally

#### Scenario: Incompatible version
- **WHEN** the palace was last written by an older MemPalace version
- **THEN** the server reports an incompatible status with the detected version
- **AND** the UI shows a blocking modal that explains the requirement and links to MemPalace upgrade documentation

### Requirement: Filesystem watch and cache invalidation
The system SHALL watch the palace directory and notify the frontend when `chroma.sqlite3` changes so cached query results invalidate automatically.

#### Scenario: External write detected
- **WHEN** `mempalace mine` completes and the palace file's mtime updates
- **THEN** the server publishes a change event via a TanStack Start streaming server function
- **AND** the frontend invalidates affected TanStack Query caches
- **AND** active views refetch transparently

#### Scenario: Watch resilient to high-frequency writes
- **WHEN** dozens of writes happen within a few seconds (e.g. during a large mine)
- **THEN** the server debounces change events to at most one per 500ms
- **AND** the UI does not thrash with rapid refetches
