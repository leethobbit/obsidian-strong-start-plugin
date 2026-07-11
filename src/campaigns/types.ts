// Pure — no `obsidian` import.

export type CampaignStatus = "active" | "archived";

export interface CampaignModel {
	id: string;
	name: string;
	/** Vault path of the campaign note (folder-note style). */
	path: string;
	system?: string;
	status: CampaignStatus;
}

// Re-exported so campaign-facing modules (store, panels) can pull both models
// from one place without also reaching into `src/sessions/`.
export type { SessionModel } from "../sessions/types";
