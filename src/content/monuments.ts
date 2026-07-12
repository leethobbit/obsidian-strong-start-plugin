// Pure — no `obsidian` import. Verbatim transcription of the "Random
// Monuments" section's four rollable lists from the Lazy GM's Resource
// Document (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`).
// Table ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const MONUMENT_ORIGIN: RollTable = {
	id: "monument-origin",
	name: "Random monuments — origin",
	category: "places",
	source: "core",
	rows: [
		"Draconic", "Dwarven", "Elven", "Primeval", "Divine", "Unholy", "Abyssal", "Otherworldly", "Orcish", "Undead",
		"Goblinoid", "Ghoulish", "Vampiric", "Dark elven", "Astral", "Ethereal", "Hellish", "Demonic", "Elemental",
		"Gnomish",
	].map((text) => ({ text })),
};

export const MONUMENT_CONDITION: RollTable = {
	id: "monument-condition",
	name: "Random monuments — condition",
	category: "places",
	source: "core",
	rows: [
		"Crumbling", "Sunken", "Pristine", "Excavated", "Vine-covered", "Ruined", "Cracked", "Shattered", "Buried",
		"Gore-covered", "Bloody", "Glyph-marked", "Rune-scribed", "Obsidian", "Metallic", "Ornate", "Desecrated",
		"Ancient", "Decorated", "Floating",
	].map((text) => ({ text })),
};

export const MONUMENT_EFFECT: RollTable = {
	id: "monument-effect",
	name: "Random monuments — unusual effect",
	category: "places",
	source: "core",
	rows: [
		"Undeath", "Fire", "Madness", "Water", "Radiance", "Arcane", "Poison", "Acid", "Disease", "Psionics", "Frost",
		"Lightning", "Antimagic", "Ooze", "Charming", "Fear", "Domination", "Sleep", "Thunder", "Tentacles",
	].map((text) => ({ text })),
};

export const MONUMENT_STRUCTURE: RollTable = {
	id: "monument-structure",
	name: "Random monuments — structure",
	category: "places",
	source: "core",
	rows: [
		"Aerie", "Altar", "Aqueduct", "Arcane circle", "Archway", "Aviary", "Barrow", "Battlefield", "Bell",
		"Bone pile", "Boneyard", "Bonfire", "Brazier", "Bridge", "Cage", "Cairn", "Campsite", "Canal", "Carcass",
		"Carriage", "Cauldron", "Cave", "Cenotaph", "Cesspit", "Charnel pit", "Columns", "Crater", "Crossroads",
		"Crystal", "Dome", "Doorway", "Earthmote", "Effigy", "Fighting pit", "Firepit", "Fossil", "Fountain",
		"Gallows", "Gateway", "Geode", "Geyser", "Graveyard", "Gravestone", "Grotto", "Grove", "Hollow", "Huge skull",
		"Idol", "Illusion", "Keep", "Lantern", "Machine", "Mausoleum", "Megalith", "Meteorite", "Midden", "Mill",
		"Mine", "Mirror", "Monolith", "Monument", "Mosaic", "Nest", "Obelisk", "Orb", "Orrery", "Oubliette",
		"Petrified creature", "Pillar", "Pit", "Planar rift", "Platform", "Podium", "Pool", "Rock", "Ruin",
		"Sacred circle", "Sarcophagus", "Shipwreck", "Shrine", "Sigil", "Sinkhole", "Slab", "Spell effect", "Sphere",
		"Spire", "Statue", "Stone circle", "Stone tablets", "Sundial", "Throne", "Tomb", "Totem", "Tower",
		"Trash heap", "Tree", "Wall", "Waymarker", "Well", "Windmill",
	].map((text) => ({ text })),
};

export const MONUMENT_TABLES: readonly RollTable[] = [
	MONUMENT_ORIGIN,
	MONUMENT_CONDITION,
	MONUMENT_EFFECT,
	MONUMENT_STRUCTURE,
];
