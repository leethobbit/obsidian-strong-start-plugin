import { normalizePath, TFile, type App } from "obsidian";
import { asLazy, writeLazyFrontmatter } from "../lib/frontmatter";
import { beginSelfWrite } from "../lib/self-write";
import { replaceSection, sectionContent } from "../lib/sections";
import { tryFileOp } from "../lib/notify";
import { readSessionZeroFm, sessionZeroBodyScaffold, writeSessionZeroFm, type SessionZeroFm } from "./session-zero-schema";
import type { CampaignModel } from "../campaigns/types";
import type { CampaignStore } from "../campaigns/campaign-store";

function parentPath(filePath: string): string {
	const idx = filePath.lastIndexOf("/");
	return idx === -1 ? "" : filePath.slice(0, idx);
}

/**
 * Find `campaign`'s session-zero note via the store, or create one at the
 * fixed default path `<campaign folder>/Session zero.md` (SCHEMA.md: one per
 * campaign) with a blank fm + scaffolded body. Mirrors `createNextSession`'s
 * create-if-absent shape, minus the numbering (there's only ever one).
 * Callers are UI entry points and should wrap this in `tryFileOp`.
 */
export async function ensureSessionZeroNote(app: App, campaign: CampaignModel, store: CampaignStore): Promise<TFile> {
	const existing = store.sessionZeroOf(campaign.path);
	if (existing) {
		const file = app.vault.getFileByPath(existing.path);
		if (file instanceof TFile) return file;
	}

	const filePath = normalizePath(`${parentPath(campaign.path)}/Session zero.md`);
	const already = app.vault.getFileByPath(filePath);
	if (already instanceof TFile) return already; // race: created between the store lookup and here

	const file = await app.vault.create(filePath, sessionZeroBodyScaffold());
	const model: SessionZeroFm = { campaign: `[[${campaign.name}]]`, done: [], lines: [], veils: [] };
	await writeLazyFrontmatter(app, file, writeSessionZeroFm(model));
	return file;
}

/**
 * Read the session-zero note's current content for display/parsing (M17) —
 * mirror of `readCampaignBody` (src/campaigns/campaign-files.ts). Empty
 * string when the note can't be found.
 */
export async function readSessionZeroBody(app: App, path: string): Promise<string> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return "";
	return app.vault.cachedRead(file);
}

/**
 * Write one managed body section (`## Expectations` / `## Logistics`) on the
 * session-zero note at `path` — self-write marked and diff-guarded, mirror of
 * `writeCampaignSection` (M17: the Home / Session zero editors).
 */
export async function writeSessionZeroSection(app: App, path: string, heading: string, content: string): Promise<void> {
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
 * Patch the session-zero note at `path` — self-write marked, mirroring
 * `sessions/session-files.ts`'s `patchSessionSecrets`. Silently no-ops if the
 * file is gone or unreadable; callers wrap this in `tryFileOp`.
 */
export async function patchSessionZero(
	app: App,
	path: string,
	mutate: (fm: SessionZeroFm) => SessionZeroFm
): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return;

	const cache = app.metadataCache.getFileCache(file);
	const fm = readSessionZeroFm(asLazy(cache?.frontmatter));
	if (!fm) return;

	const next = mutate(fm);
	const done = beginSelfWrite(path);
	try {
		await writeLazyFrontmatter(app, file, writeSessionZeroFm(next));
	} finally {
		done();
	}
}
