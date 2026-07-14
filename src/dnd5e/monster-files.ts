// Obsidian glue for monster notes (M18): create under `<campaign>/Monsters/`
// through the shared entity-note machinery (collision-safe naming,
// `writeLazyFrontmatter` pruning). Rename goes through the existing
// `renameEntityNote` (src/roster/entity-files.ts).

import type { App, TFile } from "obsidian";
import { createEntityNote } from "../roster/entity-files";
import { writeMonsterFm, type MonsterFm } from "./monster-schema";
import type { CampaignModel } from "../campaigns/types";

export async function createMonsterNote(
	app: App,
	campaign: CampaignModel,
	name: string,
	fm: MonsterFm,
	body: string
): Promise<TFile> {
	return createEntityNote(app, campaign, "Monsters", name, writeMonsterFm(fm), body);
}
