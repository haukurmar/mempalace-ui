## ADDED Requirements

### Requirement: Always-available semantic search
The system SHALL provide a top-level search input accessible from any view via mouse click or `Cmd+K` (mac) / `Ctrl+K` (linux) keyboard shortcut.

#### Scenario: Keyboard shortcut focuses search
- **WHEN** the user is on any page and presses `Cmd+K`
- **THEN** the search input receives focus
- **AND** any text the user types appears in the input

#### Scenario: Search dispatches to MCP
- **WHEN** the user submits a search query
- **THEN** the server calls `mempalace_search` via MCP with the query and current wing scope
- **AND** results return within 2 seconds for a 87K-drawer palace
- **AND** a loading state is shown for any latency above 200ms

### Requirement: Result cards with relevance scoring
The system SHALL display search results as cards showing snippet, wing/room breadcrumb, date, and both cosine and BM25 relevance scores.

#### Scenario: Both scores visible
- **WHEN** results render
- **THEN** each card shows `cosine=<value>` and `bm25=<value>` with two decimals of precision
- **AND** cards are ordered by combined relevance descending

#### Scenario: Click result opens detail panel
- **WHEN** the user clicks a result card
- **THEN** the drawer detail panel opens with the full chromadb record
- **AND** the source page (browse / graph) gains a "back to results" affordance

### Requirement: Visual metadata filter rule builder
The system SHALL provide a visual filter UI supporting AND/OR groups over arbitrary metadata fields with type-aware operators (string, number, date, boolean).

#### Scenario: Add a filter rule
- **WHEN** the user clicks "Add filter"
- **AND** selects a metadata field, an operator, and a value
- **THEN** the rule is added to the current group
- **AND** the result list updates immediately

#### Scenario: Group rules with AND/OR
- **WHEN** the user has two rules in the root group
- **AND** toggles the group operator from AND to OR
- **THEN** the result list reflects the new boolean composition
- **AND** the rule chip shows the active operator

#### Scenario: Round-trip with chromadb where syntax
- **WHEN** the user composes a complex filter in the UI
- **AND** clicks "Copy as where clause"
- **THEN** the clipboard receives a valid chromadb `$and`/`$or` JSON expression
- **AND** pasting that expression into the UI's "Import filter" rebuilds the equivalent rule tree

### Requirement: Per-wing persistent query history
The system SHALL persist the last 20 queries per wing locally and expose them as one-click re-run options.

#### Scenario: Recent queries listed
- **WHEN** the user focuses the search input and the input is empty
- **THEN** a dropdown shows the last 20 queries for the current wing
- **AND** entries display query text and timestamp

#### Scenario: One-click re-run
- **WHEN** the user clicks a history entry
- **THEN** the input populates with the historical query and submits immediately
- **AND** the entry's timestamp updates to reflect the re-run

#### Scenario: History scoped per wing
- **WHEN** the user switches the active wing scope
- **THEN** the history dropdown shows entries for the new wing only
- **AND** the previous wing's history remains intact and reappears when its scope is reselected
