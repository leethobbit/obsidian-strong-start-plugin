import { Notice } from "obsidian";
import { rollTable } from "../../tables/roll";
import type { TableRegistry } from "../../tables/registry";
import type { RollResult, TableCategory } from "../../tables/types";
import { ATTRIBUTION_TEXT, ATTRIBUTION_URL } from "../../content/attribution";
import { tryFileOp } from "../../lib/notify";
import { renderEmptyState } from "../panel-kit";
import type { LazyCampaignView } from "../lazy-view";

const CATEGORY_ORDER: readonly TableCategory[] = ["characters", "places", "plots", "items", "monsters"];
const CATEGORY_LABELS: Record<TableCategory, string> = {
	characters: "Characters",
	places: "Places",
	plots: "Plots",
	items: "Items",
	monsters: "Monsters",
};

interface StackEntry {
	tableId: string;
	result: RollResult;
}

/**
 * The Tables panel (Roll sub-tab only — Generators arrives in M7): left list
 * of every registered table grouped by category, right pane with the
 * selected table's roll button and a result stack. Rebuilds its whole DOM on
 * every `render()` (no focus-sensitive inputs live here, unlike the prep
 * board) but keeps `selectedTableId`/`stack` as instance fields so they
 * survive that rebuild — session-only, never persisted.
 */
export class TablesPanel {
	private selectedTableId: string | null = null;
	private stack: StackEntry[] = [];

	constructor(
		private readonly view: LazyCampaignView,
		private readonly containerEl: HTMLElement
	) {}

	render(): void {
		this.containerEl.empty();
		const registry = this.view.plugin.tables;

		const shell = this.containerEl.createDiv({ cls: "lazy-campaign-tables-shell" });
		const board = shell.createDiv({ cls: "lazy-campaign-tables-board" });
		const listEl = board.createDiv({ cls: "lazy-campaign-tables-list" });
		const detailEl = board.createDiv({ cls: "lazy-campaign-tables-detail" });

		if (!registry) {
			renderEmptyState(listEl, "Tables aren't ready yet.");
			renderEmptyState(detailEl, "Pick a table, then roll.");
		} else {
			this.renderList(listEl, registry);
			this.renderDetail(detailEl, registry);
		}

		this.renderFooter(shell);
	}

	private renderList(listEl: HTMLElement, registry: TableRegistry): void {
		const tables = registry.all();

		for (const category of CATEGORY_ORDER) {
			const inCategory = tables
				.filter((t) => t.category === category)
				.sort((a, b) => a.name.localeCompare(b.name));
			if (inCategory.length === 0) continue;

			listEl.createEl("h4", { cls: "lazy-campaign-tables-category", text: CATEGORY_LABELS[category] });
			for (const table of inCategory) {
				const isActive = table.id === this.selectedTableId;
				const row = listEl.createEl("button", {
					cls: `lazy-campaign-tables-row${isActive ? " is-active" : ""}`,
					text: table.name,
					attr: { type: "button" },
				});
				this.view.registerDomEvent(row, "click", () => {
					this.selectedTableId = table.id;
					this.render();
				});
			}
		}

		if (tables.length === 0) {
			renderEmptyState(listEl, "No tables yet.");
		}
	}

	private renderDetail(detailEl: HTMLElement, registry: TableRegistry): void {
		const table = this.selectedTableId ? registry.get(this.selectedTableId) : undefined;
		if (!table) {
			renderEmptyState(detailEl, "Pick a table, then roll.");
			return;
		}

		detailEl.createEl("h3", { text: table.name });
		detailEl.createEl("p", {
			cls: "lazy-campaign-hint",
			text: `d${table.rows.length} · ${table.rows.length} ${table.rows.length === 1 ? "entry" : "entries"}`,
		});

		const rollBtn = detailEl.createEl("button", { cls: "mod-cta lazy-campaign-tables-roll-button", text: "Roll" });
		this.view.registerDomEvent(rollBtn, "click", () => this.rollAndPush(table.id));

		const stackEl = detailEl.createDiv({ cls: "lazy-campaign-tables-result-stack" });
		const entries = this.stack.filter((e) => e.tableId === table.id);
		if (entries.length === 0) {
			renderEmptyState(stackEl, "No rolls yet this session.");
		}
		for (const entry of entries) {
			this.renderStackEntry(stackEl, entry);
		}
	}

	private renderStackEntry(stackEl: HTMLElement, entry: StackEntry): void {
		const card = stackEl.createDiv({ cls: "lazy-campaign-tables-result-card" });
		card.createDiv({ cls: "lazy-campaign-tables-result-text", text: entry.result.text });

		const buttons = card.createDiv({ cls: "lazy-campaign-tables-result-buttons" });

		const copyBtn = buttons.createEl("button", { text: "Copy" });
		this.view.registerDomEvent(copyBtn, "click", () => void this.copyText(entry.result.text));

		const rerollBtn = buttons.createEl("button", { text: "Reroll" });
		this.view.registerDomEvent(rerollBtn, "click", () => this.rerollEntry(entry));

		if (entry.result.trace.length > 1) {
			const details = card.createEl("details", { cls: "lazy-campaign-tables-trace" });
			details.createEl("summary", { text: "How this rolled" });
			const list = details.createEl("ul");
			for (const step of entry.result.trace) {
				const label = step.tableId ?? step.dice ?? "";
				list.createEl("li", { text: `${label} → ${step.result}` });
			}
		}
	}

	private renderFooter(shell: HTMLElement): void {
		const footer = shell.createDiv({ cls: "lazy-campaign-tables-footer" });
		footer.createSpan({ text: `${ATTRIBUTION_TEXT} ` });
		footer.createEl("a", {
			text: "Read the source document",
			href: ATTRIBUTION_URL,
			attr: { target: "_blank", rel: "noopener" },
		});
	}

	private rollAndPush(tableId: string): void {
		const registry = this.view.plugin.tables;
		if (!registry) return;
		const result = rollTable(tableId, registry, this.view.plugin.rng);
		if (!result) {
			new Notice("That table has no rows to roll.");
			return;
		}
		this.stack.unshift({ tableId, result });
		this.render();
	}

	private rerollEntry(entry: StackEntry): void {
		const registry = this.view.plugin.tables;
		if (!registry) return;
		const result = rollTable(entry.tableId, registry, this.view.plugin.rng);
		if (!result) return;
		entry.result = result;
		this.render();
	}

	private async copyText(text: string): Promise<void> {
		await tryFileOp(() => navigator.clipboard.writeText(text), "Couldn't copy that to the clipboard.");
	}
}
