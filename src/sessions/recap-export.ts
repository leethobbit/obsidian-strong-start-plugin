// Pure — no `obsidian` import. The player-facing campaign recap builder
// (docs/plan.md M15, the privacy design from risk #5): one shareable markdown
// document covering every played session, MECHANICALLY filtered — only
// `## Recap` prose and secrets flagged `revealed` ever reach the output.
// Unrevealed secrets, archived secrets, scenes, the GM log, and every other
// prep artifact are excluded by construction, not by convention.

import { sectionContent } from "../lib/sections";
import type { SessionModel } from "./types";

export interface RecapSource {
	session: SessionModel;
	/** The session note's raw content (frontmatter + body is fine —
	 * frontmatter always precedes the first heading, so its span is never
	 * inside a section's content; `sectionContent` also excludes any `##`
	 * line that falls inside a fenced code block). */
	body: string;
}

/**
 * Build the recap document. Sessions are emitted in ascending play order
 * regardless of input order; sessions still in prep are skipped entirely.
 * Returns null when there's nothing shareable yet (no played sessions).
 */
export function buildPlayerRecap(campaignName: string, sources: readonly RecapSource[]): string | null {
	const played = sources
		.filter((s) => s.session.status === "played")
		.sort((a, b) => a.session.session - b.session.session);
	if (played.length === 0) return null;

	const parts: string[] = [`# ${campaignName} — the story so far`];

	for (const { session, body } of played) {
		const dateSuffix = session.date ? ` — ${session.date}` : "";
		parts.push(`## Session ${session.session}${dateSuffix}`);

		const recap = sectionContent(body, "Recap");
		parts.push(recap.length > 0 ? recap : "_No recap recorded._");

		// Revealed-only, and archived tombstones stay out even when they were
		// revealed first — retiring a secret withdraws it from the record.
		const revealed = session.secrets.filter((s) => s.revealed === true && s.archived !== true);
		if (revealed.length > 0) {
			parts.push("**What came to light:**");
			parts.push(revealed.map((s) => (s.note ? `- ${s.text} (${s.note})` : `- ${s.text}`)).join("\n"));
		}
	}

	return `${parts.join("\n\n")}\n`;
}
