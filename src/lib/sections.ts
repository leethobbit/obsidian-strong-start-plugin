// Pure — no `obsidian` import. Managed H2 body sections: parse / replace-one /
// heal. Lenient: case-insensitive heading match, tolerates user headings and
// reordering, and never touches a byte outside the section being replaced.
//
// Assumes "\n" line endings (Obsidian's editor normalizes to this) — a body
// round-tripped through the app never has "\r\n".

export interface Section {
	/** Heading text as written, trimmed (original casing preserved). */
	heading: string;
	/** The exact "## ..." line as it appears in the body. */
	headingLine: string;
	/** Everything after the heading line up to (not including) the next H2. */
	content: string;
	/** Byte offsets of this section's full span (heading + content) in `body`. */
	start: number;
	end: number;
}

// `##` followed by whitespace, not `###+` — multiline so `^`/`$` bind per line.
const HEADING_RE = /^##[ \t]+(.+?)[ \t]*$/gm;

// A fence line is up to 3 leading spaces then 3+ of the same backtick/tilde
// (CommonMark's indented-code-block cutoff is 4 spaces, so 4+ never fences).
const FENCE_LINE_RE = /^ {0,3}(`{3,}|~{3,})/;

/** Byte spans `[start, end)` in `body` covered by fenced code blocks, so
 * `parseSections` can ignore `##` lines that only look like headings inside
 * a fence. An opener without a matching closer runs to end of body. */
function findFenceSpans(body: string): Array<{ start: number; end: number }> {
	const spans: Array<{ start: number; end: number }> = [];
	let pos = 0;
	let openStart = -1;
	let openChar = "";
	let openLen = 0;

	while (pos <= body.length) {
		const nl = body.indexOf("\n", pos);
		const lineEnd = nl === -1 ? body.length : nl;
		const line = body.slice(pos, lineEnd);
		const fence = line.match(FENCE_LINE_RE);

		if (openStart === -1) {
			if (fence) {
				openStart = pos;
				openChar = fence[1][0];
				openLen = fence[1].length;
			}
		} else if (fence && fence[1][0] === openChar && fence[1].length >= openLen) {
			spans.push({ start: openStart, end: nl === -1 ? body.length : nl + 1 });
			openStart = -1;
		}

		if (nl === -1) break;
		pos = nl + 1;
	}

	if (openStart !== -1) spans.push({ start: openStart, end: body.length });
	return spans;
}

function isFenced(offset: number, spans: Array<{ start: number; end: number }>): boolean {
	return spans.some((s) => offset >= s.start && offset < s.end);
}

export function parseSections(body: string): Section[] {
	const fenceSpans = findFenceSpans(body);
	const matches = Array.from(body.matchAll(HEADING_RE)).filter((m) => !isFenced(m.index ?? 0, fenceSpans));
	const sections: Section[] = [];

	for (let i = 0; i < matches.length; i++) {
		const match = matches[i];
		const start = match.index ?? 0;
		const headingLine = match[0];
		let contentStart = start + headingLine.length;
		if (body[contentStart] === "\r") contentStart++;
		if (body[contentStart] === "\n") contentStart++;
		const end = i + 1 < matches.length ? (matches[i + 1].index ?? body.length) : body.length;

		sections.push({
			heading: match[1].trim(),
			headingLine,
			content: body.slice(contentStart, end),
			start,
			end,
		});
	}

	return sections;
}

/**
 * Replace exactly one section's content, matching `heading` case-insensitively
 * and regardless of position among other (possibly user-authored) headings.
 * Everything outside the target section's span is untouched byte-for-byte.
 * Creates the heading at the end of the body if it isn't present yet.
 */
export function replaceSection(body: string, heading: string, newContent: string): string {
	const sections = parseSections(body);
	const trimmed = newContent.replace(/\s+$/, "");
	const rendered = trimmed.length > 0 ? `${trimmed}\n` : "";
	const idx = sections.findIndex((s) => s.heading.toLowerCase() === heading.toLowerCase());

	if (idx === -1) {
		return appendSection(body, heading, rendered);
	}

	const target = sections[idx];
	const isLast = idx === sections.length - 1;
	const gap = isLast ? "" : "\n";
	const replacement = `${target.headingLine}\n${rendered}${gap}`;
	return body.slice(0, target.start) + replacement + body.slice(target.end);
}

/** Remove one section — heading line and content — matching `heading`
 * case-insensitively; everything outside its span survives byte-for-byte.
 * No-op when the heading isn't present. Used by run mode's entity focus pane
 * to render a location's body without duplicating the `## Aspects` section it
 * already lifted into the fields block. */
export function removeSection(body: string, heading: string): string {
	const target = parseSections(body).find((s) => s.heading.toLowerCase() === heading.toLowerCase());
	if (!target) return body;
	return body.slice(0, target.start) + body.slice(target.end);
}

/** Append any of `requiredHeadings` that aren't already present (case-insensitive
 * match), each as an empty section, preserving all existing content untouched. */
export function healSections(body: string, requiredHeadings: readonly string[]): string {
	const existing = new Set(parseSections(body).map((s) => s.heading.toLowerCase()));
	let result = body;
	for (const heading of requiredHeadings) {
		if (existing.has(heading.toLowerCase())) continue;
		result = appendSection(result, heading, "");
		existing.add(heading.toLowerCase());
	}
	return result;
}

function appendSection(body: string, heading: string, rendered: string): string {
	if (body.length === 0) return `## ${heading}\n${rendered}`;
	const withNewline = body.endsWith("\n") ? body : `${body}\n`;
	const withGap = withNewline.endsWith("\n\n") ? withNewline : `${withNewline}\n`;
	return `${withGap}## ${heading}\n${rendered}`;
}

/** Build a fresh scaffold body with one empty section per heading, in order —
 * used by note-creation flows (create-campaign, session-files). */
export function buildScaffold(headings: readonly string[]): string {
	return healSections("", headings);
}

/** Convenience: one section's content (trailing whitespace trimmed), or ""
 * if the heading isn't present yet. Used by the prep board's step editors to
 * read a section without re-implementing the heading match. */
export function sectionContent(body: string, heading: string): string {
	const match = parseSections(body).find((s) => s.heading.toLowerCase() === heading.toLowerCase());
	return match ? match.content.replace(/\s+$/, "") : "";
}
