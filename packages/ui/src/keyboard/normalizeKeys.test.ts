import { describe, expect, it } from "vitest";
import {
	isEditableTarget,
	normalizeEvent,
	normalizeKeySequences,
	normalizeKeysSpec,
} from "./normalizeKeys";

const fakeEvent = (overrides: Partial<KeyboardEvent>): KeyboardEvent =>
	({
		key: "",
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		...overrides,
	}) as KeyboardEvent;

const fakeTarget = (overrides: { tagName?: string; isContentEditable?: boolean }): EventTarget =>
	overrides as unknown as EventTarget;

describe("normalizeKeysSpec", () => {
	it("normalizes single keys, combos, and Esc", () => {
		expect(normalizeKeysSpec("j")).toEqual(["j"]);
		expect(normalizeKeysSpec("?")).toEqual(["?"]);
		expect(normalizeKeysSpec("mod+k")).toEqual(["mod+k"]);
		expect(normalizeKeysSpec("Esc")).toEqual(["escape"]);
	});

	it("canonicalizes modifier aliases and casing", () => {
		expect(normalizeKeysSpec("Cmd+K")).toEqual(["mod+k"]);
		expect(normalizeKeysSpec("Ctrl+K")).toEqual(["mod+k"]);
		expect(normalizeKeysSpec("shift+mod+p")).toEqual(["mod+shift+p"]);
	});

	it("expands an array of alternative chords and dedupes", () => {
		expect(normalizeKeysSpec(["j", "k"])).toEqual(["j", "k"]);
		expect(normalizeKeysSpec(["mod+k", "Cmd+K"])).toEqual(["mod+k"]);
	});

	it("excludes multi-step sequences from direct signatures", () => {
		expect(normalizeKeysSpec("g s")).toEqual([]);
		expect(normalizeKeysSpec(["g s", "j"])).toEqual(["j"]);
	});
});

describe("normalizeKeySequences", () => {
	it("parses a single chord into a one-step sequence", () => {
		expect(normalizeKeySequences("mod+k")).toEqual([["mod+k"]]);
		expect(normalizeKeySequences("Esc")).toEqual([["escape"]]);
	});

	it("parses a space-separated spec into ordered steps", () => {
		expect(normalizeKeySequences("g s")).toEqual([["g", "s"]]);
		expect(normalizeKeySequences("g  c")).toEqual([["g", "c"]]);
	});

	it("normalizes chord steps within a sequence", () => {
		expect(normalizeKeySequences("g Cmd+K")).toEqual([["g", "mod+k"]]);
	});

	it("maps each alias (sequence or chord) to its own list", () => {
		expect(normalizeKeySequences(["g s", "j"])).toEqual([["g", "s"], ["j"]]);
	});
});

describe("normalizeEvent", () => {
	it("maps modifier combos", () => {
		expect(normalizeEvent(fakeEvent({ key: "k", metaKey: true }))).toBe("mod+k");
		expect(normalizeEvent(fakeEvent({ key: "k", ctrlKey: true }))).toBe("mod+k");
	});

	it("treats ? as first-class without a shift token", () => {
		expect(normalizeEvent(fakeEvent({ key: "?", shiftKey: true }))).toBe("?");
	});

	it("folds shift only for alphabetic keys", () => {
		expect(normalizeEvent(fakeEvent({ key: "K", shiftKey: true }))).toBe("shift+k");
		expect(normalizeEvent(fakeEvent({ key: "j" }))).toBe("j");
	});

	it("normalizes Escape", () => {
		expect(normalizeEvent(fakeEvent({ key: "Escape" }))).toBe("escape");
	});
});

describe("isEditableTarget", () => {
	it("detects text-entry surfaces", () => {
		expect(isEditableTarget(fakeTarget({ tagName: "INPUT" }))).toBe(true);
		expect(isEditableTarget(fakeTarget({ tagName: "TEXTAREA" }))).toBe(true);
		expect(isEditableTarget(fakeTarget({ tagName: "DIV", isContentEditable: true }))).toBe(true);
	});

	it("ignores non-editable targets", () => {
		expect(isEditableTarget(fakeTarget({ tagName: "DIV" }))).toBe(false);
		expect(isEditableTarget(null)).toBe(false);
	});
});
