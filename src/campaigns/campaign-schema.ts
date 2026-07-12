// Pure — no `obsidian` import.
import { buildScaffold, replaceSection } from "../lib/sections";
import { renderBulletRows } from "../sessions/bullet-list";
import { frontFromWizardInput, renderFronts, type WizardFrontInput } from "./fronts";
import type { CampaignModel, CampaignStatus } from "./types";

export interface CampaignFm {
	id: string;
	system?: string;
	status: CampaignStatus;
}

const VALID_STATUS = new Set<CampaignStatus>(["active", "archived"]);

/** Lenient reader: tolerates missing/extra fields and junk status values.
 * Returns null when the object lacks the minimum viable shape (no stable id). */
export function readCampaignFm(fm: unknown): CampaignFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	if (typeof source.id !== "string" || source.id.length === 0) return null;

	const status =
		typeof source.status === "string" && VALID_STATUS.has(source.status as CampaignStatus)
			? (source.status as CampaignStatus)
			: "active";
	const system = typeof source.system === "string" && source.system.length > 0 ? source.system : undefined;

	return { id: source.id, status, system };
}

/** Strict writer: canonical shape. Absent-state markers (`""`, and `status`
 * left as `""` for the default "active") are pruned by `lib/frontmatter.ts`
 * on write, not here. */
export function writeCampaignFm(model: Pick<CampaignModel, "id" | "system" | "status">): Record<string, unknown> {
	return {
		type: "campaign",
		id: model.id,
		system: model.system ?? "",
		status: model.status === "archived" ? "archived" : "",
	};
}

export const CAMPAIGN_BODY_SECTIONS = ["Campaign pitch", "Six truths", "Fronts", "House rules"] as const;

/** Fresh campaign note body: one empty managed section per heading, in order. */
export function campaignBodyScaffold(): string {
	return buildScaffold(CAMPAIGN_BODY_SECTIONS);
}

/**
 * Build a campaign note body from the guided creation wizard's collected
 * state (`views/home/campaign-wizard.ts`) — starts from the same empty
 * scaffold every quick-create note gets, then fills in whichever sections the
 * GM actually populated (an all-skipped wizard run produces the identical
 * scaffold `campaignBodyScaffold()` would). Party rows aren't a body
 * section — the wizard writes those as separate PC notes.
 */
export function buildCampaignBody(pitch: string, truths: readonly string[], fronts: readonly WizardFrontInput[]): string {
	let body = campaignBodyScaffold();
	body = replaceSection(body, "Campaign pitch", pitch.trim());
	body = replaceSection(body, "Six truths", renderBulletRows(truths));
	body = replaceSection(body, "Fronts", renderFronts(fronts.map(frontFromWizardInput)));
	return body;
}
