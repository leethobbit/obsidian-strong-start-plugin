import { TFile, type App } from "obsidian";
import { replaceSection, sectionContent } from "../lib/sections";
import { beginSelfWrite } from "../lib/self-write";
import { tryFileOp } from "../lib/notify";

/**
 * Read a campaign note's current body text for display/parsing — `cachedRead`
 * per AGENTS.md ("Vault API: `cachedRead()` for display"). Empty string if
 * the note can't be found (moved/deleted out from under an open panel).
 */
export async function readCampaignBody(app: App, path: string): Promise<string> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return "";
	return app.vault.cachedRead(file);
}

/**
 * Write one managed body section on the campaign note at `path` — self-write
 * marked (so the Dashboard/Foundation panels' own store-notification handling
 * can tell this apart from an external edit) and diff-guarded (skips the
 * write entirely if nothing changed, same policy as the prep board's
 * `writeSection`). Shared by the Dashboard fronts card's pip toggle and every
 * Foundation sub-tab editor so both stay on one write path.
 */
export async function writeCampaignSection(app: App, path: string, heading: string, content: string): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return;

	const done = beginSelfWrite(file.path);
	try {
		await tryFileOp(async () => {
			await app.vault.process(file, (body) => {
				if (sectionContent(body, heading) === content.replace(/\s+$/, "")) return body;
				return replaceSection(body, heading, content);
			});
		}, "Couldn't save that change — check the console for details.");
	} finally {
		done();
	}
}

/**
 * Read-modify-write one managed section against the note's CURRENT content —
 * `mutate` receives the section as it exists on disk at write time, never a
 * panel's cached copy, so a toggle can't clobber edits made elsewhere since
 * the panel last rendered (the Dashboard fronts card learned this the hard
 * way). Returns the resulting whole body (frontmatter included) so the caller
 * can refresh its cache from truth, or null when the note is missing or the
 * write failed (`tryFileOp` has already surfaced the Notice).
 */
export async function updateCampaignSection(
	app: App,
	path: string,
	heading: string,
	mutate: (current: string) => string
): Promise<string | null> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return null;

	const done = beginSelfWrite(file.path);
	try {
		let result: string | null = null;
		const ok = await tryFileOp(async () => {
			await app.vault.process(file, (body) => {
				const current = sectionContent(body, heading);
				const next = mutate(current);
				const out = next === current ? body : replaceSection(body, heading, next);
				result = out;
				return out;
			});
		}, "Couldn't save that change — check the console for details.");
		return ok === null ? null : result;
	} finally {
		done();
	}
}
