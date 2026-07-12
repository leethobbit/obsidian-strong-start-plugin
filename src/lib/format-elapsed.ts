// Pure — no `obsidian` import. Run mode's top-bar elapsed timer and log-bar
// timestamp formatting (docs/plan.md M6).

/**
 * `mm:ss` under an hour, `h:mm` (seconds dropped) from the first full hour
 * on — a session timer doesn't need second-level precision once it's run
 * that long. Negative/non-finite input clamps to zero.
 */
export function formatElapsed(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}`;
	}
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** `HH:MM` (24-hour, zero-padded) for the log bar's `- HH:MM <text>` bullets. */
export function formatClockTime(date: Date): string {
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}
