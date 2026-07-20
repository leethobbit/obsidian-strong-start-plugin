import { describe, expect, it } from "vitest";
import { replaceBody, stripFrontmatter } from "../src/lib/body-split";

const WITH_FM = ["---", "lazyCampaign:", "  type: table", "---", "# Old name", "", "- one", "- two", ""].join("\n");

describe("stripFrontmatter", () => {
	it("removes a leading YAML frontmatter block", () => {
		expect(stripFrontmatter(WITH_FM)).toBe("# Old name\n\n- one\n- two\n");
	});

	it("returns the body unchanged when there's no frontmatter block", () => {
		expect(stripFrontmatter("# Just a note\n\n- one\n")).toBe("# Just a note\n\n- one\n");
	});
});

describe("replaceBody", () => {
	it("preserves an existing frontmatter block while replacing everything after it", () => {
		expect(replaceBody(WITH_FM, "# New name\n\n- three\n")).toBe(
			["---", "lazyCampaign:", "  type: table", "---", "# New name", "", "- three", ""].join("\n")
		);
	});

	it("just returns the new body when there's no frontmatter block to preserve", () => {
		expect(replaceBody("# Just a note\n\n- one\n", "# New\n")).toBe("# New\n");
	});

	// M17 regression guard: the entity editor whole-body-replaces notes whose
	// bodies contain multiple H2s and even `---` horizontal rules (the starter
	// campaign's Lonely Torch location). The frontmatter regex must only ever
	// bite the LEADING fence — never a rule mid-prose — and a strip→edit→
	// replace round trip must keep the fm block byte-for-byte.
	it("survives bodies with multiple H2s and horizontal rules", () => {
		const fm = "---\nlazyCampaign:\n  type: location\n  campaign: \"[[Whitesparrow]]\"\n---\n";
		const body = "## Aspects\n- one\n\nIntro prose.\n\n## Shattered Door\nGuards.\n\n---\n\n## Lost Throne\nGardren.\n";
		const raw = `${fm}${body}`;

		expect(stripFrontmatter(raw)).toBe(body);

		const edited = body.replace("Guards.", "Two drunk guards.");
		expect(replaceBody(raw, edited)).toBe(`${fm}${edited}`);
	});

	it("does not treat a horizontal rule at the top of a frontmatter-less note as frontmatter", () => {
		const raw = "---\n\nJust prose that starts with a rule?\n";
		// The regex requires a closing fence — this note has none, so nothing
		// should be stripped... unless a later `---` line exists. Documenting
		// the actual contract: a lone leading rule with no closing fence stays.
		expect(stripFrontmatter(raw)).toBe(raw);
	});

	// Obsidian's cache accepts both of these as frontmatter — failing to match
	// them here made replaceBody overwrite the block (un-managing the note).
	it("tolerates a UTF-8 BOM before the opening fence", () => {
		const raw = `\uFEFF${WITH_FM}`;
		expect(stripFrontmatter(raw)).toBe("# Old name\n\n- one\n- two\n");
		expect(replaceBody(raw, "# New\n")).toBe("\uFEFF---\nlazyCampaign:\n  type: table\n---\n# New\n");
	});

	it("tolerates an empty frontmatter block", () => {
		const raw = "---\n---\n# Body\n";
		expect(stripFrontmatter(raw)).toBe("# Body\n");
		expect(replaceBody(raw, "# New\n")).toBe("---\n---\n# New\n");
	});

	it("tolerates CRLF line endings in the frontmatter block", () => {
		const raw = "---\r\nlazyCampaign:\r\n  type: table\r\n---\r\n# Body\n";
		expect(stripFrontmatter(raw)).toBe("# Body\n");
		expect(replaceBody(raw, "# New\n")).toBe("---\r\nlazyCampaign:\r\n  type: table\r\n---\r\n# New\n");
	});
});
