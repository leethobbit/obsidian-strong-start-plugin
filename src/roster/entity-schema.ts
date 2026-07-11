// Pure — no `obsidian` import. Lenient readers + strict writers for the
// lightweight entity note types created from the prep board (SCHEMA.md: PC,
// NPC, location). Mirrors the shape of campaign-schema.ts/session-schema.ts.

export interface PcFm {
	campaign: string;
	player?: string;
	role?: string;
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

function readCampaignLink(source: Record<string, unknown>): string | null {
	return typeof source.campaign === "string" && source.campaign.length > 0 ? source.campaign : null;
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readPcFm(fm: unknown): PcFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const campaign = readCampaignLink(source);
	if (!campaign) return null;
	return { campaign, player: readOptionalString(source.player), role: readOptionalString(source.role) };
}

export function writePcFm(model: PcFm): Record<string, unknown> {
	return { type: "pc", campaign: model.campaign, player: model.player ?? "", role: model.role ?? "" };
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
