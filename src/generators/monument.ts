// Pure — no `obsidian` import. Composes a monument: the structure itself plus
// up to three fantastic aspects (origin/condition/unusual effect — SCHEMA.md:
// a location note's body carries exactly this shape under `## Aspects`).

import { rollTable } from "../tables/roll";
import type { TableRegistry } from "../tables/registry";
import type { GeneratedLine, GeneratedResult } from "./types";

const LINE_TABLES: ReadonlyArray<{ label: string; tableId: string }> = [
	{ label: "Monument", tableId: "monument-structure" },
	{ label: "Origin", tableId: "monument-origin" },
	{ label: "Condition", tableId: "monument-condition" },
	{ label: "Unusual effect", tableId: "monument-effect" },
];

function rollLine(registry: TableRegistry, rng: () => number, label: string, tableId: string): GeneratedLine {
	const result = rollTable(tableId, registry, rng);
	return { label, text: result?.text ?? "—", tableId };
}

export function generateMonument(registry: TableRegistry, rng: () => number): GeneratedResult {
	const lines = LINE_TABLES.map(({ label, tableId }) => rollLine(registry, rng, label, tableId));
	return { kind: "monument", title: `Monument: ${lines[0].text}`, lines };
}
