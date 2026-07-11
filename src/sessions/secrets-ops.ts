// Pure — no `obsidian` import. Secrets CRUD for the Secrets step
// (src/views/prep/steps/secrets.ts). Callers persist the result through the
// session codec (`writeSessionFm`) + `processFrontMatter`.

import type { Secret } from "./types";

/** Append a brand-new secret. `id` is caller-supplied (`newId("s")`) so this
 * stays pure and deterministic under test. */
export function addSecret(secrets: readonly Secret[], id: string, text: string): Secret[] {
	return [...secrets, { id, text }];
}

export function editSecretText(secrets: readonly Secret[], id: string, text: string): Secret[] {
	return secrets.map((secret) => (secret.id === id ? { ...secret, text } : secret));
}

/**
 * M4: once carry-over lands, deleting a secret that also exists in an
 * earlier session must write `archived: true` (a tombstone) instead of
 * removing the row — otherwise the next carry-forward would resurrect it
 * (SCHEMA.md "secret carry-over semantics"). M2 has no carry-over yet, so
 * every secret originates in the current session and plain removal is
 * correct for now.
 */
export function removeSecret(secrets: readonly Secret[], id: string): Secret[] {
	return secrets.filter((secret) => secret.id !== id);
}
