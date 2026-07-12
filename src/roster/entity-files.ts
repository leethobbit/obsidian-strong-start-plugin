import { normalizePath, type App, type TFile } from "obsidian";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { toSafeFilename } from "../lib/slug";
import { writeLocationFm, writeNpcFm, writePcFm } from "./entity-schema";
import type { CampaignModel } from "../campaigns/types";

/**
 * Create-note flows for the three lightweight entity types the prep board can
 * spawn (PC/NPC/location) — fixed subfolder names under the campaign folder
 * (AGENTS.md), no `id` field (SCHEMA.md has none for these types).
 */

function parentPath(filePath: string): string {
	const idx = filePath.lastIndexOf("/");
	return idx === -1 ? "" : filePath.slice(0, idx);
}

async function ensureFolder(app: App, path: string): Promise<void> {
	const normalized = normalizePath(path);
	if (!app.vault.getFolderByPath(normalized)) {
		await app.vault.createFolder(normalized);
	}
}

async function createEntityNote(
	app: App,
	campaign: CampaignModel,
	subfolder: string,
	name: string,
	fm: Record<string, unknown>,
	body = ""
): Promise<TFile> {
	const folderPath = normalizePath(`${parentPath(campaign.path)}/${subfolder}`);
	await ensureFolder(app, folderPath);

	const safeName = toSafeFilename(name);
	let filePath = normalizePath(`${folderPath}/${safeName}.md`);
	if (app.vault.getFileByPath(filePath)) {
		// Name collision — disambiguate rather than silently overwrite an
		// existing note (same policy as create-campaign.ts).
		filePath = normalizePath(`${folderPath}/${safeName} ${Date.now().toString(36)}.md`);
	}

	const file = await app.vault.create(filePath, body);
	await writeLazyFrontmatter(app, file, fm);
	return file;
}

export async function createPcNote(app: App, campaign: CampaignModel, name: string, player: string): Promise<TFile> {
	return createEntityNote(app, campaign, "PCs", name, writePcFm({ campaign: `[[${campaign.name}]]`, player }));
}

/** `body` lets generator "Save as note" flows (`src/generators/insert.ts`)
 * seed the freeform NPC body in one write instead of create-then-append. */
export async function createNpcNote(app: App, campaign: CampaignModel, name: string, body = ""): Promise<TFile> {
	return createEntityNote(
		app,
		campaign,
		"NPCs",
		name,
		writeNpcFm({ campaign: `[[${campaign.name}]]`, status: "alive" }),
		body
	);
}

/** `body` lets generator "Save as note" flows seed `## Aspects` in one write
 * (SCHEMA.md: location body carries the three fantastic aspects as bullets). */
export async function createLocationNote(app: App, campaign: CampaignModel, name: string, body = ""): Promise<TFile> {
	return createEntityNote(app, campaign, "Locations", name, writeLocationFm({ campaign: `[[${campaign.name}]]` }), body);
}
