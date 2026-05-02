## ADDED Requirements

### Requirement: WebGL graph rendering of palace drawers
The system SHALL render every drawer as a node in a WebGL force-directed graph capable of comfortably displaying 100,000 nodes at interactive frame rates.

#### Scenario: Full-palace render
- **WHEN** the user opens the graph view on a 87,177-drawer palace
- **THEN** all nodes render within 5 seconds
- **AND** pan and zoom maintain at least 30fps

#### Scenario: Frame-rate budget enforced
- **WHEN** the graph is interactive (panning, zooming, hovering)
- **THEN** average frame time stays under 33ms (30fps floor)
- **AND** the design includes a documented fallback to PixiJS or regl if cosmograph cannot meet this

### Requirement: Multi-wing simultaneous view with cross-tunnel highlighting
The system SHALL display drawers from multiple wings in the same canvas with visual distinction between wings, and SHALL highlight cross-wing tunnels when active.

#### Scenario: Three-wing palace shows all wings
- **WHEN** the graph view loads on a palace with three wings
- **THEN** every drawer from every wing is rendered
- **AND** wings are visually distinguished (e.g., separate clusters / hue families)

#### Scenario: Cross-wing tunnels surface
- **WHEN** "Show tunnels" mode is on
- **THEN** edges between drawers in different wings render with elevated opacity
- **AND** intra-wing edges are de-emphasized

### Requirement: Layout-as-force-tuning across three modes
The system SHALL provide three layout modes (Explode / Orbit / Cluster) that share a single underlying simulation but apply different force tunings, switchable via keys `1`, `2`, `3` without a hard relayout.

#### Scenario: Mode switch animates smoothly
- **WHEN** the user presses `2` while in Explode mode
- **THEN** the simulation transitions force parameters over a 600ms easing
- **AND** the graph reaches the Orbit configuration without nodes jumping discontinuously

#### Scenario: Mode persists across sessions
- **WHEN** the user picks Cluster mode and reloads the app
- **THEN** the graph view re-opens in Cluster mode

### Requirement: Five color modes with single keybind cycle
The system SHALL provide five color modes — Room, Recency, Size, Decay, Cluster — switchable via the `C` key cycling through them in order.

#### Scenario: Cycle through color modes
- **WHEN** the user presses `C` repeatedly
- **THEN** the color mode advances Room → Recency → Size → Decay → Cluster → Room
- **AND** a brief toast confirms the active mode

#### Scenario: Cluster mode uses precomputed IDs
- **WHEN** Cluster color mode is active
- **THEN** node colors derive from a `clusterId` metadata field that was precomputed server-side
- **AND** the UI does NOT compute clustering in the browser

### Requirement: Click-to-isolate 2-hop neighborhood
The system SHALL support clicking a node to enter a focus mode showing only that node and its 2-hop neighborhood (drawers connected via tunnels or shared closets).

#### Scenario: Focus mode entered
- **WHEN** the user clicks a drawer node
- **AND** presses `L`
- **THEN** the canvas dims all unrelated nodes and edges
- **AND** the selected node and its 2-hop neighborhood remain at full opacity
- **AND** an info panel shows the selected drawer's content and its neighbor count

#### Scenario: Exit focus mode
- **WHEN** the user presses `Esc` while in focus mode
- **THEN** the full graph returns to normal opacity
- **AND** the previously selected node remains highlighted but no longer isolated
