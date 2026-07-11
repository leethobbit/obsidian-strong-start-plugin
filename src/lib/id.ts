// Pure — no `obsidian` import.

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 6;

/**
 * Stable machine identity: `<prefix>-` + 6 random base36 characters (e.g.
 * `c-4k2j9x`, `s-8f3k2a`). Display text can be freely reworded afterward —
 * logic must never key off it; ids never change (SCHEMA.md).
 */
export function newId(prefix: string): string {
	let suffix = "";
	for (let i = 0; i < ID_LENGTH; i++) {
		suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
	}
	return `${prefix}-${suffix}`;
}
