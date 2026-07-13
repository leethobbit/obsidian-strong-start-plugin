import { describe, expect, it } from "vitest";
import { addLink, convertToWikilink, displayText, isWikilink, removeLink, tokenizeWikilinks } from "../src/sessions/link-list";

describe("addLink", () => {
	it("appends a trimmed value", () => {
		expect(addLink([], "  The Sunken Mill  ")).toEqual(["The Sunken Mill"]);
	});

	it("ignores an empty value", () => {
		expect(addLink(["a"], "   ")).toEqual(["a"]);
	});

	it("does not add a duplicate", () => {
		expect(addLink(["a"], "a")).toEqual(["a"]);
	});
});

describe("removeLink", () => {
	it("removes an exact match", () => {
		expect(removeLink(["a", "b"], "a")).toEqual(["b"]);
	});
});

describe("convertToWikilink", () => {
	it("replaces the plain chip with a wikilink to the created note", () => {
		expect(convertToWikilink(["The Docks", "Krek"], "The Docks", "The Docks")).toEqual(["[[The Docks]]", "Krek"]);
	});
});

describe("isWikilink / displayText", () => {
	it("recognizes a wikilink and extracts its display text", () => {
		expect(isWikilink("[[The Sunken Mill]]")).toBe(true);
		expect(displayText("[[The Sunken Mill]]")).toBe("The Sunken Mill");
	});

	it("extracts the alias when present", () => {
		expect(displayText("[[The Sunken Mill|the mill]]")).toBe("the mill");
	});

	it("passes plain strings through unchanged", () => {
		expect(isWikilink("Krek the ferryman")).toBe(false);
		expect(displayText("Krek the ferryman")).toBe("Krek the ferryman");
	});
});

describe("tokenizeWikilinks", () => {
	it("splits prose around an inline wikilink", () => {
		expect(tokenizeWikilinks("Nightculler — see [[The Lost Throne]] later")).toEqual([
			{ kind: "text", display: "Nightculler — see " },
			{ kind: "link", display: "The Lost Throne", target: "The Lost Throne" },
			{ kind: "text", display: " later" },
		]);
	});

	it("uses the alias for display but keeps the target for resolution", () => {
		expect(tokenizeWikilinks("[[Ralavaz the Night Blade|Ralavaz]]")).toEqual([
			{ kind: "link", display: "Ralavaz", target: "Ralavaz the Night Blade" },
		]);
	});

	it("handles multiple links and returns plain text as one token", () => {
		expect(tokenizeWikilinks("[[A]] and [[B]]")).toEqual([
			{ kind: "link", display: "A", target: "A" },
			{ kind: "text", display: " and " },
			{ kind: "link", display: "B", target: "B" },
		]);
		expect(tokenizeWikilinks("no links here")).toEqual([{ kind: "text", display: "no links here" }]);
	});

	it("returns no tokens for an empty string", () => {
		expect(tokenizeWikilinks("")).toEqual([]);
	});
});
