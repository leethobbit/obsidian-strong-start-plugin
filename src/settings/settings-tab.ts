import { normalizePath, type App, PluginSettingTab, Setting } from "obsidian";
import type LazyCampaignPlugin from "../../main";
import { DEFAULT_SETTINGS } from "./settings";

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
			.setName("Campaign folder")
			.setDesc("Where new campaigns are created, relative to the vault root.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.campaignRoot)
					.setValue(this.plugin.settings.campaignRoot)
					.onChange(async (value) => {
						const trimmed = value.trim();
						this.plugin.settings.campaignRoot = normalizePath(
							trimmed.length > 0 ? trimmed : DEFAULT_SETTINGS.campaignRoot
						);
						await this.plugin.persist();
					})
			);
	}
}
