// Pure — no `obsidian` import. Bullets ("- text" lines) <-> row-model parsing
// for the list-section editor shared by the Scenes and Rewards steps
// (src/views/prep/steps/list-section-editor.ts), plus task-row parsing
// (`- [ ]`/`- [x]`) for run mode's one-tap Scenes checklist (docs/plan.md M6).

export interface BulletParseResult {
	/** One line of prose per row, in order. */
	rows: string[];
	/** True when the section has non-bullet, non-blank content the row editor
	 * can't represent — the caller should show a read-only "edited outside
	 * the board" banner rather than risk dropping that content on the next
	 * write (Prose editing decision, docs/plan.md). */
	malformed: boolean;
}

/** One row of a task-aware bullet section: `- [ ] text` (not done), `- [x]`/
 * `- [X]` (done), or a plain `- text` bullet — which reads as not-done, so a
 * section untouched by run mode round-trips unchanged. */
export interface TaskRow {
	text: string;
	done: boolean;
	/** The row's indented detail block — every indented line under the bullet
	 * (including indented sub-bullets), dedented by the block's common leading
	 * whitespace and joined with "\n". Absent (never `undefined`-valued) when
	 * the bullet has no indented content, so flat rows deep-equal their
	 * pre-detail shape. */
	detail?: string;
}

export interface TaskParseResult {
	rows: TaskRow[];
	malformed: boolean;
}

const TASK_BULLET_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;

function stripBullet(line: string): string | null {
	const match = /^\s*[-*]\s+(.*)$/.exec(line);
	return match ? match[1].trim() : null;
}

function parseTaskLine(line: string): TaskRow | null {
	const taskMatch = TASK_BULLET_RE.exec(line);
	if (taskMatch) {
		return { text: taskMatch[2].trim(), done: taskMatch[1].toLowerCase() === "x" };
	}
	const plain = stripBullet(line);
	return plain === null ? null : { text: plain, done: false };
}

/** Parse a section's raw content into row text, flagging any non-bullet
 * content so the caller can refuse to edit it destructively. */
export function parseBulletSection(sectionContent: string): BulletParseResult {
	const rows: string[] = [];
	let malformed = false;

	for (const line of sectionContent.split("\n")) {
		if (line.trim().length === 0) continue;
		const stripped = stripBullet(line);
		if (stripped === null) {
			malformed = true;
			continue;
		}
		if (stripped.length > 0) rows.push(stripped);
	}

	return { rows, malformed };
}

/** Render rows back to a bullet-list section body. Empty rows are dropped —
 * "cleared = deleted" applies to list rows too. An all-empty list renders as
 * an empty string (the section becomes empty, not a stray blank bullet). */
export function renderBulletRows(rows: readonly string[]): string {
	const nonEmpty = rows.map((row) => row.trim()).filter((row) => row.length > 0);
	return nonEmpty.map((row) => `- ${row}`).join("\n");
}

/** Longest common leading-whitespace prefix across the block's non-blank
 * lines — dedenting by a shared *string* (not a count) keeps mixed tab/space
 * blocks intact instead of guessing a tab width. */
function commonIndent(lines: readonly string[]): string {
	let prefix: string | null = null;
	for (const line of lines) {
		if (line.trim().length === 0) continue;
		const indent = /^[ \t]*/.exec(line)?.[0] ?? "";
		if (prefix === null) {
			prefix = indent;
			continue;
		}
		let i = 0;
		while (i < prefix.length && i < indent.length && prefix[i] === indent[i]) i++;
		prefix = prefix.slice(0, i);
	}
	return prefix ?? "";
}

/** Finalize a row's buffered detail lines: drop trailing blanks, dedent by the
 * block's common indent, and attach as `detail` only when non-empty. */
function attachDetail(row: TaskRow, buffered: string[]): void {
	while (buffered.length > 0 && buffered[buffered.length - 1].trim().length === 0) buffered.pop();
	if (buffered.length === 0) return;
	const indent = commonIndent(buffered);
	const detail = buffered
		.map((line) => (line.trim().length === 0 ? "" : line.startsWith(indent) ? line.slice(indent.length) : line.trimStart()))
		.join("\n");
	if (detail.trim().length > 0) row.detail = detail;
}

/**
 * Task-aware parse: same line-by-line tolerance as `parseBulletSection`, but
 * reads each row's done flag off `- [ ]`/`- [x]` checkbox syntax — a plain
 * `-`/`*` bullet (no checkbox) reads as not-done, so any section that predates
 * run mode (or was hand-edited without checkboxes) round-trips cleanly. Used
 * by run mode's Scenes checklist directly, and by the prep board's
 * list-section editor when `taskAware` (Scenes only — Rewards has no done
 * concept and stays on the plain functions above).
 *
 * Indented lines (space or tab) following a row are that row's detail block —
 * including indented sub-bullets, which previously flattened into top-level
 * rows. Blank lines inside a detail block survive iff more detail follows
 * (markdown paragraphs round-trip); leading/trailing blanks are dropped. An
 * indented line with no preceding row is malformed, same as unindented prose.
 */
export function parseTaskBulletSection(sectionContent: string): TaskParseResult {
	const rows: TaskRow[] = [];
	let malformed = false;
	let current: TaskRow | null = null;
	let buffered: string[] = [];

	const finishCurrent = (): void => {
		if (current) attachDetail(current, buffered);
		buffered = [];
	};

	for (const line of sectionContent.split("\n")) {
		if (line.trim().length === 0) {
			// Keep interior blanks (a detail block already begun) so markdown
			// paragraphs survive; blanks before the first detail line or
			// between rows are noise.
			if (current && buffered.length > 0) buffered.push("");
			continue;
		}

		if (/^[ \t]/.test(line)) {
			if (current) buffered.push(line);
			else malformed = true;
			continue;
		}

		const row = parseTaskLine(line);
		if (row === null) {
			malformed = true;
			continue;
		}
		finishCurrent();
		if (row.text.length > 0) {
			rows.push(row);
			current = row;
		} else {
			current = null;
		}
	}
	finishCurrent();

	return { rows, malformed };
}

/** Four spaces — enough for Obsidian/CommonMark to treat the block as the
 * bullet's continuation, and the fixed point `parseTaskBulletSection` dedents
 * back out. */
const TASK_DETAIL_INDENT = "    ";

/** Render task rows back to `- [ ]`/`- [x]` bullet lines, preserving array
 * order — reordering only ever happens through an explicit row move, never
 * through the done flag (run mode sinks done scenes visually, but never
 * rewrites their position in the underlying section). A row's detail block
 * renders indented beneath its bullet; empty rows drop with their detail
 * ("cleared = deleted"). */
export function renderTaskBulletRows(rows: readonly TaskRow[]): string {
	const lines: string[] = [];
	for (const row of rows) {
		const text = row.text.trim();
		if (text.length === 0) continue;
		lines.push(`- [${row.done ? "x" : " "}] ${text}`);
		const detail = (row.detail ?? "").replace(/\s+$/, "");
		if (detail.trim().length === 0) continue;
		for (const detailLine of detail.split("\n")) {
			lines.push(detailLine.trim().length === 0 ? "" : `${TASK_DETAIL_INDENT}${detailLine}`);
		}
	}
	return lines.join("\n");
}
