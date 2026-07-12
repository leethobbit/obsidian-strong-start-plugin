import { normalizePath, TFile, type App } from "obsidian";
import { asLazy, writeLazyFrontmatter } from "../lib/frontmatter";
import { beginSelfWrite } from "../lib/self-write";
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
