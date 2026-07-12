// Pure — no `obsidian` import. The session-zero one-page-guide builder
// (docs/plan.md M15): pitch + six truths + expectations — plus lines/veils,
// which are table agreements and belong in the players' hands — as a single
// hand-to-players markdown note. Everything GM-private (fronts, secrets,
// house-rule internals) is simply never read.

import { sectionContent } from "../lib/sections";
import { parseBulletSection } from "../sessions/bullet-list";

export interface GuideSource {
	campaignName: string;
	/** Raw campaign note content (frontmatter tolerated, as in recap-export). */
	campaignBody: string;
	/** Session-zero note state; absent when the note doesn't exist yet. */
	sessionZero?: {
		lines: readonly string[];
		veils: readonly string[];
		/** Raw session-zero note content, for the `## Expectations` section. */
		body: string;
	};
}

/** Returns null when there's nothing to hand out yet (no pitch, no truths,
 * no expectations — an empty page would read as a bug, not a guide). */
export function buildSessionZeroGuide(source: GuideSource): string | null {
	const pitch = sectionContent(source.campaignBody, "Campaign pitch");
	const truths = parseBulletSection(sectionContent(source.campaignBody, "Six truths")).rows;
	const expectations = source.sessionZero ? sectionContent(source.sessionZero.body, "Expectations") : "";
	const lines = source.sessionZero?.lines ?? [];
	const veils = source.sessionZero?.veils ?? [];

	if (pitch.length === 0 && truths.length === 0 && expectations.length === 0 && lines.length === 0 && veils.length === 0) {
		return null;
	}

	const parts: string[] = [`# ${source.campaignName} — player guide`];

	if (pitch.length > 0) {
		parts.push("## The pitch");
		parts.push(pitch);
	}
	if (truths.length > 0) {
		parts.push("## Truths of this world");
		parts.push(truths.map((t) => `- ${t}`).join("\n"));
	}
	if (expectations.length > 0) {
		parts.push("## Expectations");
		parts.push(expectations);
	}
	if (lines.length > 0 || veils.length > 0) {
		parts.push("## Safety");
		const safety: string[] = [];
		if (lines.length > 0) safety.push(`**Lines (never on screen):**\n${lines.map((l) => `- ${l}`).join("\n")}`);
		if (veils.length > 0) safety.push(`**Veils (off-screen / fade out):**\n${veils.map((v) => `- ${v}`).join("\n")}`);
		parts.push(safety.join("\n\n"));
	}

	return `${parts.join("\n\n")}\n`;
}
