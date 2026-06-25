import { describe, expect, it, vi } from "vitest";
import { resolveKeybind, signaturePassesInputGuard } from "./dispatch";
import type { Keybind, ScopeName } from "./types";

const makeKeybind = (
	id: string,
	keys: string | string[],
	scope: ScopeName,
	handler: Keybind["handler"] = () => {},
): Keybind => ({ id, keys, scope, handler, label: id });

describe("signaturePassesInputGuard", () => {
	it("suppresses single-character bindings", () => {
		expect(signaturePassesInputGuard("j")).toBe(false);
		expect(signaturePassesInputGuard("k")).toBe(false);
		expect(signaturePassesInputGuard("?")).toBe(false);
	});

	it("lets mod-combos and Esc through", () => {
		expect(signaturePassesInputGuard("mod+k")).toBe(true);
		expect(signaturePassesInputGuard("escape")).toBe(true);
	});
});

describe("resolveKeybind precedence", () => {
	it("topmost active scope wins on a conflicting key", () => {
		const globalBind = makeKeybind("g", "j", "global");
		const treeBind = makeKeybind("t", "j", "tree");

		const winner = resolveKeybind({
			signature: "j",
			isEditable: false,
			keybinds: [globalBind, treeBind],
			scopeStack: ["global", "tree"],
		});

		expect(winner).toBe(treeBind);
	});

	it("falls back to global when the conflicting scope is not active", () => {
		const globalBind = makeKeybind("g", "j", "global");
		const treeBind = makeKeybind("t", "j", "tree");

		const winner = resolveKeybind({
			signature: "j",
			isEditable: false,
			keybinds: [globalBind, treeBind],
			scopeStack: ["global"],
		});

		expect(winner).toBe(globalBind);
	});

	it("fires non-conflicting global keys regardless of active scope", () => {
		const globalBind = makeKeybind("help", "?", "global");
		const treeNav = makeKeybind("down", "j", "tree");

		const winner = resolveKeybind({
			signature: "?",
			isEditable: false,
			keybinds: [globalBind, treeNav],
			scopeStack: ["global", "tree"],
		});

		expect(winner).toBe(globalBind);
	});

	it("never resolves a multi-step sequence as a lone keypress", () => {
		const sequence = makeKeybind("nav.search", "g s", "global");
		expect(
			resolveKeybind({
				signature: "g",
				isEditable: false,
				keybinds: [sequence],
				scopeStack: ["global"],
			}),
		).toBeUndefined();
		expect(
			resolveKeybind({
				signature: "s",
				isEditable: false,
				keybinds: [sequence],
				scopeStack: ["global"],
			}),
		).toBeUndefined();
	});

	it("returns undefined when no binding matches the signature", () => {
		const winner = resolveKeybind({
			signature: "x",
			isEditable: false,
			keybinds: [makeKeybind("g", "j", "global")],
			scopeStack: ["global"],
		});

		expect(winner).toBeUndefined();
	});
});

describe("resolveKeybind input guard", () => {
	const keybinds = [
		makeKeybind("down", "j", "tree"),
		makeKeybind("help", "?", "global"),
		makeKeybind("palette", "mod+k", "global"),
		makeKeybind("dismiss", "Esc", "global"),
	];
	const scopeStack: ScopeName[] = ["global", "tree"];

	it("suppresses j/k/? while focus is in an editable surface", () => {
		expect(
			resolveKeybind({ signature: "j", isEditable: true, keybinds, scopeStack }),
		).toBeUndefined();
		expect(
			resolveKeybind({ signature: "?", isEditable: true, keybinds, scopeStack }),
		).toBeUndefined();
	});

	it("lets mod+k and Esc through while editable", () => {
		expect(resolveKeybind({ signature: "mod+k", isEditable: true, keybinds, scopeStack })?.id).toBe(
			"palette",
		);
		expect(
			resolveKeybind({ signature: "escape", isEditable: true, keybinds, scopeStack })?.id,
		).toBe("dismiss");
	});

	it("fires the matched handler when resolved", () => {
		const handler = vi.fn();
		const winner = resolveKeybind({
			signature: "j",
			isEditable: false,
			keybinds: [makeKeybind("down", "j", "tree", handler)],
			scopeStack,
		});
		const fakeEvent = { key: "j" } as unknown as KeyboardEvent;
		winner?.handler(fakeEvent);
		expect(handler).toHaveBeenCalledOnce();
	});
});
