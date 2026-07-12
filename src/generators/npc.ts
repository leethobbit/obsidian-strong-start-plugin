// Pure — no `obsidian` import. Composes a full NPC from core tables: full
// name, ancestry, profession, appearance & mannerism, worldview (the
// resource doc's closest analog to an NPC's attitude/motivation toward the
// party — it has no dedicated "goal" table), and a suggested connection to
// the party from the "Connecting Characters" section.

import { rollTable } from "../tables/roll";
import type { TableRegistry } from "../tables/registry";
import type { GeneratedLine, GeneratedResult } from "./types";

const LINE_TABLES: ReadonlyArray<{ label: string; tableId: string }> = [
	{ label: "Name", tableId: "npc-names" },
	{ label: "Ancestry", tableId: "npc-ancestry" },
	{ label: "Profession", tableId: "npc-profession" },
	{ label: "Appearance & mannerism", tableId: "npc-appearance-mannerisms" },
	{ label: "Worldview", tableId: "npc-worldview" },
	{ label: "Connection to the party", tableId: "connections-character" },
];

function rollLine(registry: TableRegistry, rng: () => number, label: string, tableId: string): GeneratedLine {
	const result = rollTable(tableId, registry, rng);
	return { label, text: result?.text ?? "—", tableId };
}

export function generateNpc(registry: TableRegistry, rng: () => number): GeneratedResult {
	return {
		kind: "npc",
		title: "Generated NPC",
		lines: LINE_TABLES.map(({ label, tableId }) => rollLine(registry, rng, label, tableId)),
	};
}
