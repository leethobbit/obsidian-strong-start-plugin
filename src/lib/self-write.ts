// Registry the plugin's own write paths mark before writing, so campaign-store
// change subscribers can tell "I just wrote this" apart from "something else
// changed this note" (AGENTS.md risk #2 — the prep-board re-render vs typing
// focus problem). No `obsidian` import needed; lives beside `focus-preserve.ts`
// as the other half of the pattern.

const GRACE_MS = 1500;

const active = new Map<string, number>(); // vault path -> grace-window expiry

/**
 * Mark `path` as being written by the plugin's own code. Call immediately
 * before the write; call the returned `done()` right after it settles
 * (success or failure) to release the mark — the grace window past that is
 * just a backstop for a `metadataCache` notification that lands a tick late.
 */
export function beginSelfWrite(path: string): () => void {
	active.set(path, Date.now() + GRACE_MS);
	return () => {
		active.delete(path);
	};
}

/**
 * True if `path` was written by the plugin itself within the grace window.
 * Store subscribers use this to take the "soft path" (update in-memory model,
 * skip DOM rebuild) for their own writes, while still doing a full reconcile
 * for genuinely external changes.
 */
export function isSelfWrite(path: string): boolean {
	const expiry = active.get(path);
	if (expiry === undefined) return false;
	if (Date.now() > expiry) {
		active.delete(path);
		return false;
	}
	return true;
}
