// Obsidian glue — the Whitesparrow starter campaign (docs/plan.md M16): one
// command that builds the document's own CC-BY starter village + adventure as
// a ready-to-run campaign — foundation filled from the village, eight NPC
// notes, five location notes (aspects verbatim from the source), the Night
// Blade quest, and session 1 prepped through every step except the party
// (those chairs belong to the GM's real players). Unlike the demo campaign
// (synthetic, mid-campaign, for evaluating the loop), this is content a GM
// can take to the table this week. Deleting the campaign folder removes all
// of it.

import { normalizePath, type App, type TFile } from "obsidian";
import { createCampaignNote } from "./create-campaign";
import { createLocationNote, createNpcNote, createQuestNote } from "../roster/entity-files";
import { writeNpcFm } from "../roster/entity-schema";
import { sessionBodyScaffold, writeSessionFm, type SessionFm } from "../sessions/session-schema";
import { replaceSection } from "../lib/sections";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { newId } from "../lib/id";
import {
	NIGHT_BLADE_QUEST,
	NIGHT_BLADE_SESSION,
	WHITESPARROW_FRONT,
	WHITESPARROW_LOCATIONS,
	WHITESPARROW_NAME,
	WHITESPARROW_NPCS,
	WHITESPARROW_PITCH,
	WHITESPARROW_TRUTHS,
} from "../content/whitesparrow";
import type { CampaignModel } from "./types";

function parentPath(filePath: string): string {
	const idx = filePath.lastIndexOf("/");
	return idx === -1 ? "" : filePath.slice(0, idx);
}

function localIsoDate(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Create the whole starter campaign; returns the campaign note. */
export async function createStarterCampaign(app: App, campaignRoot: string): Promise<{ file: TFile; id: string }> {
	const created = await createCampaignNote(app, campaignRoot, WHITESPARROW_NAME, "5e", {
		pitch: WHITESPARROW_PITCH,
		truths: WHITESPARROW_TRUTHS,
		fronts: [WHITESPARROW_FRONT],
	});

	const name = created.file.basename;
	const campaign: CampaignModel = {
		id: created.id,
		name,
		path: created.file.path,
		system: "5e",
		status: "active",
	};

	for (const npc of WHITESPARROW_NPCS) {
		const file = await createNpcNote(app, campaign, npc.name, npc.body);
		await writeLazyFrontmatter(app, file, writeNpcFm({ campaign: `[[${name}]]`, role: npc.role, status: "alive" }));
	}

	for (const location of WHITESPARROW_LOCATIONS) {
		const body = `## Aspects\n${location.aspects.map((a) => `- ${a}`).join("\n")}\n\n${location.body}`;
		await createLocationNote(app, campaign, location.name, body);
	}

	await createQuestNote(app, campaign, NIGHT_BLADE_QUEST.title, `${NIGHT_BLADE_QUEST.body}\n`);

	// Session 1: prepped through every step except Characters — those chairs
	// belong to the GM's real players.
	const sessionsFolder = normalizePath(`${parentPath(campaign.path)}/Sessions`);
	if (!app.vault.getFolderByPath(sessionsFolder)) await app.vault.createFolder(sessionsFolder);

	const adventure = NIGHT_BLADE_SESSION;
	let body = sessionBodyScaffold();
	body = replaceSection(body, "Strong start", adventure.strongStart);
	body = replaceSection(body, "Scenes", adventure.scenes.map((s) => `- [ ] ${s}`).join("\n"));
	body = replaceSection(body, "Rewards", adventure.rewards.map((r) => `- ${r}`).join("\n"));

	const fm: SessionFm = {
		campaign: `[[${name}]]`,
		session: 1,
		date: localIsoDate(),
		status: "prep",
		stepsDone: ["strong-start", "scenes", "secrets", "locations", "npcs", "monsters", "rewards"],
		secrets: adventure.secrets.map((text) => ({ id: newId("s"), text })),
		npcs: [...adventure.npcs],
		locations: [...adventure.locations],
		monsters: [...adventure.monsters],
	};

	const sessionFile = await app.vault.create(normalizePath(`${sessionsFolder}/Session 1.md`), body);
	await writeLazyFrontmatter(app, sessionFile, writeSessionFm(fm));

	return created;
}
