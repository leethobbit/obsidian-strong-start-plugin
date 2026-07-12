// Pure — no `obsidian` import. Aggregates every vendored core table. The
// plugin builds its registry from this list (main.ts, `onLayoutReady`) —
// add a new content module's table array here to make it rollable.

import type { RollTable } from "../tables/types";
import { STRONG_START_TABLES } from "./strong-starts";
import { SECRETS_CLUES_TABLES } from "./secrets-clues";
import { NPC_NAME_TABLES } from "./npc-names";
import { NPC_GENERATOR_TABLES } from "./npc-generator";
import { CONNECTIONS_TABLES } from "./connections";
import { QUEST_TEMPLATES_TABLES } from "./quest-templates";
import { CORE_ADVENTURE_GENERATOR_TABLES } from "./core-adventure-generators";
import { TREASURE_TABLES } from "./treasure";
import { TRAP_TABLES } from "./traps";
import { MONUMENT_TABLES } from "./monuments";
import { CONNECTOR_TABLES } from "./connectors";
import { CHAMBER_TABLES } from "./chambers";
import { ITEM_TABLES } from "./items";
import { TOWN_EVENTS_TABLES } from "./town-events";
import { DUNGEON_MONSTERS_TABLES } from "./dungeon-monsters";

export const CORE_TABLES: readonly RollTable[] = [
	...STRONG_START_TABLES,
	...SECRETS_CLUES_TABLES,
	...NPC_NAME_TABLES,
	...NPC_GENERATOR_TABLES,
	...CONNECTIONS_TABLES,
	...QUEST_TEMPLATES_TABLES,
	...CORE_ADVENTURE_GENERATOR_TABLES,
	...TREASURE_TABLES,
	...TRAP_TABLES,
	...MONUMENT_TABLES,
	...CONNECTOR_TABLES,
	...CHAMBER_TABLES,
	...ITEM_TABLES,
	...TOWN_EVENTS_TABLES,
	...DUNGEON_MONSTERS_TABLES,
];
