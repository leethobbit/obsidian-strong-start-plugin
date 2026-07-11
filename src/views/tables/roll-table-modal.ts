import { FuzzySuggestModal, Notice, type App } from "obsidian";
import { rollTable } from "../../tables/roll";
import type { RollTable } from "../../tables/types";
import type LazyCampaignPlugin from "../../../main";

/**
 * "Roll on a table" command surface — fuzzy-pick any registered table (core,
 * or a core table shadowed by a user one from M5) and roll it once, showing
 * the result as a Notice. Deliberately simple: no insert target, no copy —
 * that's what the Tables panel is for.
 */
export class RollTableSuggestModal extends FuzzySuggestModal<RollTable> {
	constructor(
		app: App,
		private readonly plugin: LazyCampaignPlugin
	) {
		super(app);
		this.setPlaceholder("Roll on a table…");
	}

	getItems(): RollTable[] {
		return this.plugin.tables?.all() ?? [];
	}

	getItemText(item: RollTable): string {
		return item.name;
	}

	onChooseItem(item: RollTable): void {
		const registry = this.plugin.tables;
		if (!registry) return;
		const result = rollTable(item.id, registry, this.plugin.rng);
		if (!result) {
			new Notice("That table has no rows to roll.");
			return;
		}
		new Notice(result.text);
	}
}
