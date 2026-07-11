// Pure — no `obsidian` import.

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * Strip characters that are invalid in filenames on any OS and collapse
 * whitespace, but otherwise preserve the user's casing/spacing. This is what
 * produces on-disk campaign/session note names ("Greenhollow.md") — it is
 * deliberately not a URL-style slug.
 */
export function toSafeFilename(name: string): string {
	const cleaned = name.replace(INVALID_FILENAME_CHARS, "").trim().replace(/\s+/g, " ");
	return cleaned.length > 0 ? cleaned : "Untitled";
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
