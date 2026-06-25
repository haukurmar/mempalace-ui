import { afterEach, describe, expect, it, vi } from "vitest";
import { KeybindStore, SEQUENCE_TIMEOUT_MS } from "./KeybindStore";
import type { Keybind, ScopeName } from "./types";

const makeKeybind = (
	id: string,
	keys: string | string[],
	scope: ScopeName,
	handler: Keybind["handler"] = () => {},
): Keybind => ({ id, keys, scope, handler, label: id });

type FakeKeyEvent = KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };

const fakeKeyEvent = (key: string, overrides: Partial<KeyboardEvent> = {}): FakeKeyEvent =>
	({
		key,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		target: null,
		preventDefault: vi.fn(),
		...overrides,
	}) as unknown as FakeKeyEvent;

const editableTarget = { tagName: "INPUT" } as unknown as EventTarget;

describe("KeybindStore registration lifecycle", () => {
	it("registers and unregisters bindings", () => {
		const store = new KeybindStore();
		const bind = makeKeybind("down", "j", "tree");

		store.register(bind);
		expect(store.getKeybinds()).toContain(bind);

		store.unregister("down");
		expect(store.getKeybinds()).toHaveLength(0);
	});

	it("notifies subscribers on register, unregister, and scope changes", () => {
		const store = new KeybindStore();
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		store.register(makeKeybind("down", "j", "tree"));
		store.pushScope("tree");
		store.popScope("tree");
		store.unregister("down");
		expect(listener).toHaveBeenCalledTimes(4);

		unsubscribe();
		store.register(makeKeybind("up", "k", "tree"));
		expect(listener).toHaveBeenCalledTimes(4);
	});
});

describe("KeybindStore scope stack", () => {
	it("starts with global at the bottom and reflects pushes/pops", () => {
		const store = new KeybindStore();
		expect(store.getScopeStack()).toEqual(["global"]);

		store.pushScope("tree");
		store.pushScope("drawer-panel");
		expect(store.getScopeStack()).toEqual(["global", "tree", "drawer-panel"]);

		store.popScope("tree");
		expect(store.getScopeStack()).toEqual(["global", "drawer-panel"]);
	});

	it("resolves to the topmost active scope's binding", () => {
		const store = new KeybindStore();
		const globalBind = makeKeybind("g", "j", "global");
		const treeBind = makeKeybind("t", "j", "tree");
		store.register(globalBind);
		store.register(treeBind);

		expect(store.resolve("j", false)).toBe(globalBind);

		store.pushScope("tree");
		expect(store.resolve("j", false)).toBe(treeBind);

		store.popScope("tree");
		expect(store.resolve("j", false)).toBe(globalBind);
	});
});

describe("KeybindStore sequence dispatch", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("fires a sequence binding once its steps complete (g then s)", () => {
		const store = new KeybindStore();
		const handler = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", handler));

		const prefix = fakeKeyEvent("g");
		store.handleKeyDown(prefix);
		expect(handler).not.toHaveBeenCalled();
		expect(prefix.preventDefault).toHaveBeenCalledOnce();

		store.handleKeyDown(fakeKeyEvent("s"));
		expect(handler).toHaveBeenCalledOnce();
	});

	it("does not regress single-key or chord dispatch", () => {
		const store = new KeybindStore();
		const single = vi.fn();
		const chord = vi.fn();
		store.register(makeKeybind("down", "j", "global", single));
		store.register(makeKeybind("palette", "mod+k", "global", chord));
		store.register(makeKeybind("nav.search", "g s", "global", () => {}));

		store.handleKeyDown(fakeKeyEvent("j"));
		expect(single).toHaveBeenCalledOnce();

		store.handleKeyDown(fakeKeyEvent("k", { metaKey: true }));
		expect(chord).toHaveBeenCalledOnce();
	});

	it("flushes the prefix on timeout so a stale step never completes", () => {
		vi.useFakeTimers();
		const store = new KeybindStore();
		const handler = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", handler));

		store.handleKeyDown(fakeKeyEvent("g"));
		vi.advanceTimersByTime(SEQUENCE_TIMEOUT_MS + 1);
		store.handleKeyDown(fakeKeyEvent("s"));

		expect(handler).not.toHaveBeenCalled();
	});

	it("cancels the prefix and reprocesses an unrelated key fresh", () => {
		const store = new KeybindStore();
		const sequence = vi.fn();
		const other = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", sequence));
		store.register(makeKeybind("other", "x", "global", other));

		store.handleKeyDown(fakeKeyEvent("g"));
		store.handleKeyDown(fakeKeyEvent("x"));

		expect(sequence).not.toHaveBeenCalled();
		expect(other).toHaveBeenCalledOnce();
	});

	it("resolves a global sequence while a list scope is active", () => {
		const store = new KeybindStore();
		const handler = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", handler));
		store.pushScope("browse-list");

		store.handleKeyDown(fakeKeyEvent("g"));
		store.handleKeyDown(fakeKeyEvent("s"));

		expect(handler).toHaveBeenCalledOnce();
	});

	it("suppresses a sequence prefix while typing in an editable surface", () => {
		const store = new KeybindStore();
		const handler = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", handler));

		const prefix = fakeKeyEvent("g", { target: editableTarget });
		store.handleKeyDown(prefix);
		store.handleKeyDown(fakeKeyEvent("s", { target: editableTarget }));

		expect(handler).not.toHaveBeenCalled();
		expect(prefix.preventDefault).not.toHaveBeenCalled();
	});

	it("does not swallow a completing keystroke once focus moves into an input", () => {
		const store = new KeybindStore();
		const handler = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", handler));

		// Prefix armed on a non-editable surface.
		const prefix = fakeKeyEvent("g");
		store.handleKeyDown(prefix);
		expect(prefix.preventDefault).toHaveBeenCalledOnce();

		// Focus moves into a text input within the timeout window: the buffered
		// sequence must not complete, and the completing key must NOT be swallowed
		// (it should type into the input instead).
		const completing = fakeKeyEvent("s", { target: editableTarget });
		store.handleKeyDown(completing);

		expect(handler).not.toHaveBeenCalled();
		expect(completing.preventDefault).not.toHaveBeenCalled();
	});

	it("lets an active scoped single-key shadow a colliding sequence prefix", () => {
		const store = new KeybindStore();
		const sequence = vi.fn();
		const scopedG = vi.fn();
		store.register(makeKeybind("nav.search", "g s", "global", sequence));
		store.register(makeKeybind("tree.g", "g", "tree", scopedG));

		// Scope active: the explicit single-key "g" wins and no sequence is armed.
		store.pushScope("tree");
		store.handleKeyDown(fakeKeyEvent("g"));
		store.handleKeyDown(fakeKeyEvent("s"));
		expect(scopedG).toHaveBeenCalledOnce();
		expect(sequence).not.toHaveBeenCalled();

		// Scope gone: "g" now begins the global sequence again.
		store.popScope("tree");
		store.handleKeyDown(fakeKeyEvent("g"));
		store.handleKeyDown(fakeKeyEvent("s"));
		expect(sequence).toHaveBeenCalledOnce();
	});
});
