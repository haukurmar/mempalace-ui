## ADDED Requirements

### Requirement: 0–100 palace health score with weighted deductions
The system SHALL compute and display a 0–100 palace health score derived from weighted deductions for critical, warning, and info findings.

#### Scenario: Score visible on dashboard
- **WHEN** the user opens the dashboard
- **THEN** the health score renders as a colored bar (green/yellow/red bands)
- **AND** the numeric score is shown with breakdown by severity

#### Scenario: Deduction weights documented
- **WHEN** the score is computed
- **THEN** each severity tier has a documented deduction (critical: -15 each, warning: -8 each, info: -3 each, capped at 0)
- **AND** the deduction values are accessible in the design system tokens or constants

### Requirement: Structural finding categories
The system SHALL detect and surface at minimum these finding categories: orphan rooms (rooms with no drawers), near-duplicate drawers (cosine > 0.95), stale wings (no writes in 90+ days), and broken closet pointers (closets referencing missing drawers).

#### Scenario: Orphan room detected
- **WHEN** a room exists in the schema but contains zero drawers
- **THEN** the dashboard surfaces a warning finding identifying the room
- **AND** the finding includes a one-click filter that scopes the browse view to that room

#### Scenario: Near-duplicate detected
- **WHEN** two drawers in the same room have cosine similarity above 0.95
- **THEN** a warning finding lists the pair with both drawer ids and a similarity score
- **AND** clicking the finding opens a comparison view showing both drawers side-by-side

#### Scenario: Stale wing detected
- **WHEN** a wing has had no drawer writes in the past 90 days
- **THEN** an info finding identifies the wing and the date of its last write

#### Scenario: Broken closet pointer detected
- **WHEN** a closet record references a drawer id that no longer exists in the palace
- **THEN** a critical finding surfaces with the closet id and the missing drawer id

### Requirement: Findings are clickable into filtered views
The system SHALL make every finding clickable, with clicks navigating to a pre-filtered view that scopes the UI to the finding's subject.

#### Scenario: Filter applied on click
- **WHEN** the user clicks an "orphan room" finding
- **THEN** the browse view opens scoped to that room
- **AND** the active filter chip shows the source finding for context

### Requirement: Health computation runs on demand and on a schedule
The system SHALL recompute the health score on demand (via a "Refresh" button) and automatically once per app session shortly after boot.

#### Scenario: Initial computation
- **WHEN** the app boots
- **THEN** the health score begins computation within 30 seconds
- **AND** the dashboard shows a "computing" state until results land

#### Scenario: Manual refresh
- **WHEN** the user clicks "Refresh health"
- **THEN** computation re-runs immediately
- **AND** the new score replaces the previous one when complete
