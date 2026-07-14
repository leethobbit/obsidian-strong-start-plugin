import { normalizePath, Notice, type App, PluginSettingTab, Setting } from "obsidian";
import type LazyCampaignPlugin from "../../main";
import { DEFAULT_SETTINGS } from "./settings";
import { FEATURES, featureEnabled } from "../features";
import {
	ATTRIBUTION_TEXT,
	ATTRIBUTION_URL,
	MONSTER_BUILDER_ATTRIBUTION_TEXT,
	MONSTER_BUILDER_ATTRIBUTION_URL,
} from "../content/attribution";

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

		new Setting(containerEl).setName("Features").setHeading();

		for (const feature of FEATURES) {
			new Setting(containerEl)
				.setName(feature.label)
				.setDesc(feature.description)
				.addToggle((toggle) =>
					toggle.setValue(featureEnabled(this.plugin.settings, feature.id)).onChange(async (value) => {
						const disabled = new Set(this.plugin.settings.disabledFeatures);
						if (value) disabled.delete(feature.id);
						else disabled.add(feature.id);
						this.plugin.settings.disabledFeatures = [...disabled];
						await this.plugin.persist();
						// Feature-gated UI (5e drawer, solo tables, session-zero
						// tab) must follow the toggle while the view is open.
						this.plugin.notifyFeaturesChanged();
					})
				);
		}

		new Setting(containerEl)
			.setName("Reset tips and welcome")
			.setDesc("Clears every dismissed tip and shows the welcome guide again next time you open the view.")
			.addButton((button) =>
				button.setButtonText("Reset").onClick(async () => {
					this.plugin.hints.dismissed = [];
					await this.plugin.persist();
					new Notice("Tips and welcome reset.");
				})
			);

		new Setting(containerEl).setName("About").setHeading();

		const aboutEl = containerEl.createDiv({ cls: "strong-start-settings-about" });
		aboutEl.createEl("p", { text: ATTRIBUTION_TEXT });
		aboutEl.createEl("a", {
			// Document title, not a sentence — keep the source's own capitalization.
			text: "Lazy GM's Resource Document",
			href: ATTRIBUTION_URL,
			attr: { target: "_blank", rel: "noopener" },
		});
		aboutEl.createEl("p", { text: MONSTER_BUILDER_ATTRIBUTION_TEXT });
		aboutEl.createEl("a", {
			// Document title, not a sentence — keep the source's own capitalization.
			text: "Lazy GM's 5e Monster Builder Resource Document",
			href: MONSTER_BUILDER_ATTRIBUTION_URL,
			attr: { target: "_blank", rel: "noopener" },
		});
	}
}
