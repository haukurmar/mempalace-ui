## ADDED Requirements

### Requirement: Token package as single source of design truth
The system SHALL ship a `packages/design-tokens` package that exports color, spacing, typography, radii, shadow, and motion tokens both as TypeScript modules and as CSS custom properties consumable by Tailwind.

#### Scenario: TS and CSS surfaces stay in sync
- **WHEN** a token value changes in the source TS module
- **THEN** the CSS custom properties update on the next build
- **AND** Tailwind's theme reflects the new value
- **AND** both surfaces are generated from the same source of truth

#### Scenario: Tokens cover all visual properties
- **WHEN** a developer attempts to apply a color, spacing, radius, shadow, or motion duration
- **THEN** an appropriate token exists in the package
- **AND** raw hex codes / arbitrary numeric values are flagged by lint rules in app and package code

### Requirement: Primitive layer wraps shadcn/radix
The system SHALL place all shadcn/radix-derived components in `packages/ui/src/primitives/` and apply project tokens exclusively — never raw Tailwind arbitrary values.

#### Scenario: shadcn install path
- **WHEN** a new shadcn primitive is needed (e.g., `Dialog`)
- **THEN** the component is installed via the shadcn CLI into `packages/ui/src/primitives/`
- **AND** all hex codes, spacing values, and timing functions in the file are replaced with token references before commit

#### Scenario: Primitive used directly only inside ui package
- **WHEN** an app file imports a primitive directly (bypassing the composed layer)
- **THEN** a Biome lint rule flags the import
- **AND** the rule explains that pages should consume composed components, not primitives

### Requirement: Composed component inventory
The system SHALL provide a composed component layer at `packages/ui/src/components/` containing at minimum: `DrawerCard`, `WingPill`, `RoomTree`, `ScopeChip`, `MetadataTable`, `ResultRow`, `FilterRuleBuilder`, `CommandBar`, `KeyboardHint`, `ProvenanceFooter`, `EmptyState`, `LoadingState`, `ErrorState`, `DrawerEditor`.

#### Scenario: Inventory matches reality
- **WHEN** the build runs
- **THEN** every named composed component above exists, exports its named symbol, and has a corresponding Storybook story file

#### Scenario: New domain UI extends inventory
- **WHEN** a developer needs UI for a new concept used in 2+ places
- **THEN** they add a composed component to the inventory rather than implementing inline
- **AND** the addition includes a Storybook story

### Requirement: Pattern layer for canonical page compositions
The system SHALL provide a `packages/ui/src/patterns/` layer containing at minimum `ListDetailLayout`, `GraphPanelLayout`, and `SettingsLayout`.

#### Scenario: New pages adopt a pattern
- **WHEN** a new page is created
- **THEN** it uses an existing pattern as its layout shell
- **AND** does not reinvent grid/flex structure inline

### Requirement: Density modes via data attribute
The system SHALL support comfortable, compact, and dense density modes toggled via a `data-density` attribute on `<html>`, with tokens responding to the attribute.

#### Scenario: User toggles density
- **WHEN** the user picks "Compact" in settings
- **THEN** `data-density="compact"` is applied to `<html>`
- **AND** spacing tokens shrink visibly across the entire UI
- **AND** the choice persists across sessions in localStorage

### Requirement: Storybook coverage with state matrix
The system SHALL maintain a Storybook story per composed component covering empty, loading, error, and success states.

#### Scenario: Build fails on missing stories
- **WHEN** a composed component is added without a corresponding `.stories.tsx`
- **THEN** the build or a precommit check fails with a clear message identifying the missing story

#### Scenario: Visual regression on stories
- **WHEN** CI runs
- **THEN** Playwright + Storybook test-runner produces snapshots for every story
- **AND** unintended visual changes block merge until acknowledged
