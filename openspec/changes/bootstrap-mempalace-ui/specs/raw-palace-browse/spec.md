## ADDED Requirements

### Requirement: Tree explorer of palace structure
The system SHALL render a sidebar tree of the entire palace down to individual drawers, showing accurate counts at every level and supporting expand/collapse via mouse and keyboard.

#### Scenario: Tree reflects palace state
- **WHEN** the user opens the app on a palace with three wings and twenty rooms total
- **THEN** the sidebar shows all three wings and twenty rooms grouped under their wings
- **AND** each wing and room displays its drawer count

#### Scenario: Tree updates after a drawer is added
- **WHEN** a drawer is created (via the UI or via external `mempalace mine`)
- **THEN** the tree's drawer counts update without a full reload
- **AND** the new drawer appears in the room it was assigned to

#### Scenario: Keyboard expand and collapse
- **WHEN** the user navigates the tree with arrow keys and presses `Enter` on a wing or room
- **THEN** the node toggles expanded/collapsed state
- **AND** focus stays on the toggled node

### Requirement: Wing and room overview pages
The system SHALL provide a page for each wing and each room that lists drawers as a virtualized, sortable table — without requiring any filter or query.

#### Scenario: Wing overview lists drawers across all rooms
- **WHEN** the user clicks a wing in the tree
- **THEN** the page shows a virtualized table of every drawer in that wing
- **AND** columns include date, room, source, size, and snippet
- **AND** the table can be sorted by any column ascending or descending

#### Scenario: Room overview scoped to one room
- **WHEN** the user clicks a room
- **THEN** the page shows only that room's drawers
- **AND** the breadcrumb shows `Palace > <wing> > <room>`

#### Scenario: Virtualization handles a large room
- **WHEN** the user opens a room with 30,000 drawers
- **THEN** initial render completes in under 250ms
- **AND** scrolling stays at 60fps
- **AND** memory usage does not exceed 200MB

### Requirement: Raw drawer detail panel
The system SHALL show the full chromadb record for any selected drawer, including verbatim content, all metadata fields, embedding vector summary, closet pointers, tunnel partners, and provenance.

#### Scenario: All fields shown
- **WHEN** the user opens a drawer detail panel
- **THEN** the panel displays:
  - Verbatim content rendered as markdown with a "Show raw" toggle
  - Metadata fields as a collapsible JSON tree
  - Embedding summary (dimensions, norm, min/max) with a windowed view of the vector
  - Closets that reference this drawer
  - Tunnels (cross-wing links) attached to this drawer
  - Provenance: created/updated timestamps, source path, mining mode, wing/room

#### Scenario: Show raw toggle
- **WHEN** the user clicks "Show raw" on a markdown-rendered drawer
- **THEN** the panel displays the unrendered source text in a monospaced block
- **AND** clicking again returns to the rendered view

### Requirement: SQLite-direct read path for browse
The system SHALL serve all browse and detail queries from the SQLite read path without depending on `mempalace-mcp` being running.

#### Scenario: Browse works with MCP offline
- **WHEN** `mempalace-mcp` is not running
- **AND** the user navigates the tree, opens room overviews, and inspects drawer details
- **THEN** every read operation succeeds
- **AND** only write surfaces are disabled
