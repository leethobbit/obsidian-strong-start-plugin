// Pure — no `obsidian` import. Verbatim transcription of the "Spiral Campaign
// Development" section from the Lazy GM's Resource Document (CC-BY 4.0,
// Michael E. Shea / Sly Flourish — see `attribution.ts`): campaign pitches,
// starting locations, campaign fronts, and local adventure locations. Powers
// the campaign creation wizard's inspiration rolls (`views/home/campaign-wizard.ts`)
// and the Foundation sub-tab's per-empty-row dice (`views/home/foundation-panel.ts`).
// Table ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const CAMPAIGN_PITCHES: RollTable = {
	id: "campaign-pitches",
	name: "Campaign pitches",
	category: "plots",
	source: "core",
	rows: [
		"Prevent the summoning of the Dragon Queen",
		"Prevent the coming of the Black Moon",
		"End the dark reign of Elenda the lich queen",
		"Break the political power of Vroth the death knight",
		"Kill Veresyn the vampire lord and his horde",
		"Restore light to the Vale of Nightmares",
		"Restore the prison of Orlon the demon prince",
		"Shatter the draconic Alliance of Five Claws",
		"Save people from the blood feast of a gnoll war band",
		"Restore light to the fallen celestial Ixyan",
		"Dismantle the Empire of the White Blade",
		"Find the seven keys to the gates of Ilumenia",
		"Prevent the resurrection of the sorcerer king",
		"Stop the cult of the Red Ocean",
		"Save the heir of the sapphire throne",
		"Find and seal the vault of the world serpent",
		"Close the gateway to the Outside",
		"Destroy the Sword of the Black Sun",
		"Slay the ancient dragon Larthyx Flametongue",
		"End the dark pact of Karthyn the archdevil",
	].map((text) => ({ text })),
};

export const CAMPAIGN_STARTING_LOCATIONS: RollTable = {
	id: "campaign-starting-locations",
	name: "Campaign starting locations",
	category: "places",
	source: "core",
	rows: [
		"Adventurers' guild",
		"Mining outpost",
		"Recent shipwreck",
		"Frontier outpost",
		"Holy temple",
		"Refugee camp",
		"Fortress under siege",
		"Great library",
		"Planar hub city",
		"Crumbling fortress",
	].map((text) => ({ text })),
};

export const CAMPAIGN_FRONTS: RollTable = {
	id: "campaign-fronts",
	name: "Campaign fronts",
	category: "characters",
	source: "core",
	rows: [
		"Thieves' guild",
		"Dark necromancer",
		"Armageddon cult",
		"Mercenary army",
		"Forgotten machine",
		"Evil construct",
		"Demon prince",
		"Archdevil",
		"Corrupt noble lord",
		"Rival adventurers",
		"Mages' guild",
		"Outlander horde",
		"Meteor storm",
		"Planar invaders",
		"Powerful archmage",
		"Ancient lich",
		"Blood-raging cannibals",
		"Unseelie fey lord",
		"Draconic terror",
		"Undead prince",
	].map((text) => ({ text })),
};

export const CAMPAIGN_LOCAL_LOCATIONS: RollTable = {
	id: "campaign-local-locations",
	name: "Local adventure locations",
	category: "places",
	source: "core",
	rows: [
		"Ancient crypt",
		"Forgotten sewers",
		"Haunted keep",
		"Festering well",
		"Rat-infested cellar",
		"Unholy temple",
		"Dangerous caves",
		"Underground city",
		"War-torn citadel",
		"Fey glade",
		"Abandoned dungeon",
		"Ruined watchtower",
		"Huge hollow statue",
		"Sunken catacombs",
		"Obsidian ziggurat",
		"Haunted forest",
		"Otherworldly rift",
		"Submerged grotto",
		"Dead hollow tree",
		"Sundered shipwreck",
	].map((text) => ({ text })),
};

/**
 * NOT a verbatim transcription — the resource doc has no generic "six truths"
 * seed table (its own six-truths example is written for one specific
 * campaign, the coming of the Black Moon, and doesn't generalize). This is a
 * small composition built from other core tables via `{{...}}` template
 * references (campaign fronts + core generator flavor), giving the wizard's
 * "Six truths" step something to roll against without inventing un-sourced
 * prose. Every referenced id must stay a real core table id (guarded by
 * `tests/content.test.ts`'s placeholder-validity check).
 */
export const CAMPAIGN_TRUTHS_SEED: RollTable = {
	id: "campaign-truths",
	name: "Six truths inspiration",
	category: "plots",
	source: "core",
	rows: [
		"{{campaign-fronts}} once ruled these lands, and their mark remains on the {{core-location}}.",
		"A {{core-monument}} near {{campaign-starting-locations}} predates anyone's memory — and no one agrees on what it's for.",
		"The last folk who dealt with a threat like {{campaign-fronts}} left no record of how they survived it.",
		"A {{campaign-local-locations}} close to {{campaign-starting-locations}} hides something the {{campaign-fronts}} wants kept quiet.",
		"Rumor holds that the {{core-monument}} answers to {{campaign-fronts}}, not to the crown.",
		"Something about {{campaign-starting-locations}} draws the attention of {{campaign-fronts}} — no one can say why.",
		"An old prophecy names a champion who will end the reach of {{campaign-fronts}}.",
		"Trade through the region has grown strange since {{campaign-fronts}} took an interest in the {{campaign-local-locations}}.",
		"Whole villages near the {{core-location}} have vanished since {{campaign-fronts}} arrived.",
		"Sages and cultists alike describe the coming of {{campaign-fronts}} in the same hushed words.",
	].map((text) => ({ text })),
};

export const CAMPAIGN_TABLES: readonly RollTable[] = [
	CAMPAIGN_PITCHES,
	CAMPAIGN_STARTING_LOCATIONS,
	CAMPAIGN_FRONTS,
	CAMPAIGN_LOCAL_LOCATIONS,
	CAMPAIGN_TRUTHS_SEED,
];
