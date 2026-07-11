// Pure — no `obsidian` import. Merges core + user tables; user tables shadow
// core tables by id — that IS the customization mechanism (AGENTS.md "Built-in
// content"). M5 wires real user-authored tables (parsed from `type: table`
// notes) through this same `buildRegistry(core, user)` seam; M3 only ever
// calls it with `user` omitted.

import type { RollTable } from "./types";

export interface TableRegistry {
	get(id: string): RollTable | undefined;
	all(): RollTable[];
}

export function buildRegistry(core: readonly RollTable[], user: readonly RollTable[] = []): TableRegistry {
	const byId = new Map<string, RollTable>();
	for (const table of core) byId.set(table.id, table);
	// Inserted after core, so a same-id user table overwrites (shadows) it —
	// `Map` preserves the later `set()`'s value.
	for (const table of user) byId.set(table.id, table);

	return {
		get: (id) => byId.get(id),
		all: () => [...byId.values()],
	};
}
