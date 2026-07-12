import { Notice, setIcon } from "obsidian";
import { rollTable } from "../../tables/roll";
import type { TableRegistry } from "../../tables/registry";
import type { RollResult, RollTable, TableCategory } from "../../tables/types";
import { ATTRIBUTION_TEXT, ATTRIBUTION_URL } from "../../content/attribution";
import { CORE_TABLES } from "../../content";
import { tryFileOp } from "../../lib/notify";
import { renderEmptyState } from "../panel-kit";
import { TableEditorModal } from "./table-editor-modal";
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
 * of every core table grouped by category plus a "My tables" group (M5's
 * user-authored tables, with New/Edit/Open-note affordances and a shadowing
 * indicator for ones that replace a core table by id); right pane with the
 * selected table's roll button and a result stack. Rebuilds its whole DOM on
 * every `render()` (no focus-sensitive inputs live here, unlike the prep
 * board) but keeps `selectedTableId`/`stack` as instance fields so they
 * survive that rebuild — session-only, never persisted.
 */
export class TablesPanel {
	private selectedTableId: string | null = null;
	/** True when `selectedTableId` is a core id whose table is currently
	 * shadowed by a user table of the same id, and the GM clicked the muted
	 * "hidden" row to peek at the built-in's own rows (docs/plan.md's
	 * shadowing indicator). Reset by any other row's click handler. */
	private peekingShadowedCore = false;
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
		for (const category of CATEGORY_ORDER) {
			const inCategory = CORE_TABLES.filter((t) => t.category === category).sort((a, b) => a.name.localeCompare(b.name));
			if (inCategory.length === 0) continue;

			listEl.createEl("h4", { cls: "lazy-campaign-tables-category", text: CATEGORY_LABELS[category] });
			for (const core of inCategory) {
				this.renderCoreRow(listEl, registry, core);
			}
		}

		this.renderMyTables(listEl, registry);
	}

	private renderCoreRow(listEl: HTMLElement, registry: TableRegistry, core: RollTable): void {
		const resolved = registry.get(core.id);
		const shadowed = resolved?.source === "user";

		if (shadowed) {
			const isActive = this.selectedTableId === core.id && this.peekingShadowedCore;
			const row = listEl.createEl("button", {
				cls: `lazy-campaign-tables-row lazy-campaign-tables-row-shadowed${isActive ? " is-active" : ""}`,
				attr: { type: "button" },
			});
			row.createSpan({ text: core.name });
			row.createSpan({ cls: "lazy-campaign-tables-shadowed-label", text: " hidden — replaced by your table" });
			this.view.registerDomEvent(row, "click", () => {
				this.selectedTableId = core.id;
				this.peekingShadowedCore = true;
				this.render();
			});
			return;
		}

		const isActive = this.selectedTableId === core.id && !this.peekingShadowedCore;
		const row = listEl.createEl("button", {
			cls: `lazy-campaign-tables-row${isActive ? " is-active" : ""}`,
			text: core.name,
			attr: { type: "button" },
		});
		this.view.registerDomEvent(row, "click", () => {
			this.selectedTableId = core.id;
			this.peekingShadowedCore = false;
			this.render();
		});
	}

	private renderMyTables(listEl: HTMLElement, registry: TableRegistry): void {
		const header = listEl.createDiv({ cls: "lazy-campaign-tables-mytables-header" });
		header.createEl("h4", { cls: "lazy-campaign-tables-category", text: "My tables" });
		const newBtn = header.createEl("button", {
			cls: "lazy-campaign-tables-new-button",
			text: "New table",
			attr: { type: "button" },
		});
		this.view.registerDomEvent(newBtn, "click", () => new TableEditorModal(this.view.app, this.view.plugin).open());

		const userTables = registry
			.all()
			.filter((t) => t.source === "user")
			.sort((a, b) => a.name.localeCompare(b.name));

		if (userTables.length === 0) {
			renderEmptyState(listEl, "No custom tables yet.");
			return;
		}
		for (const table of userTables) {
			this.renderUserRow(listEl, table);
		}
	}

	private renderUserRow(listEl: HTMLElement, table: RollTable): void {
		const isActive = this.selectedTableId === table.id && !this.peekingShadowedCore;
		const row = listEl.createDiv({ cls: `lazy-campaign-tables-user-row${isActive ? " is-active" : ""}` });

		const nameBtn = row.createEl("button", {
			cls: "lazy-campaign-tables-row-name",
			text: table.name,
			attr: { type: "button" },
		});
		this.view.registerDomEvent(nameBtn, "click", () => {
			this.selectedTableId = table.id;
			this.peekingShadowedCore = false;
			this.render();
		});

		if (CORE_TABLES.some((c) => c.id === table.id)) {
			row.createSpan({ cls: "lazy-campaign-tables-badge", text: "replaces built-in" });
		}

		const actions = row.createDiv({ cls: "lazy-campaign-tables-user-row-actions" });

		const editBtn = actions.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": "Edit table", type: "button" },
		});
		setIcon(editBtn, "pencil");
		this.view.registerDomEvent(editBtn, "click", () => {
			if (!table.path) return;
			new TableEditorModal(this.view.app, this.view.plugin, { path: table.path, name: table.name, rows: table.rows }).open();
		});

		const openBtn = actions.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": "Open note", type: "button" },
		});
		setIcon(openBtn, "external-link");
		this.view.registerDomEvent(openBtn, "click", () => void this.openNote(table.path));
	}

	private renderDetail(detailEl: HTMLElement, registry: TableRegistry): void {
		const selectedId = this.selectedTableId;
		if (!selectedId) {
			renderEmptyState(detailEl, "Pick a table, then roll.");
			return;
		}

		if (this.peekingShadowedCore) {
			const core = CORE_TABLES.find((t) => t.id === selectedId);
			if (!core) {
				renderEmptyState(detailEl, "Pick a table, then roll.");
				return;
			}
			this.renderShadowedCorePeek(detailEl, core);
			return;
		}

		const table = registry.get(selectedId);
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

	/** Read-only view of a shadowed core table's own rows — the GM peeked at
	 * it from the muted "hidden" row (docs/plan.md's shadowing indicator). No
	 * roll button here: rolling `table.id` would hit the registry's live
	 * (shadowing) entry, not this one, which would silently roll the wrong
	 * table while displaying the other one's rows. */
	private renderShadowedCorePeek(detailEl: HTMLElement, core: RollTable): void {
		detailEl.createEl("h3", { text: core.name });
		detailEl.createDiv({
			cls: "lazy-campaign-tables-shadow-banner",
			text: "Hidden — replaced by your table. Delete or rename your table to restore the built-in.",
		});
		detailEl.createEl("p", {
			cls: "lazy-campaign-hint",
			text: `d${core.rows.length} · ${core.rows.length} ${core.rows.length === 1 ? "entry" : "entries"}`,
		});
		const list = detailEl.createEl("ul", { cls: "lazy-campaign-tables-peek-list" });
		for (const row of core.rows) {
			list.createEl("li", { text: row.text });
		}
	}

	private async openNote(path?: string): Promise<void> {
		if (!path) return;
		const file = this.view.app.vault.getFileByPath(path);
		if (!file) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const leaf = this.view.app.workspace.getLeaf(true);
		await leaf.openFile(file);
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
