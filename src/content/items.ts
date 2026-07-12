// Pure — no `obsidian` import. Verbatim transcription of the "Random Items"
// section's rollable lists from the Lazy GM's Resource Document (CC-BY 4.0,
// Michael E. Shea / Sly Flourish — see `attribution.ts`). "Potions of
// Healing" is the one weighted table here — its source d20 ranges (1-12,
// 13-16, 17-19, 20) become row `weight`s (12/4/3/1) rather than four
// separately-transcribed uniform rows. Table ids are stable forever
// (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const ITEM_WEAPON: RollTable = {
	id: "item-weapon",
	name: "Random items — weapon type",
	category: "items",
	source: "core",
	rows: [
		"Dagger", "Mace", "Quarterstaff", "Spear", "Light crossbow", "Shortbow", "Battleaxe", "Flail", "Glaive",
		"Greataxe", "Greatsword", "Longsword", "Maul", "Morningstar", "Rapier", "Scimitar", "Shortsword", "Warhammer",
		"Heavy crossbow", "Longbow",
	].map((text) => ({ text })),
};

export const ITEM_ORIGIN: RollTable = {
	id: "item-origin",
	name: "Random items — origin",
	category: "items",
	source: "core",
	rows: [
		"Draconic", "Dwarven", "Elven", "Primeval", "Divine", "Unholy", "Abyssal", "Otherworldly", "Orcish", "Undead",
		"Goblinoid", "Ghoulish", "Vampiric", "Dark elven", "Astral", "Ethereal", "Hellish", "Demonic", "Elemental",
		"Gnomish",
	].map((text) => ({ text })),
};

export const ITEM_CONDITION: RollTable = {
	id: "item-condition",
	name: "Random items — condition",
	category: "items",
	source: "core",
	rows: [
		"Grimy", "Chipped", "Rough", "Smooth", "Ancient", "Crumbling", "Pristine", "Cool", "Ornate", "Plain",
		"Rune-scribed", "Carved", "Decorated", "Delicate", "Burned", "Oily", "Pulsing", "Glowing", "Shining",
		"Smoldering",
	].map((text) => ({ text })),
};

export const ITEM_ARMOR: RollTable = {
	id: "item-armor",
	name: "Random items — armor type",
	category: "items",
	source: "core",
	rows: [
		"Leather", "Studded leather", "Hide", "Chain shirt", "Scale mail", "Breastplate", "Half plate", "Ring mail",
		"Chain mail", "Splint", "Plate", "Shield",
	].map((text) => ({ text })),
};

export const ITEM_MUNDANE: RollTable = {
	id: "item-mundane",
	name: "Random items — mundane item",
	category: "items",
	source: "core",
	rows: [
		"Amulet", "Arrowhead", "Bell", "Bird skull", "Bone", "Bowl", "Box", "Bracelet", "Brooch", "Buckle", "Candle",
		"Coin", "Crown", "Cup", "Dagger", "Disc", "Earring", "Figurine", "Finger bone", "Flute", "Forked rod",
		"Gemstone", "Glove", "Goblet", "Hammer", "Idol", "Jewelry box", "Key", "Lamp", "Mask", "Medallion", "Mirror",
		"Necklace", "Opal", "Orb", "Pipe", "Quill", "Ring", "Rod", "Skull", "Sphere", "Spike", "Statue", "Stone",
		"String of beads", "Symbol", "Tiara", "Tooth", "Vial", "Wand",
	].map((text) => ({ text })),
};

export const ITEM_SPELL_EFFECT: RollTable = {
	id: "item-spell-effect",
	name: "Random items — spell effect",
	category: "items",
	source: "core",
	rows: [
		"*Acid arrow*", "*Acid splash*", "*Bane*", "*Banishment*", "*Bestow curse*", "*Black tentacles*", "*Bless*",
		"*Blight*", "*Blindness/deafness*", "*Burning hands*", "*Charm person*", "*Cloudkill*", "*Color spray*",
		"*Comprehend languages*", "*Cone of cold*", "*Cure wounds*", "*Detect evil and good*", "*Detect magic*",
		"*Disintegrate*", "*Dispel magic*", "*Fear*", "*Fire shield*", "*Firebolt*", "*Flame strike*", "*Fly*",
		"*Fog cloud*", "*Gaseous form*", "*Guiding bolt*", "*Haste*", "*Ice storm*", "*Inflict wounds*",
		"*Insect plague*", "*Invisibility*", "*Jump*", "*Light*", "*Lightning bolt*", "*Misty step*",
		"*Ray of enfeeblement*", "*Scorching ray*", "*Shatter*", "*Shield of faith*", "*Shocking grasp*", "*Silence*",
		"*Sleep*", "*Slow*", "*Stinking cloud*", "*Stoneskin*", "*Thunderwave*", "*True strike*", "*Web*",
	].map((text) => ({ text })),
};

export const ITEM_POTION_HEALING: RollTable = {
	id: "item-potion-healing",
	name: "Random items — potions of healing",
	category: "items",
	source: "core",
	rows: [
		{ text: "*Potion of healing* — common, restores 2d4 + 2 HP", weight: 12 },
		{ text: "*Potion of greater healing* — uncommon, restores 4d4 + 4 HP", weight: 4 },
		{ text: "*Potion of superior healing* — rare, restores 8d4 + 8 HP", weight: 3 },
		{ text: "*Potion of supreme healing* — very rare, restores 10d4 + 20 HP", weight: 1 },
	],
};

export const ITEM_TABLES: readonly RollTable[] = [
	ITEM_WEAPON,
	ITEM_ORIGIN,
	ITEM_CONDITION,
	ITEM_ARMOR,
	ITEM_MUNDANE,
	ITEM_SPELL_EFFECT,
	ITEM_POTION_HEALING,
];
