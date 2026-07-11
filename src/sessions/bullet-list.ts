// Pure — no `obsidian` import. Bullets ("- text" lines) <-> row-model parsing
// for the list-section editor shared by the Scenes and Rewards steps
// (src/views/prep/steps/list-section-editor.ts).

export interface BulletParseResult {
	/** One line of prose per row, in order. */
	rows: string[];
	/** True when the section has non-bullet, non-blank content the row editor
	 * can't represent — the caller should show a read-only "edited outside
	 * the board" banner rather than risk dropping that content on the next
	 * write (Prose editing decision, docs/plan.md). */
	malformed: boolean;
}

function stripBullet(line: string): string | null {
	const match = /^\s*[-*]\s+(.*)$/.exec(line);
	return match ? match[1].trim() : null;
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
