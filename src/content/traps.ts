// Pure — no `obsidian` import. Verbatim transcription of the "Random Traps"
// section's three rollable lists from the Lazy GM's Resource Document (CC-BY
// 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). "Damage
// Severity by Level" and "Trap Save DCs and Attack Bonuses" are level-keyed
// lookup tables, not random picks, and deliberately aren't transcribed as
// `RollTable`s (deviation, noted in the M7 summary). Table ids are stable
// forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const TRAP_FLAVOR: RollTable = {
	id: "trap-flavor",
	name: "Random traps — flavor",
	category: "places",
	source: "core",
	rows: [
		"Fiery", "Freezing", "Necrotic", "Poisonous", "Acidic", "Thunderous", "Lightning", "Forceful", "Diseased",
		"Stunning", "Blinding", "Deafening", "Weakening", "Draining", "Sleep-inducing", "Binding", "Dominating",
		"Psychic", "Maddening", "Confusing",
	].map((text) => ({ text })),
};

export const TRAP_TYPE: RollTable = {
	id: "trap-type",
	name: "Random traps — type",
	category: "places",
	source: "core",
	rows: [
		"Bolts", "Spears", "Scythes", "Bolos", "Spiked chains", "Pit", "Rolling ball", "Crushing pillars", "Darts",
		"Glyphs", "Swords", "Axes", "Tendrils", "Whips", "Nets", "Bear traps", "Cages", "Beams", "Hammers", "Shurikens",
	].map((text) => ({ text })),
};

export const TRAP_TRIGGER: RollTable = {
	id: "trap-trigger",
	name: "Random traps — trigger",
	category: "places",
	source: "core",
	rows: [
		"Door", "Floor plate", "Tripwire", "Throne", "Corpse", "Chest", "Old book", "Child's toy", "Jeweled skull",
		"Beams of light", "Golden angelic statue", "Crystal goblet on pedestal", "Onyx demonic skull", "Jeweled pillar",
		"Steep stair", "Jeweled crown", "Gilded sarcophagus", "Bound prisoner", "Weapon on an altar",
		"Idol on pedestal",
	].map((text) => ({ text })),
};

export const TRAP_TABLES: readonly RollTable[] = [TRAP_FLAVOR, TRAP_TYPE, TRAP_TRIGGER];
