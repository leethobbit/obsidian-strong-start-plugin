// Pure — no `obsidian` import. Verbatim transcription of the two name lists
// from the Lazy GM's Resource Document's "NPC Generator" section (CC-BY 4.0,
// Michael E. Shea / Sly Flourish — see `attribution.ts`). `npc-names`
// demonstrates `{{...}}` template expansion by combining the two lists below
// — a core table, not a special case; the same mechanism is available to any
// user table (SCHEMA.md).

import type { RollTable } from "../tables/types";

export const NPC_FIRST_NAMES: RollTable = {
	id: "npc-first-names",
	name: "NPC names — first names",
	category: "characters",
	source: "core",
	rows: [
		"Osborne", "Halstein", "Rycheld", "Symond", "Sysley", "Tansa", "Levi", "Beneger", "Hailey", "Jayce",
		"Vesta", "Savannah", "Avelin", "Claudia", "Sighard", "Timothy", "Somerhild", "Radolf", "Denston", "Judithe",
		"Nireus", "Sulen", "Teukros", "Cullive", "Arnald", "Guinevere", "Madison", "Stella", "Edmund", "Goddard",
		"Paul", "Gerland", "Eupalamos", "Sebastian", "Anthonette", "Lowell", "Dauid", "Halia", "Colton", "Bellinda",
		"Roger", "Chase", "Pulmia", "Sadie", "Leofwen", "Hildegard", "Thelexion", "Latisha", "Raffe", "Sydnee",
		"Nicholas", "Lausus", "Johannes", "Derkos", "Boyle", "Hudson", "Meryll", "Peter", "Godebert", "Randwulf",
		"Aegipan", "Bryde", "Josiah", "Sabra", "Hilda", "Lapithes", "Reothine", "Jeger", "Sybaris", "Cared",
		"Clifton", "Annabel", "Kaylee", "Neale", "Bayard", "Albin", "Maronne", "Jocelyn", "Isemeine", "Toril",
		"Aisa", "Franny", "Turstin", "Chulisa", "Samantha", "Poine", "Sanche", "Maya", "Nicholina", "Margry",
		"Drew", "Parnell", "Taran", "Cunovin", "Ryan", "Caroline", "Halisera", "Florens", "Tantalos", "Wynefreede",
	].map((text) => ({ text })),
};

export const NPC_LAST_NAMES: RollTable = {
	id: "npc-last-names",
	name: "NPC names — last names / organizations",
	category: "characters",
	source: "core",
	rows: [
		"Brightwhisper", "Redspur", "Hollyfang", "Goosewalker", "Goldbane", "Ebondazer", "Emeraldstorm", "Monsterthumb", "Goblinchaser", "Thornhelm",
		"Lionfall", "Swordbuckle", "Earthdancer", "Graywillow", "Cloudlover", "Sharpwhisker", "Glasscleaver", "Macebound", "Icebrood", "Fireheart",
		"Angelbright", "Anvilcloud", "Heromaker", "Lightblade", "Shieldrazor", "Whitetail", "Spiderhunter", "Shadowblood", "Doombrissle", "Bronzestone",
		"Moongazer", "Catfinger", "Lawknocker", "Rainsoother", "Swiftcaller", "Mudteeth", "Wyrmriver", "Dragonknee", "Flamestar", "Millhand",
	].map((text) => ({ text })),
};

export const NPC_FULL_NAME: RollTable = {
	id: "npc-names",
	name: "NPC names",
	category: "characters",
	source: "core",
	rows: [{ text: "{{npc-first-names}} {{npc-last-names}}" }],
};

export const NPC_NAME_TABLES: readonly RollTable[] = [NPC_FIRST_NAMES, NPC_LAST_NAMES, NPC_FULL_NAME];
