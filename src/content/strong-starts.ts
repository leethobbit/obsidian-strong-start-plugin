// Pure — no `obsidian` import. Verbatim transcription of the four "Example
// Strong Starts" lists from the Lazy GM's Resource Document (CC-BY 4.0,
// Michael E. Shea / Sly Flourish — see `attribution.ts`). Table ids are
// stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const STRONG_START_CITY: RollTable = {
	id: "strong-starts-city",
	name: "Strong starts — cities and towns",
	category: "plots",
	source: "core",
	rows: [
		"The characters interrupt bandits breaking into a shop.",
		"Something slithers out of a nearby sewer.",
		"A noble lord bumps into one of the characters and threatens to have them arrested.",
		"A group of cultists kindly ask for a sample of a character's blood.",
		"A hooded patron visits the characters, asking the characters to kill them in two days.",
		"A riot draws the local watch away, whereupon a squad of hired killers descends on the characters.",
		"The campaign's main villain shows up and invites the characters for a drink.",
		"A scarred explorer offers to sell one of the characters a map to a site of a lost or stolen ancestral heirloom.",
		"A golem from a wizards' academy goes on a rampage.",
		"The local monarch is assassinated and a villain takes over the government.",
	].map((text) => ({ text })),
};

export const STRONG_START_SEWERS: RollTable = {
	id: "strong-starts-sewers",
	name: "Strong starts — sewers",
	category: "plots",
	source: "core",
	rows: [
		"A flood of poisonous water flows past the characters' position.",
		"The sewer collapses into deeper tunnels sealed up for centuries.",
		"A wererat approaches the characters, offering to sell valuable information.",
		"A pack of ghouls chase a young couple reported missing days ago.",
		"A legendary giant crocodile stealthily stalks the characters.",
		"The characters find a powerful magical dagger sought by a guild of wraith assassins.",
		"Swampy sewer gas gives one of the characters supernatural visions of the villain's master plan.",
		"The characters meet an eccentric wizard farming mushrooms for spell components.",
		"A wall collapses, revealing a hidden temple of the god of slimes and oozes.",
		"A flood of water draws the characters into a dangerously large mechanical sluice system.",
	].map((text) => ({ text })),
};

export const STRONG_START_WILDERNESS: RollTable = {
	id: "strong-starts-wilderness",
	name: "Strong starts — wilderness",
	category: "plots",
	source: "core",
	rows: [
		'A nearby tree opens up, and a satyr steps through and says "Hi!"',
		"A rampaging werebear storms through the area, mistaking the characters for the hunters who killed their mate.",
		"Night falls, revealing an alien starscape above.",
		"The characters see a tall humanoid with antlers stalking from the shadows, carrying a large scythe in one hand and three humanoid heads in the other.",
		"The ground suddenly churns, bringing the body of a long-lost elf king to the surface. The king's eyes open.",
		"The characters stumble upon a nest of skeletal pixies surrounding a desecrated fey gate.",
		"A golden-antlered stag leaps into the characters' camp and asks to be defended from the hunters chasing it.",
		"An old woman greets the characters, offering them candy and baked treats if they will come to her nearby cottage.",
		"A skeleton hanging from a tree begs the characters to right the wrong it committed while alive.",
		"A sinkhole opens up, revealing the tunnels of long-forgotten burial chambers.",
	].map((text) => ({ text })),
};

export const STRONG_START_DUNGEON: RollTable = {
	id: "strong-starts-dungeon",
	name: "Strong starts — dungeons, caves, and caverns",
	category: "plots",
	source: "core",
	rows: [
		"A vampire appears from a sudden rise of mist, introduces herself, and asks the characters for a favor.",
		"An ancient statue turns its head toward the characters and whispers a valuable secret.",
		"The floor collapses, revealing even deeper tunnels long forgotten.",
		"Through a cracked wall, the characters spot a gateway flanked by two huge obsidian statues, and featuring a set of stairs leading down.",
		"The characters come across two bands of goblins fighting each other for the favor of a hag named Auntie Chiptooth.",
		"An eyestalk swells out from an oozy patch on the wall, beholds the characters, and then disappears back into the wall.",
		"A wounded knight collapses near the characters, begging them to find her lost love before she dies.",
		"The ground cracks open and a pillar of chipped obsidian juts out, projecting a prophecy in red Infernal glyphs on the walls of the chamber.",
		"Stars swim in a moonlit well, then rise up to reveal themselves as will-o'-wisps.",
		"A spectral hound guides the characters to the camp of a reclusive mage.",
	].map((text) => ({ text })),
};

export const STRONG_START_TABLES: readonly RollTable[] = [
	STRONG_START_CITY,
	STRONG_START_SEWERS,
	STRONG_START_WILDERNESS,
	STRONG_START_DUNGEON,
];
