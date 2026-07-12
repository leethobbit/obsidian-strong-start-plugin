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
});
