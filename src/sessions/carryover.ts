// Pure — no `obsidian` import. The product's signature mechanic: secret
// carry-over between sessions. Implements SCHEMA.md "Secret carry-over
// semantics" exactly — read that section before changing anything here.
//
// Sessions are the sole source of truth; every campaign-level secret view
// (this whole module) is a derived fold, re-computed from the session models
// on every call. Nothing here is stored.

import type { Secret, SessionModel } from "./types";

/** One session's copy of one secret id, with enough positional context to
 * resolve the authoritative version and first-appearance ordering. */
interface Occurrence {
	sessionNumber: number;
	date?: string;
	path: string;
	/** Index within that session's `secrets[]` array — first-appearance
	 * ordering tie-break ("row order within that session"). */
	rowIndex: number;
	secret: Secret;
}

/** Groups every occurrence of every secret id across `sessions`, in whatever
 * order the caller passed them (order doesn't matter — every comparison below
 * keys off `session`/`date`/`path`, never array position). */
function occurrencesById(sessions: readonly SessionModel[]): Map<string, Occurrence[]> {
	const map = new Map<string, Occurrence[]>();
	for (const session of sessions) {
		session.secrets.forEach((secret, rowIndex) => {
			const list = map.get(secret.id);
			const occurrence: Occurrence = {
				sessionNumber: session.session,
				date: session.date,
				path: session.path,
				rowIndex,
				secret,
			};
			if (list) list.push(occurrence);
			else map.set(secret.id, [occurrence]);
		});
	}
	return map;
}

/**
 * SCHEMA.md tie-break comparator for "the authoritative version": highest
 * session number wins; if two occurrences somehow share a session number
 * (e.g. hand-edited duplicate numbering), the one with the later `date`
 * wins, then the one with the lexicographically later `path`. Missing dates
 * sort before any real date. Ascending comparator — the max is authoritative.
 */
function compareOccurrence(a: Occurrence, b: Occurrence): number {
	if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
	const dateCompare = (a.date ?? "").localeCompare(b.date ?? "");
	if (dateCompare !== 0) return dateCompare;
	return a.path.localeCompare(b.path);
}

/** The occurrence that counts as "first appearance" for ordering purposes:
 * lowest session number, tie-broken by path (ascending) for determinism —
 * SCHEMA.md doesn't specify a tie-break here since duplicate session numbers
 * across different notes are a hand-edit edge case, not a normal flow. */
function firstOccurrence(list: readonly Occurrence[]): Occurrence {
	return list.reduce((best, cur) => {
		if (cur.sessionNumber !== best.sessionNumber) return cur.sessionNumber < best.sessionNumber ? cur : best;
		return cur.path.localeCompare(best.path) < 0 ? cur : best;
	});
}

function compareFirstAppearance(a: readonly Occurrence[], b: readonly Occurrence[]): number {
	const fa = firstOccurrence(a);
	const fb = firstOccurrence(b);
	if (fa.sessionNumber !== fb.sessionNumber) return fa.sessionNumber - fb.sessionNumber;
	if (fa.rowIndex !== fb.rowIndex) return fa.rowIndex - fb.rowIndex;
	return fa.path.localeCompare(fb.path);
}

export interface AuthoritativeSecret {
	/** The authoritative copy's full row (state flags included). */
	secret: Secret;
	/** Vault path of the session note holding the authoritative copy. */
	sessionPath: string;
	/** That session's number. */
	sessionNumber: number;
	/** Lowest session number containing this id (origin). */
	firstSeenIn: number;
}

/**
 * For each secret id appearing anywhere in `sessions`, resolve the
 * authoritative version: the copy in the highest-numbered session containing
 * that id (tie-break `date`, then `path`, ascending — see
 * `compareOccurrence`).
 */
export function latestVersions(sessions: readonly SessionModel[]): Map<string, AuthoritativeSecret> {
	const occ = occurrencesById(sessions);
	const result = new Map<string, AuthoritativeSecret>();
	for (const [id, list] of occ) {
		const authoritative = list.reduce((best, cur) => (compareOccurrence(cur, best) > 0 ? cur : best));
		const firstSeenIn = firstOccurrence(list).sessionNumber;
		result.set(id, {
			secret: authoritative.secret,
			sessionPath: authoritative.path,
			sessionNumber: authoritative.sessionNumber,
			firstSeenIn,
		});
	}
	return result;
}

/**
 * For each id take the authoritative version; carry `{id, text}` (state
 * flags NEVER copy) for every one neither `revealed` nor `archived`, ordered
 * by first appearance (session number asc, then row order within that
 * session). Runs at session creation and via "Sync carried secrets".
 */
export function carryForward(priorSessions: readonly SessionModel[]): Secret[] {
	const occ = occurrencesById(priorSessions);
	const authoritative = latestVersions(priorSessions);

	const ids = [...occ.keys()].filter((id) => {
		const auth = authoritative.get(id);
		return auth !== undefined && !auth.secret.revealed && !auth.secret.archived;
	});

	ids.sort((a, b) => compareFirstAppearance(occ.get(a) ?? [], occ.get(b) ?? []));

	return ids.map((id) => {
		const auth = authoritative.get(id);
		// `auth` is guaranteed by the filter above, but keep TS happy without a
		// non-null assertion.
		return { id, text: auth?.secret.text ?? "" };
	});
}

/**
 * Strictly additive: the rows to APPEND to `current.secrets`. Ids already
 * present in `current` are skipped regardless of their state there
 * (archived/revealed current copies count as "present" — this is what makes
 * the operation safely re-runnable and never a source of resurrection or
 * overwrite). Never removes or overwrites anything in `current`.
 */
export function syncCarried(current: SessionModel, prior: readonly SessionModel[]): Secret[] {
	const carried = carryForward(prior);
	const existingIds = new Set(current.secrets.map((s) => s.id));
	return carried.filter((secret) => !existingIds.has(secret.id));
}

export type SecretState = "in-play" | "revealed" | "retired";

export interface DerivedSecret {
	id: string;
	text: string;
	state: SecretState;
	/** First-appearance session number. */
	originSession: number;
	/** Number of distinct sessions containing this id (including its origin
	 * and its authoritative session). Carried-count badges are derived from
	 * this at render time — never stored. */
	sessionsCarried: number;
	/** Vault path of the session note holding the authoritative copy — the
	 * write target for reveal/retire/restore and the "Open session" action. */
	authoritativeSessionPath: string;
	/** That session's number. */
	authoritativeSessionNumber: number;
	/** Session number where `revealed: true` lives — set only when
	 * `state === "revealed"` (always equal to `authoritativeSessionNumber`,
	 * since state flags only ever live on the authoritative copy). */
	revealedInSession?: number;
	/** Optional "how they learned it", only meaningful when revealed. */
	note?: string;
}

/**
 * The campaign-level fold: one row per secret id across every session, for
 * the dashboard card and the secrets ledger. Derived fresh every call —
 * nothing here is persisted.
 */
export function openSecrets(all: readonly SessionModel[]): DerivedSecret[] {
	const occ = occurrencesById(all);
	const authoritative = latestVersions(all);

	const result: DerivedSecret[] = [];
	for (const [id, auth] of authoritative) {
		const sessionsCarried = occ.get(id)?.length ?? 1;
		const state: SecretState = auth.secret.archived ? "retired" : auth.secret.revealed ? "revealed" : "in-play";
		result.push({
			id,
			text: auth.secret.text,
			state,
			originSession: auth.firstSeenIn,
			sessionsCarried,
			authoritativeSessionPath: auth.sessionPath,
			authoritativeSessionNumber: auth.sessionNumber,
			revealedInSession: state === "revealed" ? auth.sessionNumber : undefined,
			note: auth.secret.note,
		});
	}

	return result.sort((a, b) => a.originSession - b.originSession || a.id.localeCompare(b.id));
}

/**
 * True only when `id` appears in no session other than `current` — the only
 * time a UI delete may be a real row removal instead of an `archived: true`
 * tombstone (otherwise the prior copy would resurrect it on the next carry).
 */
export function canHardDelete(id: string, current: SessionModel, prior: readonly SessionModel[]): boolean {
	return !prior.some((session) => session.path !== current.path && session.secrets.some((secret) => secret.id === id));
}
