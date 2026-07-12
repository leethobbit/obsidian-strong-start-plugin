// Pure — no `obsidian` import. Secrets CRUD for the Secrets step
// (src/views/prep/steps/secrets.ts) and the secrets ledger
// (src/views/secrets/secrets-panel.ts). Callers persist the result through
// the session codec (`writeSessionFm`) + `processFrontMatter`.

import type { Secret } from "./types";

/** Append a brand-new secret. `id` is caller-supplied (`newId("s")`) so this
 * stays pure and deterministic under test. */
export function addSecret(secrets: readonly Secret[], id: string, text: string): Secret[] {
	return [...secrets, { id, text }];
}

export function editSecretText(secrets: readonly Secret[], id: string, text: string): Secret[] {
	return secrets.map((secret) => (secret.id === id ? { ...secret, text } : secret));
}

/** True row removal. Only safe to call when `canHardDelete` (carryover.ts)
 * says the id has no earlier copy to resurrect it — see `deleteSecretSafely`
 * for the one call site that's supposed to make that decision. */
export function removeSecret(secrets: readonly Secret[], id: string): Secret[] {
	return secrets.filter((secret) => secret.id !== id);
}

/** Tombstone: `archived: true` on the matching row. Never removes the row —
 * a tombstone must stay present so a later carry doesn't mistake absence for
 * "never seen" and resurrect it. */
export function archiveSecret(secrets: readonly Secret[], id: string): Secret[] {
	return secrets.map((secret) => (secret.id === id ? { ...secret, archived: true } : secret));
}

/** Undo a tombstone: strips `archived` back off, leaving every other field
 * (including `text`) untouched. */
export function restoreSecret(secrets: readonly Secret[], id: string): Secret[] {
	return secrets.map((secret) => {
		if (secret.id !== id) return secret;
		const rest = { ...secret };
		delete rest.archived;
		return rest;
	});
}

/** Marks a secret revealed, optionally capturing "how they learned it". An
 * empty/whitespace-only note is treated as "no note" rather than clobbering
 * an existing one with blank text. */
export function revealSecret(secrets: readonly Secret[], id: string, note?: string): Secret[] {
	const trimmed = note?.trim();
	return secrets.map((secret) =>
		secret.id === id ? { ...secret, revealed: true, note: trimmed && trimmed.length > 0 ? trimmed : secret.note } : secret
	);
}

/** Undo a run-mode reveal within its transient Undo window (docs/plan.md M6):
 * strips `revealed` back off, leaving every other field (including any
 * `note`) untouched. */
export function unrevealSecret(secrets: readonly Secret[], id: string): Secret[] {
	return secrets.map((secret) => {
		if (secret.id !== id) return secret;
		const rest = { ...secret };
		delete rest.revealed;
		return rest;
	});
}

/**
 * The one delete helper every UI delete/retire action routes through
 * (AGENTS.md "Secrets" rule): tombstones instead of removing whenever the id
 * has a copy in an earlier session, hard-removes otherwise. Callers compute
 * `hardDeleteAllowed` with `canHardDelete` (carryover.ts) — kept as a plain
 * boolean parameter here so this module stays free of any `SessionModel`
 * shape, just row-array transforms.
 */
export function deleteSecretSafely(secrets: readonly Secret[], id: string, hardDeleteAllowed: boolean): Secret[] {
	return hardDeleteAllowed ? removeSecret(secrets, id) : archiveSecret(secrets, id);
}
