// Pure — no `obsidian` import. Shared shape every generator (`npc.ts`/
// `treasure.ts`/`trap.ts`/`monument.ts`/`quest.ts`) returns, plus the
// markdown/one-liner renderers the Generators subtab and prep-step hooks both
// read from — never a bespoke shape per generator.

export interface GeneratedLine {
	/** Sentence-case label shown in the composed result card, e.g. "Ancestry". */
	label: string;
	text: string;
	/** The core (or user-shadowing) table id this line rolled from, when it
	 * did — lets the UI reroll just this one line by rolling that table id
	 * again, rather than regenerating the whole result. Absent for a line
	 * that isn't table-sourced. */
	tableId?: string;
}

export interface GeneratedResult {
	/** The generator id that produced this (`GeneratorDef.id` — "npc" etc.). */
	kind: string;
	/** Descriptive title — doubles as the default "Save as note" filename. */
	title: string;
	lines: GeneratedLine[];
}

/** "- **Label:** text" bullets for an arbitrary line list — the shared
 * primitive behind `renderMarkdown`/`renderBullets`, and usable directly on a
 * subset of a result's lines (e.g. the monument generator's aspect lines,
 * excluding its own headline "Monument" line — `generators/insert.ts`'s
 * "Save as note" flow for Monument/Trap). */
export function bulletsForLines(lines: readonly GeneratedLine[]): string[] {
	return lines.map((line) => `- **${line.label}:** ${line.text}`);
}

/** Compact markdown block: a bold title line, then one "- **Label:** text"
 * bullet per line — used by Copy and by every "Save as note" flow. */
export function renderMarkdown(result: GeneratedResult): string {
	return [`**${result.title}**`, ...renderBullets(result)].join("\n");
}

/** Just the bullet lines (no title) — used when appending generated lines
 * into an existing note section (e.g. a location note's `## Aspects`). */
export function renderBullets(result: GeneratedResult): string[] {
	return bulletsForLines(result.lines);
}

/** Single-line summary joining every line's text with an em dash — the
 * "one-liner" a Rewards/Scenes bullet or a locations/npcs chip inserts
 * (docs/plan.md's Generators subtab + prep-step hooks). */
export function oneLiner(result: GeneratedResult): string {
	return result.lines.map((line) => line.text).join(" — ");
}
