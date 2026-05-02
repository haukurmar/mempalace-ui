## ADDED Requirements

### Requirement: Inline drawer edit with markdown preview
The system SHALL allow editing a drawer's content inline via a markdown editor with live preview, persisting changes through the MCP `mempalace_update_drawer` tool.

#### Scenario: Edit and save
- **WHEN** the user opens a drawer and clicks "Edit"
- **AND** modifies the content
- **AND** clicks "Save"
- **THEN** the server calls `mempalace_update_drawer` with the new content
- **AND** the drawer detail panel shows the updated content
- **AND** the wing/room counts in the tree remain unchanged

#### Scenario: Cancel edit discards changes
- **WHEN** the user is editing a drawer
- **AND** clicks "Cancel" or presses `Esc`
- **THEN** the editor closes without persisting changes
- **AND** the drawer's content remains unchanged

#### Scenario: Edit blocked when MCP offline
- **WHEN** `mempalace-mcp` is not available
- **THEN** the "Edit" button is disabled with a tooltip explaining MCP must be running
- **AND** no edit attempt is made

### Requirement: Single-drawer delete with confirmation
The system SHALL support deleting a drawer through MCP after a confirmation step.

#### Scenario: Confirmation required
- **WHEN** the user clicks "Delete" on a drawer
- **THEN** a confirmation modal appears showing the drawer's snippet and source
- **AND** deletion proceeds only when the user explicitly confirms

#### Scenario: Successful delete updates UI
- **WHEN** the user confirms a delete
- **THEN** `mempalace_delete_drawer` is called via MCP
- **AND** the drawer disappears from all current views (tree, table, graph, search)
- **AND** drawer counts in the tree decrement

### Requirement: Bulk select and bulk move
The system SHALL allow shift-clicking and `Cmd+Click` to select multiple drawers across browse and search views, then bulk-move the selection between rooms or wings.

#### Scenario: Multi-select via shift-click
- **WHEN** the user clicks a row, then shift-clicks a row twenty rows away
- **THEN** all rows in the inclusive range are selected
- **AND** a selection toolbar appears showing the selection count

#### Scenario: Bulk move
- **WHEN** the user selects fifty drawers and chooses "Move to..."
- **AND** picks a target wing/room
- **THEN** a confirmation modal shows the selection count and target
- **AND** confirming triggers MCP updates for each drawer
- **AND** progress feedback is shown during the operation
- **AND** the selection clears once all moves succeed

#### Scenario: Bulk operation resilience
- **WHEN** a bulk operation hits a partial failure (e.g., MCP timeout on drawer 27 of 50)
- **THEN** the failure is surfaced clearly with the failing drawer's identity
- **AND** successful operations are not rolled back
- **AND** the user can retry just the failed subset

### Requirement: Per-drawer change-log metadata
The system SHALL append a minimal change-log entry to a drawer's metadata on every edit or move, recording timestamp, action, and a human-readable summary.

#### Scenario: Edit appends a log entry
- **WHEN** a drawer is edited
- **THEN** its `history` metadata field gains an entry like `{ at: <ISO>, action: "edit", summary: "<diff summary>" }`
- **AND** prior entries are preserved

#### Scenario: History visible in detail panel
- **WHEN** the user opens a drawer with a non-empty history
- **THEN** the detail panel shows a "History" section listing every entry in reverse chronological order
- **AND** each entry shows action and timestamp
