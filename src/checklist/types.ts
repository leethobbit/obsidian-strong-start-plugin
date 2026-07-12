// Pure — no `obsidian` import. Mirrors `sessions/types.ts`'s split: the live
// model carries `path`, the frontmatter shape (`SessionZeroFm`,
// `session-zero-schema.ts`) omits it.

export interface SessionZeroModel {
	/** Vault path of the session-zero note. */
	path: string;
	/** Raw wikilink text to the campaign note, e.g. `"[[Greenhollow]]"`. */
	campaign: string;
	/** Checked checklist item ids (`src/content/session-zero.ts`). */
	done: string[];
	/** Hard lines — material that should never come up. */
	lines: string[];
	/** Veils — handled off-screen/faded to black. */
	veils: string[];
}
