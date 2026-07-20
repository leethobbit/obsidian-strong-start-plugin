// Pure — no `obsidian` import.

// OS-invalid characters plus the four Obsidian link-syntax characters
// (`# ^ [ ]`): a note named "Adventure #2" produces `[[Adventure #2]]` joins
// that Obsidian's own link parser reads as linkpath "Adventure " + subpath
// "#2", breaking rename-updates and the graph.
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

// Windows reserved device names — a bare "CON.md" is uncreatable/unopenable
// on Windows regardless of extension.
const RESERVED_BASENAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Strip characters that are invalid in filenames on any OS (or inside
 * Obsidian wikilinks) and collapse whitespace, but otherwise preserve the
 * user's casing/spacing. This is what produces on-disk campaign/session note
 * names ("Greenhollow.md") — it is deliberately not a URL-style slug.
 */
export function toSafeFilename(name: string): string {
	const cleaned = name
		.replace(INVALID_FILENAME_CHARS, "")
		.trim()
		.replace(/\s+/g, " ")
		// Windows rejects trailing dots (and dot-only names collapse to "").
		.replace(/\.+$/, "");
	if (cleaned.length === 0) return "Untitled";
	return RESERVED_BASENAMES.test(cleaned) ? `${cleaned} note` : cleaned;
}

/**
 * Lowercase, dash-separated slug — used for things like a custom table's
 * default `tableId` (defaults to the note's filename slug, SCHEMA.md).
 */
export function slugify(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(INVALID_FILENAME_CHARS, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug.length > 0 ? slug : "untitled";
}
