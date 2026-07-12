// Pure — no `obsidian` import. The one-click generators registry the
// Generators subtab (and any prep-step hook) reads from — add a new
// generator here to make it show up as a card.

import { generateNpc } from "./npc";
import { generateTreasure } from "./treasure";
import { generateQuest } from "./quest";
import { generateTrap } from "./trap";
import { generateMonument } from "./monument";
import type { TableRegistry } from "../tables/registry";
import type { GeneratedResult } from "./types";

export interface GeneratorDef {
	/** Stable id — never rename (used as a `data-key` and for the "Save as
	 * note"/"Send to prep" branch in `generators/insert.ts`'s caller). */
	id: string;
	/** Sentence-case card label. */
	label: string;
	/** Lucide icon id, passed to `setIcon`. */
	icon: string;
	run: (registry: TableRegistry, rng: () => number) => GeneratedResult;
}

export const GENERATORS: readonly GeneratorDef[] = [
	{ id: "npc", label: "NPC", icon: "user-round", run: generateNpc },
	{ id: "treasure", label: "Treasure", icon: "gem", run: generateTreasure },
	{ id: "quest", label: "Quest", icon: "scroll", run: generateQuest },
	{ id: "trap", label: "Trap", icon: "triangle-alert", run: generateTrap },
	{ id: "monument", label: "Monument", icon: "landmark", run: generateMonument },
];

export function generatorById(id: string): GeneratorDef | undefined {
	return GENERATORS.find((g) => g.id === id);
}
