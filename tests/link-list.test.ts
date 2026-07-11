import { describe, expect, it } from "vitest";
import { addLink, convertToWikilink, displayText, isWikilink, removeLink } from "../src/sessions/link-list";

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
