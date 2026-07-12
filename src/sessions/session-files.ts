import { normalizePath, TFile, type App } from "obsidian";
import { asLazy, writeLazyFrontmatter } from "../lib/frontmatter";
import { beginSelfWrite } from "../lib/self-write";
import { carryForward } from "./carryover";
import { readSessionFm, sessionBodyScaffold, writeSessionFm, type SessionFm } from "./session-schema";
import type { Secret } from "./types";
import type { CampaignModel } from "../campaigns/types";
import type { CampaignStore } from "../campaigns/campaign-store";
import type { LazyCampaignPluginSettings } from "../settings/settings";

/**
 * Create the next-numbered session note for `campaign` (number = highest
 * existing session + 1, or 1 if there are none yet) and return the file.
 *
 * `settings` isn't used yet — session paths are always `<campaign folder>/Sessions/`,
 * a fixed subfolder name (AGENTS.md) — it's threaded through so a future
 * per-campaign override doesn't have to change every call site.
 *
 * Secrets seed from `carryForward(existing)` (src/sessions/carryover.ts) —
 * every existing session is necessarily "prior" to the one being created.
 */
export async function createNextSession(
	app: App,
	_settings: LazyCampaignPluginSettings,
	campaign: CampaignModel,
	store: CampaignStore
): Promise<TFile> {
	const existing = store.sessionsOf(campaign.path);
	const nextNumber = existing.length > 0 ? Math.max(...existing.map((s) => s.session)) + 1 : 1;

	const folderPath = normalizePath(`${parentPath(campaign.path)}/Sessions`);
	if (!app.vault.getFolderByPath(folderPath)) {
		await app.vault.createFolder(folderPath);
	}

	const filePath = normalizePath(`${folderPath}/Session ${nextNumber}.md`);
	const file = await app.vault.create(filePath, sessionBodyScaffold());

	const model: SessionFm = {
		campaign: `[[${campaign.name}]]`,
		session: nextNumber,
		// Local date, not toISOString (UTC): a GM prepping in the evening
		// should not get tomorrow's date on the session.
		date: localIsoDate(),
		status: "prep",
		stepsDone: [],
		secrets: carryForward(existing),
		npcs: [],
		locations: [],
		monsters: [],
	};
	await writeLazyFrontmatter(app, file, writeSessionFm(model));

	return file;
}

function parentPath(filePath: string): string {
	const idx = filePath.lastIndexOf("/");
	return idx === -1 ? "" : filePath.slice(0, idx);
}

function localIsoDate(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Patch the `secrets[]` array on an arbitrary session note by path — the
 * secrets ledger's (`src/views/secrets/secrets-panel.ts`) reveal/retire/
 * restore actions target whichever session holds the authoritative copy,
 * which is not necessarily the session currently open in the prep board (that
 * path has its own `patchFrontmatter` wired through focus-preserve/self-write,
 * see `prep-panel.ts`). Silently no-ops if the file is gone or isn't a
 * readable session note — callers are UI entry points and should wrap this in
 * `tryFileOp` for user-facing failure surfacing.
 */
export async function patchSessionSecrets(
	app: App,
	path: string,
	mutate: (secrets: Secret[]) => Secret[]
): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return;

	const cache = app.metadataCache.getFileCache(file);
	const fm = readSessionFm(asLazy(cache?.frontmatter));
	if (!fm) return;

	const next: SessionFm = { ...fm, secrets: mutate(fm.secrets) };
	const done = beginSelfWrite(path);
	try {
		await writeLazyFrontmatter(app, file, writeSessionFm(next));
	} finally {
		done();
	}
}
