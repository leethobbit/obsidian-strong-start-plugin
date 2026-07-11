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
});

describe("slugify", () => {
	it("lowercases and dash-separates", () => {
		expect(slugify("Rumors at the Inn")).toBe("rumors-at-the-inn");
	});

	it("falls back to a placeholder when nothing survives", () => {
		expect(slugify("???")).toBe("untitled");
	});
});
