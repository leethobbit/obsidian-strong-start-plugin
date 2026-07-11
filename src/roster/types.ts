// Pure — no `obsidian` import. The lightweight per-note entity types created
// from the prep board's characters/locations/NPCs steps (SCHEMA.md).

export interface PcModel {
	path: string;
	/** Basename — display text, not a machine identity (no `id` field on PC
	 * notes, SCHEMA.md). */
	name: string;
	campaign: string;
	player?: string;
	role?: string;
}

export interface NpcNoteModel {
	path: string;
	name: string;
	campaign: string;
	role?: string;
	location?: string;
	status: "alive" | "dead";
}

export interface LocationNoteModel {
	path: string;
	name: string;
	campaign: string;
}
