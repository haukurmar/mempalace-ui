## ADDED Requirements

### Requirement: Command palette as primary action affordance
The system SHALL provide a command palette opened with `Cmd+K` (mac) / `Ctrl+K` (linux) that exposes every primary user action via fuzzy search.

#### Scenario: Open and search
- **WHEN** the user presses `Cmd+K` from any page
- **THEN** a centered modal opens with a fuzzy-search input focused
- **AND** typing filters available actions in real time

#### Scenario: Run an action
- **WHEN** the user types "delete" and presses `Enter` on the matched action
- **THEN** the action runs (with appropriate confirmations)
- **AND** the palette closes

#### Scenario: Palette closes on escape
- **WHEN** the user presses `Esc` while the palette is open
- **THEN** the palette closes without dispatching any action
- **AND** focus returns to whatever was focused before opening

### Requirement: Centralized key-binding registry
The system SHALL maintain a single registry of key bindings that components register into, with the registry being the source of truth for both runtime dispatch and the auto-generated cheatsheet.

#### Scenario: Bindings declared in one place
- **WHEN** a developer adds a new binding
- **THEN** it is registered through the registry's API (e.g., `useKeybind({ keys, label, scope, handler })`)
- **AND** the binding appears in the `?` cheatsheet automatically

#### Scenario: Scope-aware dispatch
- **WHEN** two bindings exist for the same key but different scopes (e.g., "global" vs "drawer panel open")
- **THEN** the registry dispatches to the binding whose scope is active
- **AND** documents which scope wins in the cheatsheet

### Requirement: Auto-generated `?` cheatsheet
The system SHALL render a cheatsheet of every active binding when the user presses `?`, grouping bindings by scope.

#### Scenario: Cheatsheet reflects current scopes
- **WHEN** the user presses `?` while a drawer panel is open
- **THEN** the cheatsheet shows global bindings AND drawer-panel-specific bindings
- **AND** bindings grouped under their scope headings

#### Scenario: Cheatsheet stays accurate as bindings change
- **WHEN** a new binding is added in code
- **THEN** the cheatsheet shows it on the next render without a separate documentation step

### Requirement: J/K/Enter/Esc navigation grammar
The system SHALL use `J`/`K` for next/previous in any list-like context, `Enter` to activate the focused item, and `Esc` to dismiss/close, throughout the app.

#### Scenario: List navigation
- **WHEN** focus is on a list (browse table, search results, tree)
- **AND** the user presses `J`
- **THEN** focus advances to the next item
- **AND** pressing `K` returns focus to the previous item

#### Scenario: Activation
- **WHEN** focus is on a list item
- **AND** the user presses `Enter`
- **THEN** the appropriate "open" action runs (e.g., open drawer detail)

#### Scenario: Dismiss
- **WHEN** any panel, modal, or overlay is open
- **AND** the user presses `Esc`
- **THEN** the topmost overlay closes
- **AND** focus returns to its prior location
