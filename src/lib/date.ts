// Pure — no `obsidian` import. Date-string validation for the session
// `date` field (SCHEMA.md: "ISO date, optional").

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Strict `YYYY-MM-DD` with a real-calendar check — `2026-13-40` and
 * `2026-7-1` both fail; the Edit-date modal treats empty as "clear". */
export function isIsoDate(value: string): boolean {
	if (!ISO_DATE_RE.test(value)) return false;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
