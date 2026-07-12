// Pure — no `obsidian` import. Composes a treasure suggestion from the core
// treasure/flavor tables — mirrors the resource doc's own guidance ("you can
// use the Condition, Description, and Origin table... to give such items
// additional flavor") rather than inventing a new combination.

import { rollTable } from "../tables/roll";
import type { TableRegistry } from "../tables/registry";
import type { GeneratedLine, GeneratedResult } from "./types";

const LINE_TABLES: ReadonlyArray<{ label: string; tableId: string }> = [
	{ label: "Treasure", tableId: "core-treasure" },
	{ label: "Magical item", tableId: "treasure-magical" },
	{ label: "Condition", tableId: "core-condition" },
	{ label: "Description", tableId: "core-description" },
	{ label: "Origin", tableId: "core-origin" },
];

function rollLine(registry: TableRegistry, rng: () => number, label: string, tableId: string): GeneratedLine {
	const result = rollTable(tableId, registry, rng);
	return { label, text: result?.text ?? "—", tableId };
}

export function generateTreasure(registry: TableRegistry, rng: () => number): GeneratedResult {
	return {
		kind: "treasure",
		title: "Generated treasure",
		lines: LINE_TABLES.map(({ label, tableId }) => rollLine(registry, rng, label, tableId)),
	};
}
