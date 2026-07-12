// Pure — no `obsidian` import. Full read+write codec for the session-zero
// note (SCHEMA.md `type: session-zero`): the campaign link, checklist `done`
// item ids, and the safety card's `lines`/`veils` arrays. M6 only needed the
// lenient reader for `lines`/`veils` (run mode's safety card); M9's session
// zero panel is what actually writes this note.

import { buildScaffold } from "../lib/sections";
import type { SessionZeroModel } from "./types";

export type SessionZeroFm = Omit<SessionZeroModel, "path">;

function coerceStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}

/** Lenient reader: tolerates missing/extra fields. Returns null without a
 * campaign link, since that's the join key everything else depends on. */
export function readSessionZeroFm(fm: unknown): SessionZeroFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	if (typeof source.campaign !== "string" || source.campaign.length === 0) return null;

	return {
		campaign: source.campaign,
		done: coerceStringArray(source.done),
		lines: coerceStringArray(source.lines),
		veils: coerceStringArray(source.veils),
	};
}

/** Strict writer: canonical shape. Absent-state markers (empty arrays) are
 * pruned by `lib/frontmatter.ts` on write, not here — "cleared = deleted"
 * (SCHEMA.md): unchecking every checklist item or removing every line/veil
 * drops the corresponding key from frontmatter entirely rather than writing
 * an empty array. */
export function writeSessionZeroFm(model: SessionZeroFm): Record<string, unknown> {
	return {
		type: "session-zero",
		campaign: model.campaign,
		done: [...model.done],
		lines: [...model.lines],
		veils: [...model.veils],
	};
}

export const SESSION_ZERO_BODY_SECTIONS = ["Expectations", "Logistics"] as const;

/** Fresh session-zero note body: one empty managed section per heading, in
 * order (SCHEMA.md: "body freeform (expectations, logistics)"). */
export function sessionZeroBodyScaffold(): string {
	return buildScaffold(SESSION_ZERO_BODY_SECTIONS);
}
