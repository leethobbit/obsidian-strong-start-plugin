// Pure — no `obsidian` import. Lenient readers + strict writers for the
// lightweight entity note types created from the prep board (SCHEMA.md: PC,
// NPC, location). Mirrors the shape of campaign-schema.ts/session-schema.ts.

export interface PcFm {
	campaign: string;
	player?: string;
	role?: string;
	/** Optional character level (1-20), M10: sizes the 5e encounter benchmark
	 * card. Absent when never set — the benchmark card falls back to a manual
	 * override in that case, never a guessed default. */
	level?: number;
}

export interface NpcFm {
	campaign: string;
	role?: string;
	location?: string;
	/** Absent = "alive". */
	status: "alive" | "dead";
}

export interface LocationFm {
	campaign: string;
}

/** Quest note (M15): the quest generator's "Save as note" output promoted to
 * a managed, linkable entity instead of a loose markdown file. */
export interface QuestFm {
	campaign: string;
	/** Absent = "open". */
	status: "open" | "done";
}

function readCampaignLink(source: Record<string, unknown>): string | null {
	return typeof source.campaign === "string" && source.campaign.length > 0 ? source.campaign : null;
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Lenient: accepts a finite number in 1-20, tolerates a numeric string
 * (hand-edited frontmatter), and drops anything else rather than throwing —
 * "cleared = deleted" means an absent/malformed level just falls back to the
 * benchmark card's manual override. */
function readOptionalLevel(value: unknown): number | undefined {
	const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(num)) return undefined;
	const rounded = Math.round(num);
	return rounded >= 1 && rounded <= 20 ? rounded : undefined;
}

export function readPcFm(fm: unknown): PcFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const campaign = readCampaignLink(source);
	if (!campaign) return null;
	return {
		campaign,
		player: readOptionalString(source.player),
		role: readOptionalString(source.role),
		level: readOptionalLevel(source.level),
	};
}

export function writePcFm(model: PcFm): Record<string, unknown> {
	return {
		type: "pc",
		campaign: model.campaign,
		player: model.player ?? "",
		role: model.role ?? "",
		level: model.level ?? "",
	};
}

export function readNpcFm(fm: unknown): NpcFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const campaign = readCampaignLink(source);
	if (!campaign) return null;
	return {
		campaign,
		role: readOptionalString(source.role),
		location: readOptionalString(source.location),
		status: source.status === "dead" ? "dead" : "alive",
	};
}

export function writeNpcFm(model: NpcFm): Record<string, unknown> {
	return {
		type: "npc",
		campaign: model.campaign,
		role: model.role ?? "",
		location: model.location ?? "",
		status: model.status === "dead" ? "dead" : "",
	};
}

export function readQuestFm(fm: unknown): QuestFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const campaign = readCampaignLink(source);
	if (!campaign) return null;
	return { campaign, status: source.status === "done" ? "done" : "open" };
}

export function writeQuestFm(model: QuestFm): Record<string, unknown> {
	return {
		type: "quest",
		campaign: model.campaign,
		status: model.status === "done" ? "done" : "",
	};
}

export function readLocationFm(fm: unknown): LocationFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const campaign = readCampaignLink(source);
	if (!campaign) return null;
	return { campaign };
}

export function writeLocationFm(model: LocationFm): Record<string, unknown> {
	return { type: "location", campaign: model.campaign };
}
