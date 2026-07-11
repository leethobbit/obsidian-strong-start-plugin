// Pure — no `obsidian` import.
import { buildScaffold } from "../lib/sections";
import type { Secret, SessionModel, SessionStatus } from "./types";

export type SessionFm = Omit<SessionModel, "path">;

/**
 * Lenient reader: tolerates missing/extra fields, coerces a stringly-typed
 * `session` number, dedupes duplicate secret ids (keep-first — SCHEMA.md
 * carry-over semantics; the UI layer is responsible for surfacing a notice
 * when this actually drops something). Returns null without a campaign link,
 * since that's the join key everything else depends on.
 */
export function readSessionFm(fm: unknown): SessionFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	if (typeof source.campaign !== "string" || source.campaign.length === 0) return null;

	const session = coerceNumber(source.session) ?? 0;
	const date = typeof source.date === "string" && source.date.length > 0 ? source.date : undefined;
	const status: SessionStatus = source.status === "played" ? "played" : "prep";

	return {
		campaign: source.campaign,
		session,
		date,
		status,
		stepsDone: coerceStringArray(source.stepsDone),
		secrets: dedupeSecrets(coerceSecrets(source.secrets)),
		npcs: coerceStringArray(source.npcs),
		locations: coerceStringArray(source.locations),
		monsters: coerceStringArray(source.monsters),
	};
}

function coerceNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function coerceStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}

function coerceSecrets(value: unknown): Secret[] {
	if (!Array.isArray(value)) return [];
	const secrets: Secret[] = [];
	for (const raw of value) {
		if (typeof raw !== "object" || raw === null) continue;
		const source = raw as Record<string, unknown>;
		if (typeof source.id !== "string" || source.id.length === 0) continue;
		if (typeof source.text !== "string") continue;
		secrets.push({
			id: source.id,
			text: source.text,
			revealed: source.revealed === true ? true : undefined,
			note: typeof source.note === "string" && source.note.length > 0 ? source.note : undefined,
			archived: source.archived === true ? true : undefined,
		});
	}
	return secrets;
}

function dedupeSecrets(secrets: Secret[]): Secret[] {
	const seen = new Set<string>();
	const deduped: Secret[] = [];
	for (const secret of secrets) {
		if (seen.has(secret.id)) continue;
		seen.add(secret.id);
		deduped.push(secret);
	}
	return deduped;
}

/** Strict writer: canonical shape. Absent-state markers (`""`/`false`) are
 * pruned by `lib/frontmatter.ts` on write, not here. */
export function writeSessionFm(model: SessionFm): Record<string, unknown> {
	return {
		type: "session",
		campaign: model.campaign,
		session: model.session,
		date: model.date ?? "",
		status: model.status === "played" ? "played" : "",
		stepsDone: [...model.stepsDone],
		secrets: model.secrets.map((secret) => ({
			id: secret.id,
			text: secret.text,
			revealed: secret.revealed === true,
			note: secret.note ?? "",
			archived: secret.archived === true,
		})),
		npcs: [...model.npcs],
		locations: [...model.locations],
		monsters: [...model.monsters],
	};
}

/** Strip `path` (not part of the frontmatter contract) back out of a live
 * `SessionModel` — the read side of the prep panel's read-modify-write
 * helper, paired with `writeSessionFm`. */
export function toSessionFm(model: SessionModel): SessionFm {
	return {
		campaign: model.campaign,
		session: model.session,
		date: model.date,
		status: model.status,
		stepsDone: model.stepsDone,
		secrets: model.secrets,
		npcs: model.npcs,
		locations: model.locations,
		monsters: model.monsters,
	};
}

export const SESSION_BODY_SECTIONS = ["Strong start", "Scenes", "Rewards", "Log"] as const;

/** Fresh session note body: one empty managed section per heading, in order. */
export function sessionBodyScaffold(): string {
	return buildScaffold(SESSION_BODY_SECTIONS);
}
