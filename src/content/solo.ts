// Pure — no `obsidian` import. Verbatim transcription of the "Lazy Solo 5e"
// section's three rollable lists from the Lazy GM's Resource Document
// (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). Table
// ids are stable forever (AGENTS.md "Built-in content").
//
// These tables are gated behind the `solo5e` feature toggle (main.ts filters
// them out of the registry when it's off) — the module itself stays pure and
// toggle-unaware. The procedure that binds them together (quest building, QP
// counting, monument adjudication) is prose, rendered by the Help panel's
// solo card, not table data.

import type { RollTable } from "../tables/types";

export const SOLO_CHAMBER_EVENTS: RollTable = {
	id: "solo-chamber-events",
	name: "Solo — chamber events",
	category: "plots",
	source: "core",
	rows: [
		{ text: "Trap or hazard", weight: 2 },
		{ text: "Monster and harmful monument" },
		{ text: "Monster and harmful monument (quest progress)" },
		{ text: "Monster and neutral monument (quest progress)", weight: 2 },
		{ text: "Monster and helpful monument (quest progress)" },
		{ text: "Monster and helpful monument" },
		{ text: "Healing font (restore 2d6 hit points)" },
		{ text: "Unguarded treasure" },
	],
};

export const SOLO_MONUMENT_EFFECTS: RollTable = {
	id: "solo-monument-effects",
	name: "Solo — monument effects",
	category: "plots",
	source: "core",
	rows: [
		{ text: "+1 to AC" },
		{ text: "+1 to attacks and save DCs" },
		{ text: "+1 AC and saving throws" },
		{ text: "+1 temp hit point per character level (minimum 5)" },
		{ text: "+1d6 damage per five character levels" },
		{ text: "Advantage on attack rolls" },
	],
};

export const SOLO_TREASURES: RollTable = {
	id: "solo-treasures",
	name: "Solo — treasures",
	category: "items",
	source: "core",
	rows: [
		{ text: "No treasure", weight: 2 },
		{ text: "3d12 gp", weight: 2 },
		{ text: "Potion of healing", weight: 2 },
		{ text: "Consumable item" },
		{ text: "Permanent item" },
	],
};

export const SOLO_TABLES: readonly RollTable[] = [SOLO_CHAMBER_EVENTS, SOLO_MONUMENT_EFFECTS, SOLO_TREASURES];

/** Ids of the solo tables, for the registry gate in `main.ts`. */
export const SOLO_TABLE_IDS: ReadonlySet<string> = new Set(SOLO_TABLES.map((t) => t.id));
