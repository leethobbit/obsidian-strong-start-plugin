import { describe, expect, it } from "vitest";
import { buildScaffold, healSections, parseSections, replaceSection, sectionContent } from "../src/lib/sections";

const SCAFFOLD = "## Campaign pitch\n\n## Six truths\n\n## Fronts\n\n## House rules\n";

describe("parseSections", () => {
	it("finds every H2 section in order", () => {
		const sections = parseSections(SCAFFOLD);
		expect(sections.map((s) => s.heading)).toEqual(["Campaign pitch", "Six truths", "Fronts", "House rules"]);
	});

	it("ignores H3+ headings", () => {
		const body = "## Fronts\n\n### The Veiled Hand\ngoal line\n\n## House rules\n";
		const sections = parseSections(body);
		expect(sections.map((s) => s.heading)).toEqual(["Fronts", "House rules"]);
		expect(sections[0].content).toContain("### The Veiled Hand");
	});

	it("captures content exactly between headings", () => {
		const body = "## Pitch\nA doomed city.\n\n## Truths\n- one\n";
		const sections = parseSections(body);
		expect(sections[0].content).toBe("A doomed city.\n\n");
		expect(sections[1].content).toBe("- one\n");
	});

	it("returns nothing for a body with no managed headings", () => {
		expect(parseSections("just some prose")).toEqual([]);
	});
});

describe("replaceSection", () => {
	it("replaces one section's content, leaving everything else byte-for-byte identical", () => {
		const body = "## Pitch\nold pitch\n\n## Truths\n- one\n- two\n";
		const updated = replaceSection(body, "Pitch", "new pitch");
		expect(updated).toBe("## Pitch\nnew pitch\n\n## Truths\n- one\n- two\n");
	});

	it("matches heading names case-insensitively, preserving the original heading casing", () => {
		const body = "## campaign pitch\nold\n";
		const updated = replaceSection(body, "Campaign Pitch", "new");
		expect(updated).toBe("## campaign pitch\nnew\n");
	});

	it("tolerates reordered/user headings and only touches the target", () => {
		const body = "## House rules\nno flanking\n\n## Pitch\nold\n";
		const updated = replaceSection(body, "Pitch", "new");
		expect(updated).toBe("## House rules\nno flanking\n\n## Pitch\nnew\n");
	});

	it("appends the section at the end when the heading is missing", () => {
		const body = "## Pitch\nold\n";
		const updated = replaceSection(body, "Truths", "- one");
		expect(updated).toBe("## Pitch\nold\n\n## Truths\n- one\n");
	});

	it("creates the heading in an empty body", () => {
		expect(replaceSection("", "Pitch", "new")).toBe("## Pitch\nnew\n");
	});
});

describe("healSections", () => {
	it("appends only the managed headings that are missing, preserving existing content", () => {
		const body = "## Pitch\nold pitch\n";
		const healed = healSections(body, ["Pitch", "Truths", "Fronts"]);
		expect(healed).toBe("## Pitch\nold pitch\n\n## Truths\n\n## Fronts\n");
	});

	it("is a no-op when every required heading is already present", () => {
		const body = "## Pitch\nold\n\n## Truths\n- one\n";
		expect(healSections(body, ["Pitch", "Truths"])).toBe(body);
	});
});

describe("buildScaffold", () => {
	it("produces one empty section per heading", () => {
		const scaffold = buildScaffold(["Pitch", "Truths"]);
		expect(parseSections(scaffold).map((s) => s.heading)).toEqual(["Pitch", "Truths"]);
	});
});

describe("sectionContent", () => {
	it("returns one section's trimmed content", () => {
		const body = "## Strong start\nDrop them in the fight.\n\n## Scenes\n- one\n";
		expect(sectionContent(body, "Strong start")).toBe("Drop them in the fight.");
	});

	it("matches case-insensitively", () => {
		expect(sectionContent("## strong start\ntext\n", "Strong Start")).toBe("text");
	});

	it("returns an empty string when the heading is missing", () => {
		expect(sectionContent("## Other\ntext\n", "Strong start")).toBe("");
	});
});
