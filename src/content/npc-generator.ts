// Pure — no `obsidian` import. Verbatim transcription of the remaining "NPC
// Generator" section sub-tables from the Lazy GM's Resource Document (CC-BY
// 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). The section's
// name lists already live in `npc-names.ts` (M3); this covers the rest of
// what that section actually contains — ancestry, worldview (the doc's
// closest analog to an NPC's attitude/reaction toward the party), appearance
// & mannerisms (one combined list in the source), and profession. Table ids
// are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const NPC_ANCESTRY: RollTable = {
	id: "npc-ancestry",
	name: "NPC generator — ancestry",
	category: "characters",
	source: "core",
	rows: ["Human", "Elf", "Dwarf", "Halfling", "Goblin", "Kobold", "Gnome", "Orc", "Dragonborn", "Tiefling"].map(
		(text) => ({ text })
	),
};

export const NPC_WORLDVIEW: RollTable = {
	id: "npc-worldview",
	name: "NPC generator — worldview",
	category: "characters",
	source: "core",
	rows: [
		"Surly", "Friendly", "Brash", "Elitist", "Suspicious", "Carefree", "Loyal", "Opportunistic", "Wide-eyed", "Humorous",
		"Cautious", "Roisterous", "Optimistic", "Ignorant", "Selfless", "Brazen", "Loving", "Ambitious", "Greedy", "Outgoing",
	].map((text) => ({ text })),
};

export const NPC_APPEARANCE_MANNERISMS: RollTable = {
	id: "npc-appearance-mannerisms",
	name: "NPC generator — appearance & mannerisms",
	category: "characters",
	source: "core",
	rows: [
		"Wild hair", "Scarred cheek", "Body tattoos", "Smokes a pipe", "Golden teeth", "Walks with a limp",
		"Dashing clothes", "Picks teeth", "Missing eye", "Multicolored eyes", "Feathered earring", "Missing hand",
		"Spits a lot", "Shifty eyes", "Intense stare", "Snorts often", "Facial tattoos", "Heavy beard",
		"Missing fingers", "Half-shaved head",
	].map((text) => ({ text })),
};

export const NPC_PROFESSION: RollTable = {
	id: "npc-profession",
	name: "NPC generator — profession",
	category: "characters",
	source: "core",
	rows: [
		"Farmer", "Blacksmith", "Clerk", "Merchant", "Apothecary", "Bandit", "Guide", "Entertainer", "Guard", "Soldier",
		"Acolyte", "Sailor", "Mercenary", "Sage", "Noble", "Artisan", "Priest", "Veteran", "Knight", "Mage",
	].map((text) => ({ text })),
};

export const NPC_GENERATOR_TABLES: readonly RollTable[] = [
	NPC_ANCESTRY,
	NPC_WORLDVIEW,
	NPC_APPEARANCE_MANNERISMS,
	NPC_PROFESSION,
];
