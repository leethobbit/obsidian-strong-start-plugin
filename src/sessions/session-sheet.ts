// Pure — no `obsidian` import. Builds the "Copy session sheet" one-page
// markdown export (docs/plan.md delight detail: "'Copy session sheet' one-page
// markdown export"). Pulled from the session's live frontmatter model plus its
// raw note body (managed sections) — never written back to the vault, only
// ever copied to the clipboard, so it stays a pure function of its inputs.

import { sectionContent } from "../lib/sections";
import { parseTaskBulletSection } from "./bullet-list";
import { displayText, isWikilink } from "./link-list";
import type { Secret, SessionModel } from "./types";

function displayName(raw: string): string {
	return isWikilink(raw) ? displayText(raw) : raw;
}

function section(heading: string, bodyLines: readonly string[]): string[] {
	return [`## ${heading}`, "", ...bodyLines, ""];
}

function linkListSection(heading: string, items: readonly string[]): string[] {
	return section(heading, items.length === 0 ? ["- None yet."] : items.map((item) => `- ${displayName(item)}`));
}

/** `- [ ]`/`- [x]` so an unrevealed secret reads as "still to reveal" at a
 * glance — the sheet's own "(unrevealed marked)" requirement — without
 * spoiling the text itself (this sheet is GM-eyes-only, so the text is shown
 * either way; the checkbox is just the at-a-glance status). */
function secretLine(secret: Secret): string {
	const revealed = secret.revealed === true;
	return `- [${revealed ? "x" : " "}] ${secret.text}${revealed ? " (revealed)" : ""}`;
}

function rewardRows(body: string): string[] {
	return sectionContent(body, "Rewards")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => (line.startsWith("-") ? line : `- ${line}`));
}

/**
 * A clean one-page markdown prep sheet for `session`: strong start, scenes,
 * secrets (unrevealed ones checkbox-marked), locations, NPCs, monsters,
 * rewards. `body` is the session note's raw body (for the managed sections
 * this doesn't already have in frontmatter).
 */
export function buildSessionSheet(campaignName: string, session: SessionModel, body: string): string {
	const lines: string[] = [];

	const title = `# Session ${session.session} — ${campaignName}`;
	lines.push(session.date ? `${title} (${session.date})` : title, "");

	const strongStart = sectionContent(body, "Strong start");
	lines.push(...section("Strong start", [strongStart.length > 0 ? strongStart : "None yet."]));

	const scenes = parseTaskBulletSection(sectionContent(body, "Scenes")).rows;
	lines.push(
		...section(
			"Scenes",
			scenes.length === 0 ? ["- None yet."] : scenes.map((scene) => `- [${scene.done ? "x" : " "}] ${scene.text}`)
		)
	);

	const activeSecrets = session.secrets.filter((secret) => !secret.archived);
	lines.push(...section("Secrets", activeSecrets.length === 0 ? ["- None yet."] : activeSecrets.map(secretLine)));

	lines.push(...linkListSection("Locations", session.locations));
	lines.push(...linkListSection("NPCs", session.npcs));
	lines.push(...linkListSection("Monsters", session.monsters));

	const rewards = rewardRows(body);
	lines.push(...section("Rewards", rewards.length === 0 ? ["- None yet."] : rewards));

	return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
