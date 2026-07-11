import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type LazyCampaignPluginSettings } from "./src/settings/settings";
import { LazyCampaignPluginSettingTab } from "./src/settings/settings-tab";

// data.json shape. Settings live under a key so future siblings (telemetry,
// caches) can be added without a migration — and so nothing ever calls
// saveData(this.settings) directly, which would wipe those siblings.
interface PersistedData {
	settings: LazyCampaignPluginSettings;
}

export default class LazyCampaignPlugin extends Plugin {
	settings: LazyCampaignPluginSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		// onload is a budget: settings, commands, views, post-processors only.
		await this.loadPersisted();
		this.addSettingTab(new LazyCampaignPluginSettingTab(this.app, this));

		this.addCommand({
			id: "open",
			// Store rule: command names must NOT include the plugin name (the UI
			// already shows it) — obsidianmd/commands/no-plugin-name-in-command-name.
			name: "Open view",
			callback: () => {
				// TODO: replace with the plugin's real entry point.
			},
		});

		// Anything that scans the vault or attaches vault file-event listeners
		// belongs here — vault.on("create") fires per file during startup.
		this.app.workspace.onLayoutReady(() => {
			// TODO: deferred startup work (indexes, vault event listeners).
		});
	}

	async loadPersisted(): Promise<void> {
		const data = ((await this.loadData()) ?? {}) as Partial<PersistedData>;
		this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
	}

	async persist(): Promise<void> {
		const data: PersistedData = { settings: this.settings };
		await this.saveData(data);
	}
}
