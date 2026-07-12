// Pure — no `obsidian` import. Picks a quest template and fills in a
// suggested hook using a location, a monster idea, and a town backdrop — kept
// to genuinely connected core tables rather than inventing new content.

import { rollTable } from "../tables/roll";
import type { TableRegistry } from "../tables/registry";
import type { GeneratedLine, GeneratedResult } from "./types";

const TEMPLATE_TABLE = "quest-templates";

const HOOK_LINE_TABLES: ReadonlyArray<{ label: string; tableId: string }> = [
	{ label: "Location", tableId: "core-location" },
	{ label: "Monsters involved", tableId: "core-dungeon-monster" },
	{ label: "Town backdrop", tableId: "town-events-mundane" },
];

function rollLine(registry: TableRegistry, rng: () => number, label: string, tableId: string): GeneratedLine {
	const result = rollTable(tableId, registry, rng);
	return { label, text: result?.text ?? "—", tableId };
}

/** The template row is transcribed as "Name — description" (`quest-templates`
 * content module) — split it back apart for a short note title. */
function templateName(text: string): string {
	const [name] = text.split(" — ");
	return name ?? text;
}

export function generateQuest(registry: TableRegistry, rng: () => number): GeneratedResult {
	const templateLine = rollLine(registry, rng, "Quest template", TEMPLATE_TABLE);
	const hookLines = HOOK_LINE_TABLES.map(({ label, tableId }) => rollLine(registry, rng, label, tableId));

	return {
		kind: "quest",
		title: `Quest: ${templateName(templateLine.text)}`,
		lines: [templateLine, ...hookLines],
	};
}
