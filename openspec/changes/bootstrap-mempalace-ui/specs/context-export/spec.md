## ADDED Requirements

### Requirement: Selection-aware export from any view
The system SHALL allow exporting the current selection (one or many drawers) from browse, search, or graph views as a single artifact.

#### Scenario: Export from browse table
- **WHEN** the user has selected ten drawers in a room overview
- **AND** clicks "Export selection"
- **THEN** an export dialog appears offering markdown and JSON formats
- **AND** the dialog shows the selection count and total estimated size

#### Scenario: Export from search results
- **WHEN** the user selects results in a search view
- **AND** invokes export
- **THEN** the same export dialog appears with the same options
- **AND** the export reflects the search-result selection only

### Requirement: Markdown context bundle format
The system SHALL produce a markdown export that begins with a brief header (timestamp, source palace, drawer count) followed by each drawer rendered as a labeled section.

#### Scenario: Single-drawer markdown export
- **WHEN** the user exports one drawer as markdown
- **THEN** the output begins with a header section listing source palace, wing, room, drawer id, timestamp
- **AND** the drawer content follows verbatim under a `## Drawer 1` heading

#### Scenario: Multi-drawer markdown export
- **WHEN** the user exports five drawers
- **THEN** the output is a single markdown document with one header
- **AND** drawers appear in selection order under `## Drawer 1` … `## Drawer 5`
- **AND** each drawer section includes its individual provenance line

### Requirement: JSON export format
The system SHALL produce a JSON export containing a header object and an array of drawer objects with full chromadb records.

#### Scenario: JSON shape
- **WHEN** the user exports a selection as JSON
- **THEN** the output is `{ exportedAt: <ISO>, palace: <path>, drawers: [<DrawerRecord>, ...] }`
- **AND** each `DrawerRecord` includes id, content, metadata, embeddings summary, closets, and tunnels

### Requirement: Copy-to-clipboard and download
The system SHALL offer both "Copy to clipboard" and "Download file" for every export, defaulting to copy.

#### Scenario: Copy primary action
- **WHEN** the export dialog opens
- **THEN** "Copy to clipboard" is the focused primary button
- **AND** the secondary action is "Download .md" or "Download .json" depending on format

#### Scenario: Copy succeeds for large bundles
- **WHEN** the user copies a 50-drawer markdown export to clipboard
- **THEN** the clipboard receives the full content
- **AND** a toast confirms the copy with the byte count
