import { type FC, useCallback, useMemo, useState } from "react";
import { KeyboardHint } from "../components/keyboard-hint";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../primitives/dialog";
import type { Keybind, ScopeName } from "./types";
import { useKeybind } from "./useKeybind";
import { useKeybindSnapshot } from "./useKeybindSnapshot";
import { useScope } from "./useScope";

const SCOPE_LABELS: Record<ScopeName, string> = {
	global: "Global",
	tree: "Room tree",
	"browse-list": "Browse list",
	"search-results": "Search results",
	"drawer-panel": "Drawer panel",
	editor: "Editor",
	graph: "Graph view",
	cheatsheet: "Shortcuts",
	palette: "Command palette",
};

/** Turn a single chord into display tokens (e.g. "mod+k" → ["Cmd", "K"]). */
const chordTokens = (chord: string): string[] =>
	chord.split("+").map((token) => {
		const lower = token.toLowerCase();
		if (lower === "mod" || lower === "cmd" || lower === "command") return "Cmd";
		if (lower === "ctrl" || lower === "control") return "Ctrl";
		return token.length === 1 ? token.toUpperCase() : token;
	});

/**
 * Render the primary key spec of a binding as display tokens for
 * `KeyboardHint`. A space-separated sequence renders as ordered per-step tokens
 * (e.g. "g s" → ["G", "S"]) rather than a single opaque cap; a chord still
 * renders as ["Cmd", "K"].
 */
const chordToTokens = (keys: string | string[]): string[] => {
	const first = Array.isArray(keys) ? keys[0] : keys;
	if (!first) return [];
	return first
		.split(/\s+/)
		.filter((step) => step.length > 0)
		.flatMap((step) => chordTokens(step));
};

type CheatsheetSectionData = {
	scope: ScopeName;
	binds: Keybind[];
};

/**
 * Bucket the active bindings under their scope, in stack order (Global first).
 * Only scopes that are currently active contribute a section, so the cheatsheet
 * reflects the live context rather than every binding that could ever exist.
 */
const groupByActiveScope = (
	keybinds: Keybind[],
	scopeStack: ScopeName[],
): CheatsheetSectionData[] => {
	const sections: CheatsheetSectionData[] = [];
	const seen = new Set<ScopeName>();
	for (const scope of scopeStack) {
		if (seen.has(scope)) continue;
		seen.add(scope);
		const binds = keybinds.filter((keybind) => keybind.scope === scope);
		if (binds.length > 0) sections.push({ scope, binds });
	}
	return sections;
};

type CheatsheetRowProps = {
	keybind: Keybind;
};

const CheatsheetRow: FC<CheatsheetRowProps> = (props) => {
	const { keybind } = props;
	return (
		<div className="flex items-center justify-between gap-4 py-1.5">
			<span className="text-sm text-primary-800">{keybind.label}</span>
			<KeyboardHint keys={chordToTokens(keybind.keys)} />
		</div>
	);
};

type CheatsheetSectionProps = {
	section: CheatsheetSectionData;
};

const CheatsheetSection: FC<CheatsheetSectionProps> = (props) => {
	const { section } = props;
	return (
		<section className="flex flex-col gap-1">
			<h3 className="text-xs font-semibold uppercase tracking-wide text-secondary-700">
				{SCOPE_LABELS[section.scope]}
			</h3>
			<div className="flex flex-col divide-y divide-secondary-200">
				{section.binds.map((keybind) => (
					<CheatsheetRow key={keybind.id} keybind={keybind} />
				))}
			</div>
		</section>
	);
};

/**
 * Auto-generated `?` cheatsheet. Subscribes to the keybind registry and renders
 * every currently-active binding, grouped by scope. Registers the global `?`
 * binding that toggles it (Wave 1 input-guards `?`, so it stays quiet while
 * typing). Built on the `Dialog` primitive, so focus-trap and focus-restoration
 * come for free.
 */
export const KeyboardCheatsheet: FC = () => {
	const [open, setOpen] = useState(false);
	const { keybinds, scopeStack } = useKeybindSnapshot();

	const toggle = useCallback(() => {
		setOpen((prev) => !prev);
	}, []);

	const close = useCallback(() => {
		setOpen(false);
	}, []);

	useKeybind({
		id: "keyboard-cheatsheet",
		keys: "?",
		label: "Show keyboard shortcuts",
		scope: "global",
		group: "General",
		handler: toggle,
	});

	// Push the cheatsheet scope while open so its Esc binding is the topmost
	// winner, and own Esc through the registry instead of Radix's built-in
	// dismiss (disabled below) so only this overlay closes — never a panel under
	// it.
	useScope("cheatsheet", open);

	useKeybind({
		id: "keyboard-cheatsheet:close",
		keys: "Esc",
		label: "Close keyboard shortcuts",
		scope: "cheatsheet",
		group: "General",
		handler: close,
	});

	// Esc is owned by the keybind registry (cheatsheet scope), so neutralize
	// Radix's built-in Esc-to-close to avoid a double close.
	const handleEscapeKeyDown = useCallback((event: KeyboardEvent) => {
		event.preventDefault();
	}, []);

	const sections = useMemo(() => groupByActiveScope(keybinds, scopeStack), [keybinds, scopeStack]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-lg" onEscapeKeyDown={handleEscapeKeyDown}>
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Active shortcuts for the current context. Press Esc to close.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					{sections.map((section) => (
						<CheatsheetSection key={section.scope} section={section} />
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
};
