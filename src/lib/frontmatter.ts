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
 * Write the plugin's namespaced frontmatter through `processFrontMatter`,
 * pruning falsey/empty leaves first. If pruning leaves nothing, the whole
 * `lazyCampaign` key is deleted rather than assigned as `{}`.
 */
export async function writeLazyFrontmatter(
	app: App,
	file: TFile,
	value: Record<string, unknown>
): Promise<void> {
	const pruned = pruneEmpty(value);
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		if (Object.keys(pruned).length === 0) {
			delete frontmatter.lazyCampaign;
		} else {
			frontmatter.lazyCampaign = pruned;
		}
	});
}
