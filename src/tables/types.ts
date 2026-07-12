// Pure — no `obsidian` import. Shared shapes for the rolling engine
// (`dice.ts`/`roll.ts`/`registry.ts`) and vendored content (`src/content/`).

export type TableCategory = "characters" | "places" | "plots" | "items" | "monsters";

export interface TableRow {
	text: string;
	/** Relative weight for the weighted pick; defaults to 1 when omitted. */
	weight?: number;
}

export interface RollTable {
	/** Stable, kebab-case, forever (deep-linked from chips, referenced by
	 * `{{...}}` template tokens, and — from M5 — shadowed by user tables of
	 * the same id). Never rename an existing table's id. */
	id: string;
	/** Sentence-case display name shown in the tables panel and roll-chip
	 * source lines. For a user table this is always the note's basename —
	 * the display name lives on the filesystem, not in frontmatter. */
	name: string;
	/** Absent for user tables: the fixed five categories are a core-content
	 * organizing device, not something a GM picks when pasting in a list. The
	 * tables panel groups user tables into their own "My tables" section by
	 * `source`, not `category`. */
	category?: TableCategory;
	source: "core" | "user";
	rows: TableRow[];
	/** Vault path of the backing note — only set for `source: "user"` tables
	 * (core tables are vendored TS, not notes). Powers the tables panel's
	 * Edit/Open note affordances. */
	path?: string;
}

/** One step of a roll's derivation — a table pick or a `{{dice}}` sub-roll —
 * powering the tables panel's "how this rolled" trace. */
export interface RollStep {
	tableId?: string;
	dice?: string;
	result: string;
}

export interface RollResult {
	text: string;
	trace: RollStep[];
}
