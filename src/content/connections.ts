// Pure — no `obsidian` import. Verbatim transcription of the "Connecting
// Characters" section's two 20-entry lists from the Lazy GM's Resource
// Document (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`).
// Table ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const CONNECTIONS_GROUP: RollTable = {
	id: "connections-group",
	name: "Connections — group",
	category: "characters",
	source: "core",
	rows: [
		"Mercenary company", "Self-employed investigators", "Official investigators", "Royal advisors", "Thieves' guild",
		"Secret society", "Religious investigators", "Adventuring company", "Business investigators", "Assassins' guild",
		"Wizarding school", "Monastic students", "Gladiator school", "Military specialists", "Spy network",
		"Constabulary", "Magically bound servants", "Divinely inspired", "Protectors of the common folk",
		"Seekers of vengeance",
	].map((text) => ({ text })),
};

export const CONNECTIONS_CHARACTER: RollTable = {
	id: "connections-character",
	name: "Connections — character",
	category: "characters",
	source: "core",
	rows: [
		"Sibling of", "Saved by", "Served with", "Protected by", "Adventured with", "Friendly rival of",
		"Childhood friend of", "Magically bound to", "Survived with", "Escaped with", "Apprentice of", "Acolyte of",
		"Idolizes", "Drinking buddies with", "Business associate of", "Lost a bet to", "Indebted to", "Trained by",
		"Dueling partner of", "On the run with",
	].map((text) => ({ text })),
};

export const CONNECTIONS_TABLES: readonly RollTable[] = [CONNECTIONS_GROUP, CONNECTIONS_CHARACTER];
