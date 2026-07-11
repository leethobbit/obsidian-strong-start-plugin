// Pure — no `obsidian` import. Verbatim transcription of the four "Creating
// Secrets and Clues" prompt lists from the Lazy GM's Resource Document
// (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). Table
// ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const SECRETS_CHARACTER: RollTable = {
	id: "secrets-character",
	name: "Secrets & clues — character secrets",
	category: "plots",
	source: "core",
	rows: [
		"What family history might be revealed?",
		"What ties the character to this location?",
		"What ghost or spirit haunts the character?",
		"What dreams fill the character's rest?",
		"What parasite secretly infests the character?",
		"Which family member is involved in the adventure?",
		"How is the villain related to the character?",
		"What NPC who the character thinks is dead still lives?",
		"What ritual was the character blessed with as a child?",
		"What previous event ties the character to the story?",
	].map((text) => ({ text })),
};

export const SECRETS_HISTORICAL: RollTable = {
	id: "secrets-historical",
	name: "Secrets & clues — historical secrets",
	category: "plots",
	source: "core",
	rows: [
		"What dead god has a connection to the area?",
		"What armies once battled here?",
		"What cruel lord was slain in this place?",
		"What ancient civilization once thrived here?",
		"What old empire's settlements lie buried here?",
		"What alien creature or power is hidden here?",
		"What rebellion took place here?",
		"What primeval mysteries lay buried here?",
		"What was this location's former purpose?",
		"What horrific monster once ruled here?",
	].map((text) => ({ text })),
};

export const SECRETS_NPC_VILLAIN: RollTable = {
	id: "secrets-npc-villain",
	name: "Secrets & clues — NPC and villain secrets",
	category: "plots",
	source: "core",
	rows: [
		"What dark history follows the NPC?",
		"What makes the NPC think they're right?",
		"What was the NPC's great accomplishment?",
		"What foe did the NPC defeat?",
		"What makes the NPC politically untouchable?",
		"What great power does the NPC possess?",
		"What does the NPC desire?",
		"What regular routines does the NPC follow?",
		"Who does the NPC love above all others?",
		"What secret does the NPC want to keep hidden?",
	].map((text) => ({ text })),
};

export const SECRETS_PLOT: RollTable = {
	id: "secrets-plot",
	name: "Secrets & clues — plot and story secrets",
	category: "plots",
	source: "core",
	rows: [
		"What villainous event will soon come to pass?",
		"What disaster is about to befall the land?",
		"What royal figure was just assassinated?",
		"What dungeon entrance just became revealed?",
		"What monsters recently appeared in the realm?",
		"What armies just invaded the realm?",
		"What dark sign or portent just appeared?",
		"What natural disaster has recently struck the area?",
		"What unnatural being has appeared in the world?",
		"What unusual creature was seen walking the wilds?",
	].map((text) => ({ text })),
};

export const SECRETS_CLUES_TABLES: readonly RollTable[] = [
	SECRETS_CHARACTER,
	SECRETS_HISTORICAL,
	SECRETS_NPC_VILLAIN,
	SECRETS_PLOT,
];
