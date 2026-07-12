import { describe, expect, it } from "vitest";
import {
	parseBulletSection,
	parseTaskBulletSection,
	renderBulletRows,
	renderTaskBulletRows,
	type TaskRow,
} from "../src/sessions/bullet-list";

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

describe("parseTaskBulletSection", () => {
	it("reads `- [ ]` as not-done and `- [x]`/`- [X]` as done", () => {
		const result = parseTaskBulletSection("- [ ] Scout the mill\n- [x] Confront the mayor\n- [X] Escape the tunnel\n");
		expect(result).toEqual({
			rows: [
				{ text: "Scout the mill", done: false },
				{ text: "Confront the mayor", done: true },
				{ text: "Escape the tunnel", done: true },
			],
			malformed: false,
		});
	});

	it("reads a plain `-`/`*` bullet (no checkbox) as not-done", () => {
		const result = parseTaskBulletSection("- Scout the mill\n* Confront the mayor\n");
		expect(result.rows).toEqual([
			{ text: "Scout the mill", done: false },
			{ text: "Confront the mayor", done: false },
		]);
		expect(result.malformed).toBe(false);
	});

	it("tolerates mixed plain and task rows in one section", () => {
		const result = parseTaskBulletSection("- Scout the mill\n- [x] Confront the mayor\n- [ ] Escape the tunnel\n");
		expect(result.rows).toEqual([
			{ text: "Scout the mill", done: false },
			{ text: "Confront the mayor", done: true },
			{ text: "Escape the tunnel", done: false },
		]);
	});

	it("flags non-bullet prose as malformed without dropping recognized rows", () => {
		const result = parseTaskBulletSection("The cult meets at midnight.\n- [x] a real row\n");
		expect(result.malformed).toBe(true);
		expect(result.rows).toEqual([{ text: "a real row", done: true }]);
	});

	it("returns no rows for an empty section", () => {
		expect(parseTaskBulletSection("")).toEqual({ rows: [], malformed: false });
	});
});

describe("renderTaskBulletRows", () => {
	it("renders done/not-done rows with checkbox syntax", () => {
		const rows: TaskRow[] = [
			{ text: "Scout the mill", done: false },
			{ text: "Confront the mayor", done: true },
		];
		expect(renderTaskBulletRows(rows)).toBe("- [ ] Scout the mill\n- [x] Confront the mayor");
	});

	it("drops empty/whitespace-only rows", () => {
		const rows: TaskRow[] = [{ text: "one", done: false }, { text: "  ", done: true }, { text: "", done: false }];
		expect(renderTaskBulletRows(rows)).toBe("- [ ] one");
	});
});

describe("task round trip", () => {
	it("parse(render(rows)) recovers mixed done/not-done rows", () => {
		const rows: TaskRow[] = [
			{ text: "Scout the mill", done: false },
			{ text: "Confront the mayor", done: true },
			{ text: "Escape the collapsing tunnel", done: false },
		];
		const rendered = renderTaskBulletRows(rows);
		expect(parseTaskBulletSection(rendered)).toEqual({ rows, malformed: false });
	});
});
