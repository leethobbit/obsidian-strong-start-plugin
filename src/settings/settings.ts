// Pure settings model — no `obsidian` import, so tests can import it.
export interface LazyCampaignPluginSettings {
	/** Root folder for campaign folders/notes, relative to the vault root. */
	campaignRoot: string;
}

export const DEFAULT_SETTINGS: LazyCampaignPluginSettings = {
	campaignRoot: "Campaigns",
};
