// Pure — no `obsidian` import. Aggregates every vendored core table. The
// plugin builds its registry from this list (main.ts, `onLayoutReady`) —
// add a new content module's table array here to make it rollable.

import type { RollTable } from "../tables/types";
import { STRONG_START_TABLES } from "./strong-starts";
import { SECRETS_CLUES_TABLES } from "./secrets-clues";
import { NPC_NAME_TABLES } from "./npc-names";

export const CORE_TABLES: readonly RollTable[] = [
	...STRONG_START_TABLES,
	...SECRETS_CLUES_TABLES,
	...NPC_NAME_TABLES,
];
