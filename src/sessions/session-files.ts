import { normalizePath, type App, type TFile } from "obsidian";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { sessionBodyScaffold, writeSessionFm, type SessionFm } from "./session-schema";
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
 * M1 seam: secret carry-over plugs in here. Read `store.sessionsOf(campaign.path)`
 * for prior sessions, run `carryForward()` (src/sessions/carryover.ts, M4), and
 * fold the result into `secrets` below before the frontmatter write.
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
		date: new Date().toISOString().slice(0, 10),
		status: "prep",
		stepsDone: [],
		secrets: [], // M1 seam: carry-forward secrets land here (M4).
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
