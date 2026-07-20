// Obsidian glue for the Generators subtab's "Send to prep"/"Save as note"
// actions (src/views/tables/generators-panel.ts) — reuses the same write
// paths the prep board's step editors go through (self-write marking,
// managed-section helpers, `mutateLazyFrontmatter`) so a generator insert
// looks identical to a GM typing it in by hand. Kept separate from the pure
// `generators/*.ts` modules per AGENTS.md's purity split.

import { normalizePath, TFile, type App } from "obsidian";
import { addLink } from "../sessions/link-list";
import { parseBulletSection, renderBulletRows } from "../sessions/bullet-list";
import { replaceSection, sectionContent } from "../lib/sections";
import { mutateLazyFrontmatter } from "../lib/frontmatter";
import { beginSelfWrite } from "../lib/self-write";
import { toSafeFilename } from "../lib/slug";
import { createLocationNote, createNpcNote, createQuestNote } from "../roster/entity-files";
import { readSessionFm, toSessionFm, writeSessionFm } from "../sessions/session-schema";
import { bulletsForLines, renderMarkdown } from "./types";
import type { CampaignModel } from "../campaigns/types";
import type { SessionModel } from "../sessions/types";
import type { LinkStepKey } from "../sessions/steps";
import type { GeneratedResult } from "./types";

function parentPath(filePath: string): string {
	const idx = filePath.lastIndexOf("/");
	return idx === -1 ? "" : filePath.slice(0, idx);
}

/** Append `value` to one of the open session's link-chip arrays (npcs/
 * locations/monsters) — same shape as `chip-editor.ts`'s commit, standalone
 * so the Generators subtab can call it without a full `StepContext`. */
export async function appendSessionLink(
	app: App,
	session: SessionModel,
	fmKey: LinkStepKey,
	value: string
): Promise<void> {
	const file = app.vault.getFileByPath(session.path);
	if (!(file instanceof TFile)) throw new Error("Session note not found.");

	const done = beginSelfWrite(file.path);
	try {
		// Read-modify-write against the note's CURRENT state — the store model
		// in hand can lag a write that landed moments ago (e.g. two quick
		// "Send to prep" clicks), and writing it back wholesale would revert it.
		await mutateLazyFrontmatter(app, file, (current) => {
			const fm = readSessionFm(current) ?? toSessionFm(session);
			return writeSessionFm({ ...fm, [fmKey]: addLink(fm[fmKey], value) });
		});
	} finally {
		done();
	}
}

/** Append one bullet row to a managed body section (Scenes/Rewards). Returns
 * false without writing if the section has been hand-edited into something
 * the row parser can't safely round-trip (mirrors `list-section-editor.ts`'s
 * malformed-section guard) — the caller shows an "open the note" notice. */
export async function appendSessionBullet(app: App, session: SessionModel, heading: string, text: string): Promise<boolean> {
	const file = app.vault.getFileByPath(session.path);
	if (!(file instanceof TFile)) throw new Error("Session note not found.");

	let appended = true;
	const done = beginSelfWrite(file.path);
	try {
		await app.vault.process(file, (raw) => {
			const parsed = parseBulletSection(sectionContent(raw, heading));
			if (parsed.malformed) {
				appended = false;
				return raw;
			}
			return replaceSection(raw, heading, renderBulletRows([...parsed.rows, text]));
		});
	} finally {
		done();
	}
	return appended;
}

/** NPC "Save as note": creates the NPC entity note with the generated lines
 * seeded under `## Generator notes` (SCHEMA.md: NPC body is freeform;
 * generators write archetype/connection lines into it). */
export async function saveNpcGeneratorNote(app: App, campaign: CampaignModel, result: GeneratedResult): Promise<TFile> {
	const name = result.lines.find((line) => line.label === "Name")?.text ?? result.title;
	const body = replaceSection("", "Generator notes", renderMarkdown(result));
	return createNpcNote(app, campaign, name, body);
}

/** Monument/Trap "Save as note": creates a location note with `aspectLines`
 * seeded as `## Aspects` bullets (SCHEMA.md: location body carries the
 * fantastic aspects as bullets under that heading). */
export async function saveLocationGeneratorNote(
	app: App,
	campaign: CampaignModel,
	name: string,
	aspectLines: GeneratedResult["lines"]
): Promise<TFile> {
	const body = replaceSection("", "Aspects", bulletsForLines(aspectLines).join("\n"));
	return createLocationNote(app, campaign, name, body);
}

/** Quest "Save as note" (M15): a managed `type: quest` entity note — linkable
 * from scenes/chips and discoverable by type, unlike the loose markdown file
 * it used to be. The generated outline seeds the freeform body. */
export async function saveQuestGeneratorNote(app: App, campaign: CampaignModel, result: GeneratedResult): Promise<TFile> {
	return createQuestNote(app, campaign, result.title, `${renderMarkdown(result)}\n`);
}

/** Treasure "Save as note": a plain markdown note (no managed frontmatter —
 * treasure isn't one of SCHEMA.md's entity types) under the active campaign's
 * own folder, named after the generator's title. */
export async function saveGeneratorNote(app: App, campaign: CampaignModel, result: GeneratedResult): Promise<TFile> {
	const folderPath = normalizePath(parentPath(campaign.path));
	const safeName = toSafeFilename(result.title);
	let filePath = normalizePath(`${folderPath}/${safeName}.md`);
	if (app.vault.getFileByPath(filePath)) {
		filePath = normalizePath(`${folderPath}/${safeName} ${Date.now().toString(36)}.md`);
	}
	return app.vault.create(filePath, `${renderMarkdown(result)}\n`);
}
