// Pure — no `obsidian` import. Verbatim transcription of the "Random
// Chambers" section's fifteen dungeon-type room lists from the Lazy GM's
// Resource Document (CC-BY 4.0, Michael E. Shea / Sly Flourish — see
// `attribution.ts`). The source orders each list "typical rooms lower, more
// fantastic/dangerous rooms higher" for use with a variable die size; this
// module keeps the same row order but rolls uniform-weight (matching every
// other core table — SCHEMA.md doesn't model a table-specific die size). Table
// ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const CHAMBER_BEASTS_DEN: RollTable = {
	id: "chamber-beasts-den",
	name: "Random chambers — beast's den",
	category: "places",
	source: "core",
	rows: [
		"Sleeping den", "Drinking pool", "Dining chamber", "Bone pit", "Nursery", "Vermin nest", "Rain tunnels",
		"Deep rift", "Cleaning chamber", "Treasure heap", "Secret exit", "Mudslide", "Livestock prison",
		"Squirming midden", "Maze for prey", "Secret tunnels", "Primeval shrine", "Trophy chamber", "Hunter's perch",
		"Ancestral tomb",
	].map((text) => ({ text })),
};

export const CHAMBER_CASTLE: RollTable = {
	id: "chamber-castle",
	name: "Random chambers — castle",
	category: "places",
	source: "core",
	rows: [
		"Dining hall", "Throne room", "Kitchens", "Armory", "Royal bedrooms", "Guard barracks", "Knight barracks",
		"Treasury", "Smithy", "Training yard", "Strategy hall", "Trophy room", "Religious shrine", "Prison cells",
		"Hall of tapestries", "Artifact gallery", "Menagerie", "Apothecary chamber", "Torture chamber", "Oubliette",
	].map((text) => ({ text })),
};

export const CHAMBER_CAVERNS: RollTable = {
	id: "chamber-caverns",
	name: "Random chambers — caverns",
	category: "places",
	source: "core",
	rows: [
		"Waterfall", "Large pool", "Natural columns", "Beast's den", "Deep shaft", "Underground rift",
		"Bridged chasm", "Crystal chamber", "Spiraling steps", "Mushroom grove", "Forgotten statue", "Lava pools",
		"Insect nests", "Stone rings", "Crumbling sinkhole", "Abandoned village", "Acidic stalactites",
		"Petrified victims", "Hall of bones", "Primeval shrine",
	].map((text) => ({ text })),
};

export const CHAMBER_DERELICT_SHIP: RollTable = {
	id: "chamber-derelict-ship",
	name: "Random chambers — derelict ship",
	category: "places",
	source: "core",
	rows: [
		"Crew quarters", "Captain quarters", "Officer quarters", "Helm", "Storage hold", "Officer mess",
		"Crew mess", "Armory", "Pantry", "Guest quarters", "Navigator's room", "Galley", "Shrine", "Medical bay",
		"Cellblock", "Observation room", "Bilge", "Head", "Captain's hold", "Treasure hold",
	].map((text) => ({ text })),
};

export const CHAMBER_DRAGONS_LAIR: RollTable = {
	id: "chamber-dragons-lair",
	name: "Random chambers — dragon's lair",
	category: "places",
	source: "core",
	rows: [
		"Sleeping chamber", "Treasure vault", "Waterfall", "Audience hall", "Egg hatchery", "Elemental pool",
		"Private entrance", "Livestock pen", "Observation roost", "Bathing pool", "Scrying chamber", "Secret vault",
		"Private library", "Artifact museum", "Servant quarters", "Dungeon cells", "Trapped maze", "Draconic altar",
		"Guardian chamber", "Trophy hall",
	].map((text) => ({ text })),
};

export const CHAMBER_FORGOTTEN_VAULTS: RollTable = {
	id: "chamber-forgotten-vaults",
	name: "Random chambers — forgotten vaults",
	category: "places",
	source: "core",
	rows: [
		"False treasury", "True treasury", "Living pillars", "Dead god's shrine", "Primordial seal",
		"Devil's pentacle", "Planar fissure", "Living artifact", "Demon's prison", "Draconic skeleton",
		"Guardian chamber", "Vampire sarcophagus", "Antediluvian obelisk", "Soul vessel vault", "Artifact vault",
		"Annihilation sphere", "Lich's throne", "Godling cylinder", "Titan's cell", "Angelic armory",
	].map((text) => ({ text })),
};

export const CHAMBER_MANOR: RollTable = {
	id: "chamber-manor",
	name: "Random chambers — manor",
	category: "places",
	source: "core",
	rows: [
		"Main foyer", "Master bedroom", "Guest bedrooms", "Kitchen", "Dining hall", "Study", "Library",
		"Servant quarters", "Treasury", "Pantry", "Bathing room", "Guard quarters", "Servant's dining room",
		"Greenhouse", "Master closet", "Art gallery", "Menagerie", "Hidden library", "Family altar", "Hidden saferoom",
	].map((text) => ({ text })),
};

export const CHAMBER_MINES: RollTable = {
	id: "chamber-mines",
	name: "Random chambers — mines",
	category: "places",
	source: "core",
	rows: [
		"Deep shafts", "Heavy equipment", "Narrow tunnels", "Dining hall", "Runoff drain", "Miners' barracks",
		"Foreman quarters", "Spiral dig", "Gemstone treasury", "Collapsed tunnels", "Cart depot", "Yawning sinkhole",
		"Drilling chamber", "Lava chamber", "Buried shrine", "Mushroom farm", "Beast warrens", "Refuse pit",
		"Forgotten vault", "Bestial bloodbath",
	].map((text) => ({ text })),
};

export const CHAMBER_NECROPOLIS: RollTable = {
	id: "chamber-necropolis",
	name: "Random chambers — necropolis",
	category: "places",
	source: "core",
	rows: [
		"Fetid pool", "Imperial crypt", "Charnel pit", "Embalming room", "Chamber of urns", "Gilded burial hall",
		"Candlelit shrine", "Throne of bones", "Historian's tomb", "Everburning firepit", "Guardian chamber",
		"Huge sarcophagus", "Dragon crypt", "Tower of sepulchers", "Flesh laboratory", "Titan's grave",
		"Entombed ship", "Oracular sphere", "Ghostly gateway", "Cold-iron prison",
	].map((text) => ({ text })),
};

export const CHAMBER_PRISON: RollTable = {
	id: "chamber-prison",
	name: "Random chambers — prison",
	category: "places",
	source: "core",
	rows: [
		"Low-security cells", "High-security cells", "Sewage drains", "Kitchens", "Dining hall", "Warden's office",
		"Chapel", "Armory", "Hospital", "Storage vault", "Guard post", "Guard barracks", "Isolation cells",
		"Torture chamber", "Sunken cells", "Beast pens", "Burial pit", "Laboratory", "Cesspit", "Oubliette",
	].map((text) => ({ text })),
};

export const CHAMBER_SEWERS: RollTable = {
	id: "chamber-sewers",
	name: "Random chambers — sewers",
	category: "places",
	source: "core",
	rows: [
		"Slimy sluice", "Swirling detritus", "Deep drain", "Roaring drain", "Echoing cistern", "Maintenance vault",
		"Abandoned hovel", "Broken machines", "Pipe network", "Bone pit", "Hidden stash", "Discarded statues",
		"Thieves' den", "Mushroom grove", "Corpse pool", "Beast's lair", "Secret shrine", "Mummified beast",
		"Shattered portal", "Hag's lair",
	].map((text) => ({ text })),
};

export const CHAMBER_SUNKEN_GROTTO: RollTable = {
	id: "chamber-sunken-grotto",
	name: "Random chambers — sunken grotto",
	category: "places",
	source: "core",
	rows: [
		"Glowing pool", "Coral pillars", "Crystal cave", "Deep fissure", "Blackwater pool", "Seaweed grove",
		"Driftwood wreck", "Shark den", "Frozen statues", "Lost treasury", "Watery archway", "Ziggurat altar",
		"Coral graveyard", "Hag's effigy", "Hydra's den", "Egg hatchery", "Lava tubes", "Sacrificial ledge",
		"Ruined temple", "Sunken throne",
	].map((text) => ({ text })),
};

export const CHAMBER_THIEVES_DEN: RollTable = {
	id: "chamber-thieves-den",
	name: "Random chambers — thieves' den",
	category: "places",
	source: "core",
	rows: [
		"Throne room", "Thieves' quarters", "Master's quarters", "Fighting pit", "Meeting room", "Mess hall",
		"Armory", "Guildmaster's office", "Practice room", "Sewer entrance", "Main treasury", "Gambling den",
		"Seedy tavern", "Secret treasury", "Sunken cells", "Murder hallway", "Shrine of blood", "Secret den",
		"Piranha pool", "Underworld pit",
	].map((text) => ({ text })),
};

export const CHAMBER_UNHOLY_TEMPLE: RollTable = {
	id: "chamber-unholy-temple",
	name: "Random chambers — unholy temple",
	category: "places",
	source: "core",
	rows: [
		"Vesting rooms", "Audience chamber", "Feasting hall", "Priest dormitory", "Art gallery", "Grim fountain",
		"Profane shrine", "Preparation room", "Artifact museum", "Blessed armory", "Torture chamber",
		"Summoning circle", "Sacrificial well", "Dungeon cells", "Hidden treasury", "Isolation chamber",
		"Sacrilegious library", "Private altar", "Unholy ossuary", "Reliquary chamber",
	].map((text) => ({ text })),
};

export const CHAMBER_WIZARDS_LAIR: RollTable = {
	id: "chamber-wizards-lair",
	name: "Random chambers — wizard's lair",
	category: "places",
	source: "core",
	rows: [
		"Audience hall", "Main library", "Secret library", "Wizard's bedroom", "Scrying chamber", "Guardians' hall",
		"Meditation chamber", "Treasure vault", "Artifact museum", "Summoning chamber", "Mirror prison",
		"Planar portal", "Crystal vault", "Advisor's cell", "Alchemical lab", "Multiverse orrery", "Menagerie",
		"Flesh laboratory", "Ooze vaults", "Lightning chamber",
	].map((text) => ({ text })),
};

export const CHAMBER_TABLES: readonly RollTable[] = [
	CHAMBER_BEASTS_DEN,
	CHAMBER_CASTLE,
	CHAMBER_CAVERNS,
	CHAMBER_DERELICT_SHIP,
	CHAMBER_DRAGONS_LAIR,
	CHAMBER_FORGOTTEN_VAULTS,
	CHAMBER_MANOR,
	CHAMBER_MINES,
	CHAMBER_NECROPOLIS,
	CHAMBER_PRISON,
	CHAMBER_SEWERS,
	CHAMBER_SUNKEN_GROTTO,
	CHAMBER_THIEVES_DEN,
	CHAMBER_UNHOLY_TEMPLE,
	CHAMBER_WIZARDS_LAIR,
];
