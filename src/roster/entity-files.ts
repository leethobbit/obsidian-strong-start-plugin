import { normalizePath, Notice, TFile, type App } from "obsidian";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { toSafeFilename } from "../lib/slug";
import { writeLocationFm, writeNpcFm, writePcFm, writeQuestFm } from "./entity-schema";
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

/** Exported for the 5e monster builder (src/dnd5e/monster-files.ts) — same
 * fixed-subfolder + collision-disambiguation policy for `type: monster`. */
export async function createEntityNote(
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

/** `body` lets the campaign creation wizard's party step (docs/plan.md M8)
 * seed a one-liner into the freeform PC body in one write. */
export async function createPcNote(app: App, campaign: CampaignModel, name: string, player: string, body = ""): Promise<TFile> {
	return createEntityNote(app, campaign, "PCs", name, writePcFm({ campaign: `[[${campaign.name}]]`, player }), body);
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

/**
 * Rename an entity note in place (M17, the entity editor's rename-on-save):
 * same collision-abort + `fileManager.renameFile` (wikilink-updating) logic as
 * `renameSessionNote` (src/sessions/session-files.ts), but returns the renamed
 * `TFile` so the caller's subsequent frontmatter/body writes target the new
 * path — a partial save under the old name is never acceptable. Returns null
 * on any abort (missing file, empty name, collision), after surfacing a
 * Notice.
 */
export async function renameEntityNote(app: App, path: string, newName: string): Promise<TFile | null> {
	const file = app.vault.getFileByPath(path);
	if (!(file instanceof TFile)) return null;

	const safeName = toSafeFilename(newName);
	if (safeName.length === 0) {
		new Notice("Give the note a name first.");
		return null;
	}
	if (safeName === file.basename) return file;

	const newPath = normalizePath(`${parentPath(path)}/${safeName}.md`);
	if (app.vault.getFileByPath(newPath)) {
		new Notice(`A note named "${safeName}" already exists there.`);
		return null;
	}
	await app.fileManager.renameFile(file, newPath);
	return file;
}

/** Quest notes (M15): the quest generator's "Save as note" target — a managed
 * `type: quest` entity under `<campaign>/Quests/`, linkable from scenes and
 * session chips like any other note. Body is freeform (the generated quest
 * outline seeds it). */
export async function createQuestNote(app: App, campaign: CampaignModel, name: string, body = ""): Promise<TFile> {
	return createEntityNote(
		app,
		campaign,
		"Quests",
		name,
		writeQuestFm({ campaign: `[[${campaign.name}]]`, status: "open" }),
		body
	);
}
