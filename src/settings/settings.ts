// Pure settings model — no `obsidian` import, so tests can import it.
export interface LazyCampaignPluginSettings {
	/** Root folder for campaign folders/notes, relative to the vault root. */
	campaignRoot: string;
	/** Feature ids currently switched off (`src/features.ts`) — a feature is
	 * on unless its id appears here. */
	disabledFeatures: string[];
}

export const DEFAULT_SETTINGS: LazyCampaignPluginSettings = {
	campaignRoot: "Campaigns",
	disabledFeatures: [],
};
