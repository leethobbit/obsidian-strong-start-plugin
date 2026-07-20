import type { App, TFile } from "obsidian";

/**
 * Read the plugin's namespaced frontmatter object leniently from a
 * `metadataCache` frontmatter blob. Returns null if absent or malformed —
 * callers still run the result through a per-type codec (`*-schema.ts`) for
 * field-level validation.
 */
export function asLazy(frontmatter: unknown): Record<string, unknown> | null {
	if (typeof frontmatter !== "object" || frontmatter === null) return null;
	const value = (frontmatter as Record<string, unknown>).lazyCampaign;
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

/**
 * "Cleared = deleted" (SCHEMA.md): strip `false`, empty strings, empty arrays
 * and empty plain objects from a canonical write payload before it's assigned
 * under `lazyCampaign`. Recurses into nested objects/arrays — enough for the
 * flat shapes every note type uses.
 */
export function pruneEmpty(value: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, raw] of Object.entries(value)) {
		const pruned = pruneValue(raw);
		if (pruned !== undefined) result[key] = pruned;
	}
	return result;
}

function pruneValue(raw: unknown): unknown {
	if (raw === false || raw === "" || raw === null || raw === undefined) return undefined;
	if (Array.isArray(raw)) {
		const items = raw.map(pruneValue).filter((item) => item !== undefined);
		return items.length > 0 ? items : undefined;
	}
	if (typeof raw === "object") {
		const pruned = pruneEmpty(raw as Record<string, unknown>);
		return Object.keys(pruned).length > 0 ? pruned : undefined;
	}
	return raw;
}

/**
 * Forward-compatibility seam for SCHEMA.md 1.0's additive-only promise: merge
 * any sibling key under the file's CURRENT `lazyCampaign` object that this
 * write doesn't own back into the payload it's about to write, so a field a
 * newer plugin version added (and this version has never heard of) survives
 * being written by an older codec instead of being silently deleted.
 *
 * The owned/unknown line is drawn from `ownedKeys` — every key the calling
 * codec's `write*Fm` can ever emit, taken from the UNPRUNED payload (every
 * `write*Fm` in this codebase emits all of its fields unconditionally, using
 * `?? ""`/`?? false`-style defaults, specifically so this set is always
 * complete — see AGENTS.md "Adding or changing a frontmatter field"). A key
 * in `ownedKeys` is never copied from `existing`, even if `pruned` dropped it
 * ("cleared = deleted" for known fields) — only keys the codec has never
 * heard of pass through untouched.
 */
export function mergeUnknownKeys(
	pruned: Record<string, unknown>,
	existing: unknown,
	ownedKeys: ReadonlySet<string>
): Record<string, unknown> {
	if (typeof existing !== "object" || existing === null || Array.isArray(existing)) return pruned;
	const merged = { ...pruned };
	for (const [key, value] of Object.entries(existing as Record<string, unknown>)) {
		if (!ownedKeys.has(key)) merged[key] = value;
	}
	return merged;
}

/**
 * The full write-side rule (prune + unknown-key merge + delete-when-empty),
 * pulled out of the `processFrontMatter` callback so it's covered by a plain
 * unit test against a fake `frontmatter` object — no `App`/`TFile` needed.
 */
export function applyLazyWrite(frontmatter: Record<string, unknown>, value: Record<string, unknown>): void {
	const ownedKeys = new Set(Object.keys(value));
	const pruned = pruneEmpty(value);
	const merged = mergeUnknownKeys(pruned, frontmatter.lazyCampaign, ownedKeys);
	if (Object.keys(merged).length === 0) {
		delete frontmatter.lazyCampaign;
	} else {
		frontmatter.lazyCampaign = merged;
	}
}

/**
 * Write the plugin's namespaced frontmatter through `processFrontMatter`,
 * pruning falsey/empty leaves first and preserving unknown sibling keys
 * (`mergeUnknownKeys`). If pruning (plus any surviving unknown keys) leaves
 * nothing, the whole `lazyCampaign` key is deleted rather than assigned as
 * `{}`.
 */
export async function writeLazyFrontmatter(
	app: App,
	file: TFile,
	value: Record<string, unknown>
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		applyLazyWrite(frontmatter, value);
	});
}

/**
 * Read-modify-write form for callers that need to mutate based on the note's
 * OWN current state rather than a value they already have in hand (M4 fix):
 * `mutate` receives the file's actual current `lazyCampaign` object (as
 * handed to the `processFrontMatter` callback, never `metadataCache`, which
 * can lag a just-completed write) run through `asLazy`, and returns the next
 * canonical write payload (typically the codec's `write*Fm(...)` of a
 * reader+mutate result). Returning `null` aborts the write (e.g. the codec
 * couldn't make sense of the current state). Same pruning + unknown-key
 * passthrough as `writeLazyFrontmatter`.
 */
export async function mutateLazyFrontmatter(
	app: App,
	file: TFile,
	mutate: (current: Record<string, unknown> | null) => Record<string, unknown> | null
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		const next = mutate(asLazy(frontmatter));
		if (next === null) return;
		applyLazyWrite(frontmatter, next);
	});
}
