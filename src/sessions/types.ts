// Pure — no `obsidian` import.

export interface Secret {
	id: string;
	text: string;
	/** Absent = false. */
	revealed?: boolean;
	/** Optional "how they learned it", captured at reveal. */
	note?: string;
	/** Tombstone — never carries forward again once true. Absent = false. */
	archived?: boolean;
}

export type SessionStatus = "prep" | "played";

export interface SessionModel {
	/** Vault path of the session note. */
	path: string;
	/** Raw wikilink text to the campaign note, e.g. `"[[Greenhollow]]"`. */
	campaign: string;
	/** Authoritative ordering key; the note's title/filename is free text. */
	session: number;
	/** ISO date, optional. */
	date?: string;
	/** Absent = "prep". */
	status: SessionStatus;
	stepsDone: string[];
	secrets: Secret[];
	npcs: string[];
	locations: string[];
	monsters: string[];
}
