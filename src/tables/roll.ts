// Pure — no `obsidian` import. Weighted table roll + `{{...}}` template
// expansion (a dice expression or a nested table-id reference, dice syntax
// tried first per SCHEMA.md's custom-table contract). Recursion depth cap 8,
// cycle-safe: unresolvable or cyclic placeholders are left literal in the
// output rather than throwing — this module never surfaces an error, it
// just fails soft (the GM sees `{{whatever}}` verbatim and can fix the table).

import { rollDice } from "./dice";
import type { TableRegistry } from "./registry";
import type { RollResult, RollTable } from "./types";

const MAX_DEPTH = 8;
const PLACEHOLDER_RE = /\{\{([^{}]*)\}\}/g;

export function rollTable(id: string, registry: TableRegistry, rng: () => number): RollResult | null {
	const trace: RollResult["trace"] = [];
	const text = expandTableRef(id, registry, rng, 0, new Set(), trace);
	if (text === null) return null;
	return { text, trace };
}

function pickWeighted(table: RollTable, rng: () => number): string | null {
	if (table.rows.length === 0) return null;

	const weights = table.rows.map((row) => row.weight ?? 1);
	const total = weights.reduce((sum, w) => sum + w, 0);
	if (total <= 0) return null;

	let roll = rng() * total;
	for (let i = 0; i < table.rows.length; i++) {
		roll -= weights[i];
		if (roll < 0) return table.rows[i].text;
	}
	// Floating-point edge case: roll landed exactly on the running total.
	return table.rows[table.rows.length - 1].text;
}

function expandTableRef(
	id: string,
	registry: TableRegistry,
	rng: () => number,
	depth: number,
	stack: ReadonlySet<string>,
	trace: RollResult["trace"]
): string | null {
	if (depth > MAX_DEPTH || stack.has(id)) return null;

	const table = registry.get(id);
	if (!table) return null;

	const picked = pickWeighted(table, rng);
	if (picked === null) return null;

	trace.push({ tableId: id, result: picked });
	const nextStack = new Set(stack);
	nextStack.add(id);
	return expandPlaceholders(picked, registry, rng, depth + 1, nextStack, trace);
}

function expandPlaceholders(
	text: string,
	registry: TableRegistry,
	rng: () => number,
	depth: number,
	stack: ReadonlySet<string>,
	trace: RollResult["trace"]
): string {
	return text.replace(PLACEHOLDER_RE, (match, rawToken: string) => {
		const token = rawToken.trim();
		if (token.length === 0) return match;

		// Dice syntax is tried first; only if that fails is the token treated
		// as a table id (SCHEMA.md).
		const dice = rollDice(token, rng);
		if (dice) {
			trace.push({ dice: token, result: String(dice.total) });
			return String(dice.total);
		}

		if (depth > MAX_DEPTH || stack.has(token)) return match; // depth cap / cycle: leave literal

		const table = registry.get(token);
		if (!table) return match; // unresolvable table id: leave literal

		const picked = pickWeighted(table, rng);
		if (picked === null) return match;

		trace.push({ tableId: token, result: picked });
		const nextStack = new Set(stack);
		nextStack.add(token);
		return expandPlaceholders(picked, registry, rng, depth + 1, nextStack, trace);
	});
}
