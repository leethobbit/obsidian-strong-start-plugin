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

describe("scene detail blocks", () => {
	it("attaches indented lines to the preceding row as detail", () => {
		const section = "- [ ] Ambush on the vale road\n    Six bandits, fallen tree.\n    Rain and mist; DC 13 to spot.\n- [x] The sheriff's offer\n";
		expect(parseTaskBulletSection(section)).toEqual({
			rows: [
				{ text: "Ambush on the vale road", done: false, detail: "Six bandits, fallen tree.\nRain and mist; DC 13 to spot." },
				{ text: "The sheriff's offer", done: true },
			],
			malformed: false,
		});
	});

	it("attaches detail to plain (non-checkbox) bullets too", () => {
		const result = parseTaskBulletSection("- Scout the mill\n    The wheel turns at night.\n");
		expect(result.rows).toEqual([{ text: "Scout the mill", done: false, detail: "The wheel turns at night." }]);
		expect(result.malformed).toBe(false);
	});

	it("keeps detail per-row across multiple rows", () => {
		const section = "- [ ] one\n    d1\n- [ ] two\n    d2\n";
		expect(parseTaskBulletSection(section).rows).toEqual([
			{ text: "one", done: false, detail: "d1" },
			{ text: "two", done: false, detail: "d2" },
		]);
	});

	it("dedents tab-indented detail", () => {
		const result = parseTaskBulletSection("- [ ] one\n\td1\n\td2\n");
		expect(result.rows).toEqual([{ text: "one", done: false, detail: "d1\nd2" }]);
	});

	it("treats an indented sub-bullet as detail, not a top-level row", () => {
		const result = parseTaskBulletSection("- [ ] one\n    - sub point\n");
		expect(result.rows).toEqual([{ text: "one", done: false, detail: "- sub point" }]);
		expect(result.malformed).toBe(false);
	});

	it("preserves nested structure inside a detail block via common-prefix dedent", () => {
		const result = parseTaskBulletSection("- [ ] one\n    top\n        nested\n");
		expect(result.rows).toEqual([{ text: "one", done: false, detail: "top\n    nested" }]);
	});

	it("keeps a blank line inside a detail block, drops trailing blanks", () => {
		const section = "- [ ] one\n    first paragraph\n\n    second paragraph\n\n- [ ] two\n";
		expect(parseTaskBulletSection(section).rows).toEqual([
			{ text: "one", done: false, detail: "first paragraph\n\nsecond paragraph" },
			{ text: "two", done: false },
		]);
	});

	it("drops blank lines between a bullet and its first detail line", () => {
		const result = parseTaskBulletSection("- [ ] one\n\n    detail\n");
		expect(result.rows).toEqual([{ text: "one", done: false, detail: "detail" }]);
	});

	it("flags an indented line before any row as malformed without losing rows", () => {
		const result = parseTaskBulletSection("    orphan detail\n- [ ] one\n");
		expect(result.malformed).toBe(true);
		expect(result.rows).toEqual([{ text: "one", done: false }]);
	});

	it("renders detail indented under its bullet", () => {
		const rows: TaskRow[] = [{ text: "one", done: false, detail: "d1\nd2" }, { text: "two", done: true }];
		expect(renderTaskBulletRows(rows)).toBe("- [ ] one\n    d1\n    d2\n- [x] two");
	});

	it("renders interior detail blank lines unindented", () => {
		const rows: TaskRow[] = [{ text: "one", done: false, detail: "a\n\nb" }];
		expect(renderTaskBulletRows(rows)).toBe("- [ ] one\n    a\n\n    b");
	});

	it("drops an empty-text row together with its detail", () => {
		const rows: TaskRow[] = [{ text: "  ", done: false, detail: "orphaned" }, { text: "kept", done: false }];
		expect(renderTaskBulletRows(rows)).toBe("- [ ] kept");
	});

	it("omits whitespace-only detail", () => {
		const rows: TaskRow[] = [{ text: "one", done: false, detail: "   \n  " }];
		expect(renderTaskBulletRows(rows)).toBe("- [ ] one");
	});

	it("round-trips detail rows deep-equal", () => {
		const rows: TaskRow[] = [
			{ text: "one", done: false, detail: "para one\n\npara two\n    nested" },
			{ text: "two", done: true },
			{ text: "three", done: false, detail: "- sub a\n- sub b" },
		];
		expect(parseTaskBulletSection(renderTaskBulletRows(rows))).toEqual({ rows, malformed: false });
	});

	it("render(parse(render(rows))) is a fixed point", () => {
		const rows: TaskRow[] = [{ text: "one", done: false, detail: "a\n\nb" }, { text: "two", done: true }];
		const once = renderTaskBulletRows(rows);
		const twice = renderTaskBulletRows(parseTaskBulletSection(once).rows);
		expect(twice).toBe(once);
	});

	it("keeps flat lists byte-identical through parse+render", () => {
		const flat = "- [ ] Scout the mill\n- [x] Confront the mayor";
		expect(renderTaskBulletRows(parseTaskBulletSection(flat).rows)).toBe(flat);
	});
});
