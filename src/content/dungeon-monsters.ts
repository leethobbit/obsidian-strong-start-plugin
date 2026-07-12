// Pure — no `obsidian` import. Verbatim transcription of the "Random Dungeon
// Monsters" section's ten CR-banded monster lists from the Lazy GM's Resource
// Document (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`).
// The source's "which list to use for which dungeon level" d20 lookup grid is
// a level-keyed reference table, not a random pick, and deliberately isn't
// transcribed as a `RollTable` (deviation, noted in the M7 summary); lists 9
// and 10 have fewer than 20 entries in the source itself (12 and 10) — rolled
// uniform-weight like every other core table. Table ids are stable forever
// (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const DUNGEON_MONSTERS_1: RollTable = {
	id: "dungeon-monsters-1",
	name: "Random dungeon monsters — list 1 (CR 1/8–1/4)",
	category: "monsters",
	source: "core",
	rows: [
		"Bandit", "Cultist", "Flying snake", "Giant crab", "Giant rat", "Kobold", "Poisonous snake", "Stirge",
		"Tribal warrior", "Axe beak", "Blink dog", "Dretch", "Drow", "Giant bat", "Giant frog", "Giant wolf spider",
		"Goblin", "Skeleton", "Swarm of bats", "Swarm of rats",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_2: RollTable = {
	id: "dungeon-monsters-2",
	name: "Random dungeon monsters — list 2 (CR 1/4–1)",
	category: "monsters",
	source: "core",
	rows: [
		"Wolf", "Zombie", "Cockatrice", "Darkmantle", "Gnoll", "Gray ooze", "Hobgoblin", "Lizardfolk", "Magmin",
		"Orc", "Rust monster", "Sahuagin", "Scout", "Shadow", "Swarm of insects", "Thug", "Worg", "Animated armor",
		"Bugbear", "Death dog",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_3: RollTable = {
	id: "dungeon-monsters-3",
	name: "Random dungeon monsters — list 3 (CR 1–2)",
	category: "monsters",
	source: "core",
	rows: [
		"Dire wolf", "Duergar", "Ghoul", "Giant spider", "Giant toad", "Harpy", "Imp", "Specter", "Spy", "Ankheg",
		"Bandit captain", "Berserker", "Black dragon wyrmling", "Cult fanatic", "Ettercap", "Gargoyle",
		"Gelatinous cube", "Ghast", "Giant constrictor snake", "Gibbering mouther",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_4: RollTable = {
	id: "dungeon-monsters-4",
	name: "Random dungeon monsters — list 4 (CR 2–3)",
	category: "monsters",
	source: "core",
	rows: [
		"Azer", "Green dragon wyrmling", "Grick", "Griffon", "Merrow", "Mimic", "Minotaur skeleton", "Ochre jelly",
		"Ogre", "Ogre zombie", "Priest", "Rug of smothering", "Sea hag", "Swarm of poisonous snakes", "Wererat",
		"White dragon wyrmling", "Will-o'-wisp", "Basilisk", "Bearded devil", "Blue dragon wyrmling",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_5: RollTable = {
	id: "dungeon-monsters-5",
	name: "Random dungeon monsters — list 5 (CR 3–4)",
	category: "monsters",
	source: "core",
	rows: [
		"Doppelganger", "Giant scorpion", "Green hag", "Hell hound", "Knight", "Manticore", "Minotaur", "Mummy",
		"Nightmare", "Owlbear", "Phase spider", "Veteran", "Werewolf", "Wight", "Winter wolf", "Black pudding",
		"Chuul", "Couatl", "Ettin", "Ghost",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_6: RollTable = {
	id: "dungeon-monsters-6",
	name: "Random dungeon monsters — list 6 (CR 4–5)",
	category: "monsters",
	source: "core",
	rows: [
		"Lamia", "Red dragon wyrmling", "Succubus/incubus", "Wereboar", "Air elemental", "Barbed devil", "Bulette",
		"Earth elemental", "Fire elemental", "Flesh golem", "Giant crocodile", "Gladiator", "Gorgon",
		"Half-red dragon veteran", "Hill giant", "Night hag", "Otyugh", "Roper", "Shambling mound", "Troll",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_7: RollTable = {
	id: "dungeon-monsters-7",
	name: "Random dungeon monsters — list 7 (CR 5–8)",
	category: "monsters",
	source: "core",
	rows: [
		"Salamander", "Vampire spawn", "Water elemental", "Wraith", "Xorn", "Chimera", "Drider", "Invisible stalker",
		"Mage", "Medusa", "Vrock", "Wyvern", "Young white dragon", "Oni", "Shield guardian", "Stone giant",
		"Young black dragon", "Assassin", "Chain devil", "Cloaker",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_8: RollTable = {
	id: "dungeon-monsters-8",
	name: "Random dungeon monsters — list 8 (CR 8–12)",
	category: "monsters",
	source: "core",
	rows: [
		"Frost giant", "Hezrou", "Hydra", "Spirit naga", "Young green dragon", "Bone devil", "Clay golem",
		"Cloud giant", "Fire giant", "Glabrezu", "Young blue dragon", "Aboleth", "Guardian naga", "Stone golem",
		"Young red dragon", "Behir", "Ereeti", "Horned devil", "Remorhaz", "Archmage",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_9: RollTable = {
	id: "dungeon-monsters-9",
	name: "Random dungeon monsters — list 9 (CR 12–16)",
	category: "monsters",
	source: "core",
	rows: [
		"Erinyes", "Adult white dragon", "Nalfeshnee", "Rakshasa", "Storm giant", "Vampire", "Adult black dragon",
		"Ice devil", "Adult green dragon", "Mummy lord", "Purple worm", "Adult blue dragon",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_10: RollTable = {
	id: "dungeon-monsters-10",
	name: "Random dungeon monsters — list 10 (CR 16–24)",
	category: "monsters",
	source: "core",
	rows: [
		"Iron golem", "Marilith", "Adult red dragon", "Balor", "Ancient white dragon", "Pit fiend",
		"Ancient black dragon", "Lich", "Ancient blue dragon", "Ancient red dragon",
	].map((text) => ({ text })),
};

export const DUNGEON_MONSTERS_TABLES: readonly RollTable[] = [
	DUNGEON_MONSTERS_1,
	DUNGEON_MONSTERS_2,
	DUNGEON_MONSTERS_3,
	DUNGEON_MONSTERS_4,
	DUNGEON_MONSTERS_5,
	DUNGEON_MONSTERS_6,
	DUNGEON_MONSTERS_7,
	DUNGEON_MONSTERS_8,
	DUNGEON_MONSTERS_9,
	DUNGEON_MONSTERS_10,
];
