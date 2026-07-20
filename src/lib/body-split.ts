// Pure — no `obsidian` import. Splices a note's body while leaving a leading
// YAML frontmatter block byte-for-byte untouched — for note types (like
// custom tables, `src/tables/parse-user-table.ts`) whose body isn't managed
// via `sections.ts`'s H2 machinery, so that machinery's "frontmatter always
// precedes the first heading" trick doesn't apply.

// Tolerates an optional UTF-8 BOM before the opening fence and an EMPTY block
// (`---\n---`) — Obsidian's cache treats both as valid frontmatter, and a
// splice that fails to match here overwrites the frontmatter with body text
// (silently un-managing the note).
const FRONTMATTER_RE = /^\uFEFF?---\r?\n(?:[\s\S]*?\r?\n)?---\r?\n?/;

/** Everything after a leading YAML frontmatter block (if any) — what
 * SCHEMA.md means by "the body" for note types that parse it directly rather
 * than through managed sections. */
export function stripFrontmatter(raw: string): string {
	return raw.replace(FRONTMATTER_RE, "");
}

/** Replace everything after a leading YAML frontmatter block (if any) with
 * `newBody`, leaving the frontmatter block itself untouched — the write side
 * of a `vault.process` callback that must preserve frontmatter without going
 * through `processFrontMatter` (which only ever touches frontmatter, never
 * body). */
export function replaceBody(raw: string, newBody: string): string {
	const match = FRONTMATTER_RE.exec(raw);
	const prefix = match ? match[0] : "";
	return `${prefix}${newBody}`;
}
