// Registry the plugin's own write paths mark before writing, so campaign-store
// change subscribers can tell "I just wrote this" apart from "something else
// changed this note" (AGENTS.md risk #2 — the prep-board re-render vs typing
// focus problem). No `obsidian` import needed; lives beside `focus-preserve.ts`
// as the other half of the pattern.

/** Cap on how long a single in-flight write keeps its mark — a write that
 * hangs past this must not suppress external-edit rebuilds forever. */
const GRACE_MS = 1500;
/** How long the mark survives after the LAST in-flight write's `done()` —
 * the `metadataCache` re-index (and the store notification it produces)
 * normally lands AFTER the write promise resolves, so releasing the mark
 * instantly would defeat the mechanism for the common ordering, not just
 * the tick-late edge case. */
const DONE_GRACE_MS = 750;

interface Mark {
	/** Writes currently between `beginSelfWrite` and their `done()`. */
	inflight: number;
	expiry: number;
}

const active = new Map<string, Mark>(); // vault path -> mark

/**
 * Mark `path` as being written by the plugin's own code. Call immediately
 * before the write; call the returned `done()` right after it settles
 * (success or failure). The mark outlives `done()` by `DONE_GRACE_MS` so the
 * write's own cache echo still reads as a self-write; overlapping writes are
 * counted, so one write's settlement never releases another's mark early.
 */
export function beginSelfWrite(path: string): () => void {
	const mark = active.get(path) ?? { inflight: 0, expiry: 0 };
	mark.inflight++;
	mark.expiry = Math.max(mark.expiry, Date.now() + GRACE_MS);
	active.set(path, mark);

	let released = false;
	return () => {
		if (released) return; // tolerate a double `done()` from a retry path
		released = true;
		mark.inflight--;
		if (mark.inflight <= 0) {
			mark.inflight = 0;
			mark.expiry = Date.now() + DONE_GRACE_MS;
		}
	};
}

/**
 * True if `path` was written by the plugin itself within the grace window.
 * Store subscribers use this to take the "soft path" (update in-memory model,
 * skip DOM rebuild) for their own writes, while still doing a full reconcile
 * for genuinely external changes.
 */
export function isSelfWrite(path: string): boolean {
	const mark = active.get(path);
	if (mark === undefined) return false;
	if (Date.now() > mark.expiry) {
		active.delete(path);
		return false;
	}
	return true;
}
