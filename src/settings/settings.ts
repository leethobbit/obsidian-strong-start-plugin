// Pure settings model — no `obsidian` import, so tests can import it.
export interface LazyCampaignPluginSettings {
	exampleOption: boolean;
}

export const DEFAULT_SETTINGS: LazyCampaignPluginSettings = {
	exampleOption: true,
};
