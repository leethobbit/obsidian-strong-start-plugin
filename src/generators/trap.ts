// Pure — no `obsidian` import. Composes a trap from the "Random Traps"
// section's three tables — the doc's own recipe: "roll on the Type list and
// the Trigger table... add an effect from the Flavor table to put a unique
// twist on the damage."

import { rollTable } from "../tables/roll";
import type { TableRegistry } from "../tables/registry";
import type { GeneratedLine, GeneratedResult } from "./types";

const LINE_TABLES: ReadonlyArray<{ label: string; tableId: string }> = [
	{ label: "Flavor", tableId: "trap-flavor" },
	{ label: "Type", tableId: "trap-type" },
	{ label: "Trigger", tableId: "trap-trigger" },
];

function rollLine(registry: TableRegistry, rng: () => number, label: string, tableId: string): GeneratedLine {
	const result = rollTable(tableId, registry, rng);
	return { label, text: result?.text ?? "—", tableId };
}

export function generateTrap(registry: TableRegistry, rng: () => number): GeneratedResult {
	const lines = LINE_TABLES.map(({ label, tableId }) => rollLine(registry, rng, label, tableId));
	const flavor = lines[0].text;
	const type = lines[1].text;
	return { kind: "trap", title: `Trap: ${flavor} ${type}`, lines };
}
