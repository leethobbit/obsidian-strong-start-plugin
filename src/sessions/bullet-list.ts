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

/**
 * Task-aware parse: same line-by-line tolerance as `parseBulletSection`, but
 * reads each row's done flag off `- [ ]`/`- [x]` checkbox syntax — a plain
 * `-`/`*` bullet (no checkbox) reads as not-done, so any section that predates
 * run mode (or was hand-edited without checkboxes) round-trips cleanly. Used
 * by run mode's Scenes checklist directly, and by the prep board's
 * list-section editor when `taskAware` (Scenes only — Rewards has no done
 * concept and stays on the plain functions above).
 */
export function parseTaskBulletSection(sectionContent: string): TaskParseResult {
	const rows: TaskRow[] = [];
	let malformed = false;

	for (const line of sectionContent.split("\n")) {
		if (line.trim().length === 0) continue;
		const row = parseTaskLine(line);
		if (row === null) {
			malformed = true;
			continue;
		}
		if (row.text.length > 0) rows.push(row);
	}

	return { rows, malformed };
}

/** Render task rows back to `- [ ]`/`- [x]` bullet lines, preserving array
 * order — reordering only ever happens through an explicit row move, never
 * through the done flag (run mode sinks done scenes visually, but never
 * rewrites their position in the underlying section). */
export function renderTaskBulletRows(rows: readonly TaskRow[]): string {
	const nonEmpty = rows.filter((row) => row.text.trim().length > 0);
	return nonEmpty.map((row) => `- [${row.done ? "x" : " "}] ${row.text.trim()}`).join("\n");
}
