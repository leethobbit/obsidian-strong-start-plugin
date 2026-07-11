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
	 * source lines. */
	name: string;
	category: TableCategory;
	source: "core" | "user";
	rows: TableRow[];
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
