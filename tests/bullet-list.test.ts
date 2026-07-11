import { describe, expect, it } from "vitest";
import { parseBulletSection, renderBulletRows } from "../src/sessions/bullet-list";

describe("parseBulletSection", () => {
	it("parses a simple bullet list", () => {
		const result = parseBulletSection("- one\n- two\n- three\n");
		expect(result).toEqual({ rows: ["one", "two", "three"], malformed: false });
	});

	it("tolerates `*` bullets and surrounding blank lines", () => {
		const result = parseBulletSection("\n* one\n\n- two\n\n");
		expect(result.rows).toEqual(["one", "two"]);
		expect(result.malformed).toBe(false);
	});

	it("returns no rows for an empty section", () => {
		expect(parseBulletSection("")).toEqual({ rows: [], malformed: false });
		expect(parseBulletSection("\n\n")).toEqual({ rows: [], malformed: false });
	});

	it("flags non-bullet prose as malformed without dropping it silently", () => {
		const result = parseBulletSection("The cult meets at midnight.\n- a real row\n");
		expect(result.malformed).toBe(true);
		expect(result.rows).toEqual(["a real row"]);
	});
});

describe("renderBulletRows", () => {
	it("renders rows back to a bullet list", () => {
		expect(renderBulletRows(["one", "two"])).toBe("- one\n- two");
	});

	it("drops empty/whitespace-only rows", () => {
		expect(renderBulletRows(["one", "  ", "", "two"])).toBe("- one\n- two");
	});

	it("renders an all-empty list as an empty string", () => {
		expect(renderBulletRows(["", "  "])).toBe("");
	});
});

describe("round trip", () => {
	it("parse(render(rows)) recovers the original rows", () => {
		const rows = ["Scout the mill", "Confront the mayor", "Escape the collapsing tunnel"];
		const rendered = renderBulletRows(rows);
		expect(parseBulletSection(rendered)).toEqual({ rows, malformed: false });
	});
});
