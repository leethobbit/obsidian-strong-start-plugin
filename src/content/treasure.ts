// Pure — no `obsidian` import. Verbatim transcription of the "Treasure
// Generator" section's two rollable lists from the Lazy GM's Resource
// Document (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`).
// "Gold Per Level" is a level-keyed lookup table, not a random pick, and
// deliberately isn't transcribed as a `RollTable` (deviation, noted in the
// M7 summary). Table ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const TREASURE_CONSUMABLE: RollTable = {
	id: "treasure-consumable",
	name: "Treasure generator — consumable treasure",
	category: "items",
	source: "core",
	rows: [
		"*Potion of healing*", "*Potion of greater healing*", "*Oil of slipperiness*", "*Potion of animal friendship*",
		"*Potion of climbing*", "*Potion of growth*", "*Potion of mind reading*", "*Potion of poison*",
		"*Potion of resistance*", "*Potion of water breathing*", "*Dust of disappearance*", "*Dust of dryness*",
	].map((text) => ({ text })),
};

export const TREASURE_MAGICAL: RollTable = {
	id: "treasure-magical",
	name: "Treasure generator — magical treasure",
	category: "items",
	source: "core",
	rows: [
		"*Weapon +1*", "*Armor +1*", "*Ammunition +1*", "*Amulet of proof against detection and location*",
		"*Bag of holding*", "*Bag of tricks*", "*Boots of elvenkind*", "*Boots of striding and springing*",
		"*Boots of the winterlands*", "*Bracers of archery*", "*Brooch of shielding*", "*Broom of flying*",
		"*Circlet of blasting*", "*Cloak of elvenkind*", "*Cloak of protection*", "*Cloak of the manta ray*",
		"*Eversmoking bottle*", "*Eyes of charming*", "*Eyes of the eagle*", "*Figurine of wondrous power (silver raven)*",
		"*Gauntlets of ogre power*", "*Gloves of missile snaring*", "*Gloves of swimming and climbing*",
		"*Goggles of night*", "*Hat of disguise*", "*Headband of intellect*", "*Helm of comprehending languages*",
		"*Helm of telepathy*", "*Immovable rod*", "*Javelin of lightning*", "*Lantern of revealing*",
		"*Medallion of thoughts*", "*Necklace of adaptation*", "*Pearl of power*", "*Ring of mind shielding*",
		"*Rope of climbing*", "*Slippers of spider climbing*", "*Stone of good luck*", "*Wand of magic missiles*",
		"*Wand of web*",
	].map((text) => ({ text })),
};

export const TREASURE_TABLES: readonly RollTable[] = [TREASURE_CONSUMABLE, TREASURE_MAGICAL];
