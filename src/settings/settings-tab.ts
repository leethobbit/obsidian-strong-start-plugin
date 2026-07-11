import { type App, PluginSettingTab, Setting } from "obsidian";
import type LazyCampaignPlugin from "../../main";

export class LazyCampaignPluginSettingTab extends PluginSettingTab {
	plugin: LazyCampaignPlugin;

	constructor(app: App, plugin: LazyCampaignPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		// Store rules: no top-level "Settings" heading, sentence case throughout,
		// setHeading() for section headings (only when there are 2+ sections).

		new Setting(containerEl)
			.setName("Example option")
			.setDesc("Replace with the plugin's real first setting.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.exampleOption).onChange(async (value) => {
					this.plugin.settings.exampleOption = value;
					await this.plugin.persist();
				})
			);
	}
}
