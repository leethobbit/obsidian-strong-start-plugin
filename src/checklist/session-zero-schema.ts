// Pure — no `obsidian` import. Lenient reader for the session-zero note's
// safety-card fields (SCHEMA.md `type: session-zero`). The checklist's `done`
// items and the writer land with the full session-zero panel in a later
// milestone (M9) — run mode (M6) only needs read access to `lines`/`veils`
// for the safety card.

export interface SessionZeroFm {
	campaign: string;
	lines: string[];
	veils: string[];
}

function coerceStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}

export function readSessionZeroFm(fm: unknown): SessionZeroFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	if (typeof source.campaign !== "string" || source.campaign.length === 0) return null;

	return {
		campaign: source.campaign,
		lines: coerceStringArray(source.lines),
		veils: coerceStringArray(source.veils),
	};
}
