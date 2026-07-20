import { describe, expect, it } from "vitest";
import { slugify, toSafeFilename } from "../src/lib/slug";

describe("toSafeFilename", () => {
	it("strips characters invalid in filenames", () => {
		expect(toSafeFilename("Greenhollow: The Sunken City?")).toBe("Greenhollow The Sunken City");
	});

	it("falls back to a placeholder when nothing survives", () => {
		expect(toSafeFilename("///")).toBe("Untitled");
	});

	it("collapses whitespace but preserves casing", () => {
		expect(toSafeFilename("  Greenhollow   Reborn  ")).toBe("Greenhollow Reborn");
	});

	it("strips Obsidian link-syntax characters that break [[wikilink]] joins", () => {
		expect(toSafeFilename("Adventure #2")).toBe("Adventure 2");
		expect(toSafeFilename("The [Fallen] King^s")).toBe("The Fallen Kings");
	});

	it("strips trailing dots (Windows rejects them)", () => {
		expect(toSafeFilename("To be continued...")).toBe("To be continued");
	});

	it("defuses Windows reserved device names", () => {
		expect(toSafeFilename("CON")).toBe("CON note");
		expect(toSafeFilename("nul")).toBe("nul note");
		expect(toSafeFilename("Console")).toBe("Console"); // prefix only, not reserved
	});
});

describe("slugify", () => {
	it("lowercases and dash-separates", () => {
		expect(slugify("Rumors at the Inn")).toBe("rumors-at-the-inn");
	});

	it("falls back to a placeholder when nothing survives", () => {
		expect(slugify("???")).toBe("untitled");
	});
});
