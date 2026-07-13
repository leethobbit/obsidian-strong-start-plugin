// Pure — no `obsidian` import. Plain add/remove/display helpers for the
// wikilink-or-string frontmatter arrays (locations/npcs/monsters) edited by
// the chip editor (src/views/prep/steps/chip-editor.ts).

export function addLink(links: readonly string[], value: string): string[] {
	const trimmed = value.trim();
	if (trimmed.length === 0) return [...links];
	if (links.includes(trimmed)) return [...links];
	return [...links, trimmed];
}

export function removeLink(links: readonly string[], value: string): string[] {
	return links.filter((link) => link !== value);
}

/** Convert one plain-string chip to a wikilink once its note exists — the
 * "Create note" affordance in the locations/NPCs steps. No-op if the value
 * isn't present. */
export function convertToWikilink(links: readonly string[], plainValue: string, noteName: string): string[] {
	return links.map((link) => (link === plainValue ? `[[${noteName}]]` : link));
}

const WIKILINK_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

export function isWikilink(link: string): boolean {
	return WIKILINK_RE.test(link.trim());
}

/** Strip a wikilink's brackets/alias for display and typeahead matching;
 * plain strings pass through unchanged. */
export function displayText(link: string): string {
	const match = WIKILINK_RE.exec(link.trim());
	if (!match) return link;
	return match[2] ?? match[1];
}

/** One token of mixed prose-and-wikilink text: `display` is what to show
 * (alias-aware for links); `target` is the linkpath to resolve, present only
 * on links. */
export interface LinkToken {
	kind: "text" | "link";
	display: string;
	target?: string;
}

const INLINE_WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Split free text into plain-text and wikilink tokens, in order — run mode's
 * glance rows use this to make `[[…]]` mentions tappable inside otherwise
 * plain entries ("Nightculler — see [[The Lost Throne]]"). A text without
 * links comes back as one text token; an empty string as no tokens. */
export function tokenizeWikilinks(text: string): LinkToken[] {
	const tokens: LinkToken[] = [];
	let last = 0;
	for (const match of text.matchAll(INLINE_WIKILINK_RE)) {
		const index = match.index ?? 0;
		if (index > last) tokens.push({ kind: "text", display: text.slice(last, index) });
		tokens.push({ kind: "link", display: match[2] ?? match[1], target: match[1] });
		last = index + match[0].length;
	}
	if (last < text.length) tokens.push({ kind: "text", display: text.slice(last) });
	return tokens;
}
