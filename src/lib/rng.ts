// Pure — no `obsidian` import. Seedable RNG (mulberry32) so table rolls are
// deterministic under vitest; real play uses the `Date.now()`-derived default
// (docs/plan.md "Content pipeline & rolling engine": "RNG injected/seedable
// → deterministic tests"). Callers hold onto the returned closure and call it
// repeatedly — each call advances the generator's internal state.

export function createRng(seed: number = Date.now()): () => number {
	let state = seed >>> 0;

	return function next(): number {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
