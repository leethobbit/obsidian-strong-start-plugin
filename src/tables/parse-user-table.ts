// Pure — no `obsidian` import. Parses a custom table note's BODY into
// `TableRow[]` per SCHEMA.md ("Custom table — type: table"), first match
// wins: a die-range markdown table, else a top-level bullet list. Row text
// keeps `{{...}}` placeholders intact — `tables/roll.ts` expands them at
// roll time, this module never looks inside them.
//
// `renderTableBody` is the inverse the create/edit flow saves (canonical
// on-disk shape: an H1 + bullet list). `parseWeightedLines`/
// `renderWeightedLines` are the plain-line ("no bullet marker") variants the
// table-editor-modal's textarea uses for its live count/preview — kept here
// rather than inlined in the modal so they stay unit-testable without an
// Obsidian runtime (house rule: pure logic stays Obsidian-free).

import type { TableRow } from "./types";

// Digit ranges ("1", "2-5", "6-10"), tolerating spaces around the dash and an
// en dash ("6–10") in place of a hyphen.
const RANGE_RE = /^(\d+)\s*(?:[-–]\s*(\d+))?$/;
// A leading "Nx " weight prefix ("3x Some text") — stripped from the row's
// text, sets its weight. Requires whitespace after the `x` so ordinary text
// starting with digits ("20xp reward") is never mistaken for a prefix.
const WEIGHT_PREFIX_RE = /^(\d+)\s*x\s+(.+)$/i;
// Top-level bullets only: no leading whitespace before the marker.
const BULLET_RE = /^[-*]\s+(.*)$/;

function parseRangeWidth(cell: string): number | null {
	const match = RANGE_RE.exec(cell.trim());
	if (!match) return null;
	const start = Number(match[1]);
	const end = match[2] !== undefined ? Number(match[2]) : start;
	if (end < start) return null;
	return end - start + 1;
}

/** Split one `|`-delimited row into trimmed cells, dropping the empty cells
 * produced by a row's outer pipes ("| a | b |") if present — outer pipes are
 * optional in GFM, so a row without them splits cleanly too. */
function splitTableRow(line: string): string[] {
	let cells = line.split("|");
	if (cells.length > 1 && cells[0].trim() === "") cells = cells.slice(1);
	if (cells.length > 1 && cells[cells.length - 1].trim() === "") cells = cells.slice(0, -1);
	return cells.map((cell) => cell.trim());
}

function isSeparatorRow(cells: readonly string[]): boolean {
	return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

/** Every GFM-style table block in `lines`, in document order, as its data
 * rows only (header + separator are consumed to find the block but never
 * inspected — the shadowing rule only cares about data rows' first column). */
function findTableBlocks(lines: readonly string[]): string[][][] {
	const blocks: string[][][] = [];
	let i = 0;
	while (i < lines.length) {
		const header = lines[i];
		const separator = lines[i + 1];
		if (
			!header.includes("|") ||
			separator === undefined ||
			!separator.includes("|") ||
			!isSeparatorRow(splitTableRow(separator))
		) {
			i++;
			continue;
		}
		const dataRows: string[][] = [];
		let j = i + 2;
		while (j < lines.length && lines[j].trim().length > 0 && lines[j].includes("|")) {
			dataRows.push(splitTableRow(lines[j]));
			j++;
		}
		blocks.push(dataRows);
		i = j;
	}
	return blocks;
}

/** A table block qualifies only when it has at least one data row and every
 * one of them has a first column that parses as a die range — one
 * non-range row disqualifies the whole block (SCHEMA.md: "A table whose
 * first column isn't ranges is ignored"), falling through to the next
 * candidate table or the bullet list. Ranges needn't be contiguous or
 * complete; each row's weight is just its own range width. */
function tryDieRangeTable(dataRows: readonly string[][]): TableRow[] | null {
	if (dataRows.length === 0) return null;
	const rows: TableRow[] = [];
	for (const cells of dataRows) {
		if (cells.length < 2) return null;
		const width = parseRangeWidth(cells[0]);
		if (width === null) return null;
		rows.push({ text: cells.slice(1).join(" — ").trim(), weight: width });
	}
	return rows;
}

function parseWeightPrefixedLine(raw: string): TableRow {
	const match = WEIGHT_PREFIX_RE.exec(raw);
	if (!match) return { text: raw };
	return { text: match[2].trim(), weight: Number(match[1]) };
}

/** Parse a `type: table` note's body into weighted rows, first match wins per
 * SCHEMA.md: the first die-range markdown table, else a top-level bullet
 * list (each `-`/`*` line, an optional leading `Nx ` prefix setting its
 * weight). Blank/whitespace-only bodies produce no rows. */
export function parseUserTableBody(body: string): TableRow[] {
	if (body.trim().length === 0) return [];

	const lines = body.split("\n");

	for (const block of findTableBlocks(lines)) {
		const rows = tryDieRangeTable(block);
		if (rows) return rows;
	}

	const rows: TableRow[] = [];
	for (const line of lines) {
		const match = BULLET_RE.exec(line);
		if (!match) continue;
		const raw = match[1].trim();
		if (raw.length === 0) continue;
		rows.push(parseWeightPrefixedLine(raw));
	}
	return rows;
}

function renderRows(rows: readonly TableRow[], bulletPrefix: string): string[] {
	return rows
		.map((row) => ({ text: row.text.trim(), weight: row.weight ?? 1 }))
		.filter((row) => row.text.length > 0)
		.map((row) => `${bulletPrefix}${row.weight > 1 ? `${row.weight}x ` : ""}${row.text}`);
}

/** Canonical on-disk body the create/edit flow saves for a custom table
 * note: an H1 (the table's display name — purely cosmetic, never parsed
 * back out) plus a bullet list, with a `Nx ` prefix on any row weighted
 * above the uniform default. */
export function renderTableBody(name: string, rows: readonly TableRow[]): string {
	const lines = renderRows(rows, "- ");
	return lines.length > 0 ? `# ${name}\n\n${lines.join("\n")}\n` : `# ${name}\n`;
}

/** The table-editor-modal textarea's plain-line format — no bullet marker,
 * one entry per line, same `Nx ` weight prefix. */
export function parseWeightedLines(text: string): TableRow[] {
	const rows: TableRow[] = [];
	for (const line of text.split("\n")) {
		const raw = line.trim();
		if (raw.length === 0) continue;
		rows.push(parseWeightPrefixedLine(raw));
	}
	return rows;
}

/** Inverse of `parseWeightedLines` — used to pre-fill the editor textarea
 * when opening an existing table note for edit. */
export function renderWeightedLines(rows: readonly TableRow[]): string {
	return renderRows(rows, "").join("\n");
}
