import { describe, expect, it } from "vitest";
import {
	parseUserTableBody,
	parseWeightedLines,
	renderTableBody,
	renderWeightedLines,
} from "../src/tables/parse-user-table";
import type { TableRow } from "../src/tables/types";

describe("parseUserTableBody — die-range markdown table", () => {
	it("parses a happy-path table: weights from range widths", () => {
		const body = ["| Roll | Result |", "| --- | --- |", "| 1 | A dagger |", "| 2-5 | A sword |", "| 6-10 | An axe |"].join(
			"\n"
		);
		expect(parseUserTableBody(body)).toEqual([
			{ text: "A dagger", weight: 1 },
			{ text: "A sword", weight: 4 },
			{ text: "An axe", weight: 5 },
		]);
	});

	it("tolerates an en dash in place of a hyphen", () => {
		const body = ["| Roll | Result |", "| --- | --- |", "| 6–10 | An axe |"].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "An axe", weight: 5 }]);
	});

	it("doesn't require ranges to be contiguous or complete", () => {
		const body = ["| Roll | Result |", "| --- | --- |", "| 1-3 | Low |", "| 7-9 | High |", "| 4-6 | Mid |"].join("\n");
		expect(parseUserTableBody(body)).toEqual([
			{ text: "Low", weight: 3 },
			{ text: "High", weight: 3 },
			{ text: "Mid", weight: 3 },
		]);
	});

	it("joins extra columns with an em dash", () => {
		const body = ["| Roll | Name | Note |", "| --- | --- | --- |", "| 1 | Alice | wizard |"].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "Alice — wizard", weight: 1 }]);
	});

	it("keeps {{...}} placeholders intact in a table row", () => {
		const body = ["| Roll | Result |", "| --- | --- |", "| 1 | {{1d4}} gold pieces |"].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "{{1d4}} gold pieces", weight: 1 }]);
	});
});

describe("parseUserTableBody — first-match-wins / fall-through", () => {
	it("ignores a table whose first column isn't die ranges, falling through to the next table", () => {
		const body = [
			"| Name | Role |",
			"| --- | --- |",
			"| Alice | wizard |",
			"",
			"| Roll | Result |",
			"| --- | --- |",
			"| 1 | A dagger |",
		].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "A dagger", weight: 1 }]);
	});

	it("falls through to the bullet list when no table qualifies", () => {
		const body = ["| Name | Role |", "| --- | --- |", "| Alice | wizard |", "", "- one", "- two"].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "one" }, { text: "two" }]);
	});

	it("the first qualifying table wins over a later qualifying one", () => {
		const body = [
			"| Roll | Result |",
			"| --- | --- |",
			"| 1 | First table |",
			"",
			"| Roll | Result |",
			"| --- | --- |",
			"| 1 | Second table |",
		].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "First table", weight: 1 }]);
	});

	it("prose + a die-range table + trailing bullets: the table wins", () => {
		const body = [
			"Some prose introducing the table.",
			"",
			"| Roll | Result |",
			"| --- | --- |",
			"| 1-2 | From the table |",
			"",
			"- a trailing bullet",
		].join("\n");
		expect(parseUserTableBody(body)).toEqual([{ text: "From the table", weight: 2 }]);
	});
});

describe("parseUserTableBody — bullet list", () => {
	it("uniform-weight rows for a plain bullet list", () => {
		expect(parseUserTableBody("- one\n- two\n- three")).toEqual([{ text: "one" }, { text: "two" }, { text: "three" }]);
	});

	it("tolerates `*` bullets", () => {
		expect(parseUserTableBody("* one\n* two")).toEqual([{ text: "one" }, { text: "two" }]);
	});

	it("a leading `Nx ` prefix sets the row's weight and is stripped from the text", () => {
		expect(parseUserTableBody("- 3x A common result\n- A rare result")).toEqual([
			{ text: "A common result", weight: 3 },
			{ text: "A rare result" },
		]);
	});

	it("only counts top-level bullets, ignoring interspersed prose", () => {
		expect(parseUserTableBody("Some prose.\n- a real row\nMore prose.\n- another row")).toEqual([
			{ text: "a real row" },
			{ text: "another row" },
		]);
	});

	it("keeps {{...}} placeholders intact in a bullet row", () => {
		expect(parseUserTableBody("- You find {{1d4}} gold, guarded by {{npc-names}}")).toEqual([
			{ text: "You find {{1d4}} gold, guarded by {{npc-names}}" },
		]);
	});

	it("doesn't mistake a digit-leading row for a weight prefix without the `x`", () => {
		expect(parseUserTableBody("- 20 gold pieces")).toEqual([{ text: "20 gold pieces" }]);
	});
});

describe("parseUserTableBody — blank bodies", () => {
	it("returns no rows for an empty body", () => {
		expect(parseUserTableBody("")).toEqual([]);
	});

	it("returns no rows for a whitespace-only body", () => {
		expect(parseUserTableBody("\n\n   \n")).toEqual([]);
	});
});

describe("renderTableBody", () => {
	it("renders a bullet list with an Nx prefix for weight > 1", () => {
		const rows: TableRow[] = [{ text: "Common", weight: 3 }, { text: "Rare" }];
		expect(renderTableBody("My table", rows)).toBe("# My table\n\n- 3x Common\n- Rare\n");
	});

	it("round-trips through parseUserTableBody for bullet-representable rows", () => {
		const rows: TableRow[] = [
			{ text: "Scout the mill" },
			{ text: "Confront the mayor", weight: 3 },
			{ text: "{{1d6}} guards escape" },
		];
		expect(parseUserTableBody(renderTableBody("Encounters", rows))).toEqual(rows);
	});

	it("round-trips a 0x (disabled) row instead of reviving it as weight 1", () => {
		const rows: TableRow[] = [{ text: "Benched for now", weight: 0 }, { text: "Active" }];
		expect(renderTableBody("Encounters", rows)).toBe("# Encounters\n\n- 0x Benched for now\n- Active\n");
		expect(parseUserTableBody(renderTableBody("Encounters", rows))).toEqual(rows);
	});
});

describe("parseWeightedLines / renderWeightedLines", () => {
	it("parses plain lines with no bullet marker", () => {
		expect(parseWeightedLines("3x Common\nRare")).toEqual([{ text: "Common", weight: 3 }, { text: "Rare" }]);
	});

	it("drops blank lines", () => {
		expect(parseWeightedLines("one\n\n  \ntwo")).toEqual([{ text: "one" }, { text: "two" }]);
	});

	it("round-trips through renderWeightedLines for bullet-representable rows", () => {
		const rows: TableRow[] = [{ text: "one" }, { text: "two", weight: 5 }];
		expect(parseWeightedLines(renderWeightedLines(rows))).toEqual(rows);
	});
});
