// Pure — no `obsidian` import. Verbatim transcription of the "Core Adventure
// Generators" section from the Lazy GM's Resource Document (CC-BY 4.0,
// Michael E. Shea / Sly Flourish — see `attribution.ts`). Every multi-column
// table in that section (Patrons and NPCs; Locations, Monuments, and Items;
// Condition, Description, and Origin) splits into one `RollTable` per column —
// this module's ids are distinct from the later, more detailed "Random
// Traps"/"Random Monuments"/etc. sections' own tables (`traps.ts`,
// `monuments.ts`, `chambers.ts`, `items.ts`) even where the topic overlaps;
// both are genuinely different table content in the source document, not
// duplicates. Table ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const CORE_PATRON_BEHAVIOR: RollTable = {
	id: "core-patron-behavior",
	name: "Core generators — patron behavior",
	category: "characters",
	source: "core",
	rows: [
		"Enthusiastic", "Flighty", "Shifty", "Optimistic", "Paranoid", "Well spoken", "Superior", "Haughty",
		"Pessimistic", "Suspicious", "Worried", "Greedy", "Brave", "Stern", "Sly", "Wise", "Reserved", "Cheery",
		"Opportunistic", "Soft spoken",
	].map((text) => ({ text })),
};

export const CORE_PATRON_ANCESTRY: RollTable = {
	id: "core-patron-ancestry",
	name: "Core generators — patron ancestry",
	category: "characters",
	source: "core",
	rows: [
		"Human", "Elf", "Dwarf", "Halfling", "Orc", "Drow", "Tiefling", "Dragonborn", "Fey", "Goblin", "Construct",
		"Celestial", "Ghost", "Wizard's familiar", "Talking animal", "Avian", "Lizardfolk", "Catfolk", "Lycanthrope",
		"Artifact",
	].map((text) => ({ text })),
};

export const CORE_QUEST_HOOKS: RollTable = {
	id: "core-quest-hooks",
	name: "Core generators — quest hooks",
	category: "plots",
	source: "core",
	rows: [
		"Find an item", "Kill a villain", "Rescue an NPC", "Uncover a secret", "Clear out monsters",
		"Protect a monument", "Protect an NPC", "Steal an item", "Return an item", "Close a gate", "Open a gate",
		"Activate a monument", "Disable an artifact", "Recover an item", "Convince an NPC", "Awaken a monster",
		"Put a monster to sleep", "Bury a secret", "Discover a monument", "Dig up an artifact",
	].map((text) => ({ text })),
};

export const CORE_LOCATION: RollTable = {
	id: "core-location",
	name: "Core generators — location",
	category: "places",
	source: "core",
	rows: [
		"Tower", "Crypts", "Keep", "Cairn", "Giant statue", "Caves", "Sewers", "Temple", "Mines", "Mansion",
		"Academy", "Dungeon", "Barrow", "Vault", "Tomb", "Warren", "Ship", "Sanctum", "Cove", "Castle",
	].map((text) => ({ text })),
};

export const CORE_MONUMENT: RollTable = {
	id: "core-monument",
	name: "Core generators — monument",
	category: "places",
	source: "core",
	rows: [
		"Sarcophagus", "Obelisk", "Orb", "Bone pile", "Skull", "Megalith", "Pillars", "Throne", "Statues", "Well",
		"Orrery", "Effigy", "Arcane circle", "Spire", "Altar", "Pit", "Fountain", "Archway", "Cage", "Brazier",
	].map((text) => ({ text })),
};

export const CORE_ITEM: RollTable = {
	id: "core-item",
	name: "Core generators — item",
	category: "items",
	source: "core",
	rows: [
		"Coin", "Figurine", "Gemstone", "Amulet", "Earring", "Bell", "Bone", "Bowl", "Candle", "Ring", "Circlet",
		"Bracelet", "Dagger", "Goblet", "Key", "Lamp", "Brooch", "Skull", "Mask", "Necklace",
	].map((text) => ({ text })),
};

export const CORE_CONDITION: RollTable = {
	id: "core-condition",
	name: "Core generators — condition",
	category: "places",
	source: "core",
	rows: [
		"Smoky", "Acidic", "Bloodied", "Burning", "Frozen", "Poisonous", "Necrotic", "Thunderous", "Ringing",
		"Lightning", "Radiant", "Shadowed", "Oozing", "Ethereal", "Whispering", "Windswept", "Drenched", "Diseased",
		"Crystalline", "Silvered",
	].map((text) => ({ text })),
};

export const CORE_DESCRIPTION: RollTable = {
	id: "core-description",
	name: "Core generators — description",
	category: "places",
	source: "core",
	rows: [
		"Ruined", "Decrepit", "Obsidian", "Haunted", "Unholy", "Sunken", "Forgotten", "Macabre", "Ancient",
		"Festering", "Monstrous", "Golden", "Spired", "Towering", "Forsaken", "Gloomy", "Horrific", "Colossal",
		"Overgrown", "Shattered",
	].map((text) => ({ text })),
};

export const CORE_ORIGIN: RollTable = {
	id: "core-origin",
	name: "Core generators — origin",
	category: "places",
	source: "core",
	rows: [
		"Human", "Elven", "Dwarven", "Halfling", "Gnomish", "Tiefling", "Dragonborn", "Orc", "Goblinoid", "Undead",
		"Celestial", "Fey", "Elemental", "Giant", "Fiendish", "Unseelie", "Aberrant", "Shadow", "Ethereal", "Abyssal",
	].map((text) => ({ text })),
};

export const CORE_CHAMBER_PURPOSE: RollTable = {
	id: "core-chamber-purpose",
	name: "Core generators — chamber purpose",
	category: "places",
	source: "core",
	rows: [
		"Armory", "Prison", "Throne room", "Crypt", "Treasury", "Barracks", "Monstrous lair", "Storeroom",
		"Charnel pit", "Museum", "Torture chamber", "Bedchamber", "Gallery", "Dining hall", "Library", "Pantry",
		"Laboratory", "Cesspit", "Bone yard", "Scrying chamber",
	].map((text) => ({ text })),
};

export const CORE_DUNGEON_DISCOVERY: RollTable = {
	id: "core-dungeon-discovery",
	name: "Core generators — dungeon discovery",
	category: "places",
	source: "core",
	rows: [
		"Helpful NPC", "Holy fountain", "Inspiring statue", "Revealing mosaic", "Radiant shrine", "Friendly spirit",
		"Hidden campsite", "Edible mushrooms", "Explorer's pack", "Spy hole", "Adventurer's journal", "Escape tunnel",
		"Useful teleporter", "Enlightening mural", "Healing spring", "Wounded enemy", "Well-stocked armory",
		"Friendly creature", "Useful machinery", "Historical library",
	].map((text) => ({ text })),
};

export const CORE_WALL_DECORATION: RollTable = {
	id: "core-wall-decoration",
	name: "Core generators — dungeon wall decoration",
	category: "places",
	source: "core",
	rows: [
		"Relief", "Frieze", "Mural", "Fresco", "Mosaic", "Runic carvings", "Encaustic painting", "Gilded engravings",
		"Marouflage", "Sgraffito",
	].map((text) => ({ text })),
};

export const CORE_DUNGEON_MONSTER: RollTable = {
	id: "core-dungeon-monster",
	name: "Core generators — dungeon monster",
	category: "monsters",
	source: "core",
	rows: [
		"Giant rats", "Bandits", "Cultists", "Acolytes", "Stirges", "Guards", "Skeletons", "Oozes", "Shadows",
		"Spies", "Ghouls", "Specters", "Cult fanatics", "Gelatinous cubes", "Ogres", "Wererats", "Basilisks",
		"Green hags", "Hell hounds", "Mummies",
	].map((text) => ({ text })),
};

export const CORE_TRAP_HAZARD: RollTable = {
	id: "core-trap-hazard",
	name: "Core generators — traps and hazards",
	category: "places",
	source: "core",
	rows: [
		"Spiked pit", "Lightning blasts", "Poisoned darts", "Swarms of insects", "Explosive runes", "Radiant pillars",
		"Flame-jet idols", "Force beams", "Crippling caltrops", "Acidic pools", "Bear traps", "Ghostly haunting",
		"Poisoned gas", "Magical instability", "Barbed spears", "Dense fog", "Psychic feedback", "Greasy floor",
		"Thick webs", "Freezing jets",
	].map((text) => ({ text })),
};

export const CORE_TREASURE: RollTable = {
	id: "core-treasure",
	name: "Core generators — treasure",
	category: "items",
	source: "core",
	rows: [
		"Coins", "Bag of gemstones", "Platinum jewelry", "Rune-scribed gem", "Golden goblet", "Ancient tome",
		"Treasure map", "Ancient relic", "Fantastic art", "Jeweled idol", "Potion of healing", "Other potion",
		"Scroll or spell scroll", "Bag of holding", "Wondrous item", "Wand or rod", "Magic light weapon",
		"Magic heavy weapon", "Magic ranged weapon", "Magic armor",
	].map((text) => ({ text })),
};

export const CORE_SPELL: RollTable = {
	id: "core-spell",
	name: "Core generators — spell",
	category: "items",
	source: "core",
	rows: [
		"*Magic missile*", "*Burning hands*", "*Shield*", "*Cure wounds*", "*Guiding bolt*", "*Invisibility*",
		"*Scorching ray*", "*Shatter*", "*Aid*", "*Misty step*", "*Spiritual weapon*", "*Lesser restoration*",
		"*Daylight*", "*Mass healing word*", "*Revivify*", "*Lightning bolt*", "*Fireball*", "*Dispel magic*",
		"*Haste*", "*Fly*",
	].map((text) => ({ text })),
};

export const CORE_ADVENTURE_GENERATOR_TABLES: readonly RollTable[] = [
	CORE_PATRON_BEHAVIOR,
	CORE_PATRON_ANCESTRY,
	CORE_QUEST_HOOKS,
	CORE_LOCATION,
	CORE_MONUMENT,
	CORE_ITEM,
	CORE_CONDITION,
	CORE_DESCRIPTION,
	CORE_ORIGIN,
	CORE_CHAMBER_PURPOSE,
	CORE_DUNGEON_DISCOVERY,
	CORE_WALL_DECORATION,
	CORE_DUNGEON_MONSTER,
	CORE_TRAP_HAZARD,
	CORE_TREASURE,
	CORE_SPELL,
];
