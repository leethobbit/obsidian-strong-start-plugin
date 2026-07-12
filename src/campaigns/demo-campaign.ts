// Obsidian glue — the demo campaign generator (docs/plan.md M14): one command
// that builds a complete, believable campaign for first-run evaluation — a
// filled foundation, a party, NPCs and locations, a session zero with safety
// tools, one PLAYED session (with recap, log, and revealed secrets) and one
// session mid-prep with carried secrets. Everything goes through the same
// create/codec paths real usage does, so the demo doubles as an end-to-end
// exercise of the data model; deleting the campaign folder removes all of it.

import { normalizePath, type App, type TFile } from "obsidian";
import { createCampaignNote } from "./create-campaign";
import { createNpcNote, createLocationNote, createPcNote } from "../roster/entity-files";
import { writeNpcFm, writePcFm } from "../roster/entity-schema";
import { writeSessionZeroFm, sessionZeroBodyScaffold } from "../checklist/session-zero-schema";
import { sessionBodyScaffold, writeSessionFm, type SessionFm } from "../sessions/session-schema";
import { carryForward } from "../sessions/carryover";
import { replaceSection } from "../lib/sections";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { newId } from "../lib/id";
import type { CampaignModel } from "./types";

export const DEMO_CAMPAIGN_NAME = "Emberfall (demo)";

function parentPath(filePath: string): string {
	const idx = filePath.lastIndexOf("/");
	return idx === -1 ? "" : filePath.slice(0, idx);
}

function isoDaysAgo(days: number): string {
	const d = new Date(Date.now() - days * 86_400_000);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Create the whole demo campaign; returns the campaign note. */
export async function createDemoCampaign(app: App, campaignRoot: string): Promise<{ file: TFile; id: string }> {
	const created = await createCampaignNote(app, campaignRoot, DEMO_CAMPAIGN_NAME, "5e", {
		pitch: "The volcanic city of Emberfall has stood for a thousand years on the back of a sleeping fire titan. Last month, it twitched.",
		truths: [
			"The titan's dreams leak into the city as minor magic.",
			"The Ashen Court rules from the caldera rim and fears the commons.",
			"Firemages are licensed; unlicensed flame is a capital crime.",
			"The undercity is older than the titan cult admits.",
			"No bird will fly over Emberfall.",
			"Every family keeps a go-bag by the door.",
		],
		fronts: [
			{
				name: "The Cult of the Waking Flame",
				goal: "Wake the titan and ride the eruption to godhood.",
				portents: ["Tremors reach the market district", "A licensed firemage disappears", "The eastern vents glow at night"],
				doom: "Emberfall burns and the titan walks.",
			},
		],
	});

	const name = created.file.basename;
	const campaign: CampaignModel = {
		id: created.id,
		name,
		path: created.file.path,
		system: "5e",
		status: "active",
	};
	const folder = parentPath(campaign.path);

	// --- Party ---------------------------------------------------------------
	const pcs: Array<{ name: string; player: string; role: string; level: number }> = [
		{ name: "Sera Vane", player: "Alex", role: "rogue", level: 3 },
		{ name: "Brother Cald", player: "Sam", role: "cleric", level: 3 },
		{ name: "Tikka Emberborn", player: "Rowan", role: "sorcerer", level: 3 },
	];
	for (const pc of pcs) {
		const file = await createPcNote(app, campaign, pc.name, pc.player, `Plays ${pc.role}; hates the Ashen Court.`);
		await writeLazyFrontmatter(
			app,
			file,
			writePcFm({ campaign: `[[${name}]]`, player: pc.player, role: pc.role, level: pc.level })
		);
	}

	// --- NPCs & locations -----------------------------------------------------
	const magistrate = await createNpcNote(app, campaign, "Magistrate Orsina", "Licenses firemages; owes the party a favor.");
	await writeLazyFrontmatter(
		app,
		magistrate,
		writeNpcFm({ campaign: `[[${name}]]`, role: "magistrate", status: "alive" })
	);
	await createNpcNote(app, campaign, "Hush", "A fence in the undercity who speaks only in questions.");
	await createLocationNote(
		app,
		campaign,
		"The Cinder Market",
		"## Aspects\n- Stalls roofed with salvaged dragon scale\n- Air shimmers above the vent grates\n- Everyone watches the smoke column"
	);
	await createLocationNote(
		app,
		campaign,
		"The Sleeping Face",
		"## Aspects\n- A cliff that is unmistakably a cheekbone\n- Prayer chains bolted to the eyelid\n- Warm to the touch, and getting warmer"
	);

	// --- Session zero ----------------------------------------------------------
	const zeroPath = normalizePath(`${folder}/Session zero.md`);
	if (!app.vault.getFileByPath(zeroPath)) {
		let zeroBody = sessionZeroBodyScaffold();
		zeroBody = replaceSection(zeroBody, "Expectations", "Weekly, three hours, heist-heavy. Rules light, fiction first.");
		const zeroFile = await app.vault.create(zeroPath, zeroBody);
		await writeLazyFrontmatter(
			app,
			zeroFile,
			writeSessionZeroFm({
				campaign: `[[${name}]]`,
				done: ["one-page-guide", "describe-theme", "safety-discussion"],
				lines: ["harm to children"],
				veils: ["torture"],
			})
		);
	}

	// --- Sessions: one played, one mid-prep ------------------------------------
	const sessionsFolder = normalizePath(`${folder}/Sessions`);
	if (!app.vault.getFolderByPath(sessionsFolder)) await app.vault.createFolder(sessionsFolder);

	const s1Secrets = [
		{ id: newId("s"), text: "The tremors are the titan dreaming of drowning.", revealed: true, note: "Cald's ritual vision" },
		{ id: newId("s"), text: "Magistrate Orsina signs the cult's permits without reading them." },
		{ id: newId("s"), text: "Hush was born above ground — nobility, in fact." },
	];
	const session1: SessionFm = {
		campaign: `[[${name}]]`,
		session: 1,
		date: isoDaysAgo(7),
		status: "played",
		stepsDone: ["characters", "strong-start", "scenes", "secrets", "locations", "npcs", "monsters", "rewards"],
		secrets: s1Secrets,
		npcs: ["[[Magistrate Orsina]]", "[[Hush]]"],
		locations: ["[[The Cinder Market]]"],
		monsters: ["4 × ash sprites", "1 cinder hound"],
	};
	let s1Body = sessionBodyScaffold();
	s1Body = replaceSection(
		s1Body,
		"Strong start",
		"The Cinder Market's vent grates blow OPEN mid-haggle — a wall of hot air, then silence, then the whole crowd hears the city *breathe in*."
	);
	s1Body = replaceSection(
		s1Body,
		"Scenes",
		"- [x] Panic in the Cinder Market\n- [x] Orsina requests a quiet favor\n- [x] Descent to the undercity\n- [ ] Hush names a price"
	);
	s1Body = replaceSection(s1Body, "Rewards", "- A firemage license, blank and pre-signed\n- 120 gp in cult tithe-marks");
	s1Body = replaceSection(
		s1Body,
		"Log",
		"- 19:12 Tikka bluffed the vent-warden with the blank license\n- 20:03 Cald's vision — the titan dreams of water\n- 21:40 party took the undercity stairs"
	);
	s1Body = replaceSection(
		s1Body,
		"Recap",
		"The vents opened, the city breathed, and the party went down instead of up. Orsina owes them; Hush is expecting them."
	);
	const s1File = await app.vault.create(normalizePath(`${sessionsFolder}/Session 1.md`), s1Body);
	await writeLazyFrontmatter(app, s1File, writeSessionFm(session1));

	const session1Model = { ...session1, path: s1File.path };
	const session2: SessionFm = {
		campaign: `[[${name}]]`,
		session: 2,
		date: isoDaysAgo(0),
		status: "prep",
		stepsDone: ["characters", "strong-start"],
		secrets: [
			...carryForward([session1Model]),
			{ id: newId("s"), text: "The cult's permits are for digging, not burning." },
		],
		npcs: ["[[Hush]]"],
		locations: ["[[The Sleeping Face]]"],
		monsters: [],
	};
	let s2Body = sessionBodyScaffold();
	s2Body = replaceSection(
		s2Body,
		"Strong start",
		"Hush's price: 'What did the city inhale, and where do you think it goes when it exhales?' The tunnel behind them starts to glow."
	);
	s2Body = replaceSection(s2Body, "Scenes", "- [ ] Hush's bargain\n- [ ] The glowing tunnel\n- [ ] First sight of the Sleeping Face");
	const s2File = await app.vault.create(normalizePath(`${sessionsFolder}/Session 2.md`), s2Body);
	await writeLazyFrontmatter(app, s2File, writeSessionFm(session2));

	return created;
}
