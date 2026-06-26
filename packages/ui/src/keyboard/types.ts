/**
 * Named scopes a keybind can belong to. "global" is always active (it sits at
 * the bottom of the scope stack); the others are pushed/popped as their owning
 * surface mounts or activates.
 */
export type ScopeName =
	| "global"
	| "tree"
	| "browse-list"
	| "search-results"
	| "drawer-panel"
	| "editor"
	| "graph"
	| "cheatsheet"
	| "palette";

export type KeybindHandler = (event: KeyboardEvent) => void;

/**
 * A single unified key binding. This is the one registry entry concept for the
 * whole app — runtime dispatch, the Cmd+K palette, and the `?` cheatsheet all
 * read from the same shape.
 *
 * Within a single spec, `+` joins keys into one chord ("mod+k", "Esc") while
 * whitespace separates ordered sequence steps that must be pressed in turn
 * ("g s" fires after "g" then "s", via a pending-prefix buffer in
 * `KeybindStore`). Passing `keys` as a `string[]` registers alternative
 * aliases that all map to the same action.
 */
export type Keybind = {
	id: string;
	keys: string | string[];
	label: string;
	scope: ScopeName;
	handler: KeybindHandler;
	/** Grouping bucket for the cheatsheet + palette (e.g. "Navigation"). */
	group?: string;
	/** Whether this binding surfaces in the Cmd+K palette. Defaults to hidden. */
	paletteVisible?: boolean;
};
