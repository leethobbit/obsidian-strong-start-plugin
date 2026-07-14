import { normalizePath, Notice, TFile, type App } from "obsidian";
import { FormModal } from "../../lib/form-modal";
import { textField } from "../../lib/form-fields";
import { tryFileOp } from "../../lib/notify";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { replaceBody } from "../../lib/body-split";
import { toSafeFilename } from "../../lib/slug";
import { buildRegistry } from "../../tables/registry";
import { rollTable } from "../../tables/roll";
import { parseWeightedLines, renderTableBody, renderWeightedLines } from "../../tables/parse-user-table";
import { writeTableFm } from "../../tables/table-schema";
import type { RollTable, TableRow } from "../../tables/types";
import type LazyCampaignPlugin from "../../../main";

const HELPER_TEXT = "One entry per line. Start a line with 3x to weight it. Use {{table-id}} or {{1d6}} to compose.";
const DRAFT_TABLE_ID = "__table-editor-draft__";

/** Identifies the note being edited — absent when the modal is creating a
 * brand-new table. The name field is locked during edit: it mirrors the
 * note's basename (the display name lives on the filesystem, per
 * `RollTable.name`), and renaming notes is the file explorer's job, not this
 * modal's. */
export interface TableEditorTarget {
	path: string;
	name: string;
	rows: TableRow[];
}

/**
 * Paste-a-list-and-go custom table editor (docs/plan.md "Tables" screen):
 * name + one big textarea, a live "dN · N entries" footer, and an in-memory
 * preview roll. Creates `<campaignRoot>/Tables/<Name>.md` (tables are
 * vault-global, not per-campaign — AGENTS.md) with a `lazyCampaign: {type:
 * table}` note; editing an existing one replaces its body in place via
 * `vault.process`, preserving frontmatter.
 */
export class TableEditorModal extends FormModal {
	private name: string;
	private draft: string;
	private footerEl!: HTMLElement;
	private previewMount!: HTMLElement;

	constructor(
		app: App,
		private readonly plugin: LazyCampaignPlugin,
		private readonly existing?: TableEditorTarget
	) {
		super(app);
		this.name = existing?.name ?? "";
		this.draft = existing ? renderWeightedLines(existing.rows) : "";
	}

	protected render(): void {
		this.setTitle(this.existing ? "Edit table" : "New table");

		const nameInput = textField(this.contentEl, {
			name: "Name",
			desc: this.existing ? "Rename the note from the file explorer to change this." : undefined,
			placeholder: "Rumors at the inn",
			value: this.name,
			onChange: (value) => {
				this.name = value;
			},
		});
		if (this.existing) nameInput.disabled = true;
		else this.registerFirstInput(nameInput);

		const textareaWrap = this.contentEl.createDiv({ cls: "strong-start-table-editor-textarea-wrap" });
		textareaWrap.createEl("p", { cls: "strong-start-hint", text: HELPER_TEXT });
		const textarea = textareaWrap.createEl("textarea", {
			cls: "strong-start-table-editor-textarea",
			attr: { rows: "12" },
		});
		textarea.value = this.draft;
		if (this.existing) this.registerFirstInput(textarea);
		textarea.addEventListener("input", () => {
			this.draft = textarea.value;
			this.updateFooter();
		});

		this.footerEl = textareaWrap.createDiv({ cls: "strong-start-hint strong-start-table-editor-footer" });
		this.updateFooter();

		const previewRow = this.contentEl.createDiv({ cls: "strong-start-table-editor-preview-row" });
		const previewBtn = previewRow.createEl("button", { text: "Preview roll" });
		previewBtn.addEventListener("click", () => this.previewRoll());
		this.previewMount = previewRow.createDiv({ cls: "strong-start-table-editor-preview-result" });

		this.bindEnterToSubmit(nameInput, () => this.handleSubmit());
		this.renderButtons(this.contentEl, {
			ctaText: "Save table",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private draftRows(): TableRow[] {
		return parseWeightedLines(this.draft);
	}

	private updateFooter(): void {
		const rows = this.draftRows();
		if (rows.length === 0) {
			this.footerEl.setText("No entries yet");
			return;
		}
		const totalWeight = rows.reduce((sum, row) => sum + (row.weight ?? 1), 0);
		this.footerEl.setText(`d${totalWeight} · ${rows.length} ${rows.length === 1 ? "entry" : "entries"}`);
	}

	private previewRoll(): void {
		const rows = this.draftRows();
		this.previewMount.empty();
		if (rows.length === 0) {
			this.previewMount.setText("Nothing to roll there yet.");
			return;
		}
		const draftTable: RollTable = { id: DRAFT_TABLE_ID, name: "Draft", source: "user", rows };
		// Layer the draft over the live registry (not just the raw rows) so a
		// `{{table-id}}` placeholder referencing a real table previews too.
		const registry = buildRegistry(this.plugin.tables?.all() ?? [], [draftTable]);
		const result = rollTable(DRAFT_TABLE_ID, registry, this.plugin.rng);
		this.previewMount.setText(result?.text ?? "Nothing to roll there yet.");
	}

	private async handleSubmit(): Promise<void> {
		const rows = this.draftRows();
		if (rows.length === 0) {
			new Notice("Add at least one entry first.");
			return;
		}

		if (this.existing) {
			const existing = this.existing;
			const ok = await tryFileOp(
				() => this.saveExisting(existing, rows),
				"Couldn't save that table — check the console for details."
			);
			if (!ok) return;
			new Notice(`Saved ${existing.name}.`);
			this.close();
			return;
		}

		const name = this.name.trim();
		if (name.length === 0) {
			new Notice("Give the table a name first.");
			return;
		}
		const file = await tryFileOp(() => this.saveNew(name, rows), "Couldn't create the table — check the console for details.");
		if (!file) return;
		new Notice(`Created ${name}.`);
		this.close();
	}

	private async saveNew(name: string, rows: TableRow[]): Promise<TFile> {
		const folderPath = normalizePath(`${this.plugin.settings.campaignRoot}/Tables`);
		if (!this.app.vault.getFolderByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}

		const safeName = toSafeFilename(name);
		let filePath = normalizePath(`${folderPath}/${safeName}.md`);
		if (this.app.vault.getFileByPath(filePath)) {
			// Name collision — disambiguate rather than silently overwrite an
			// existing table note (same policy as create-campaign.ts).
			filePath = normalizePath(`${folderPath}/${safeName} ${Date.now().toString(36)}.md`);
		}

		const file = await this.app.vault.create(filePath, renderTableBody(safeName, rows));
		await writeLazyFrontmatter(this.app, file, writeTableFm({}));
		return file;
	}

	private async saveExisting(existing: TableEditorTarget, rows: TableRow[]): Promise<true> {
		const file = this.app.vault.getFileByPath(existing.path);
		if (!(file instanceof TFile)) {
			throw new Error(`Table note not found: ${existing.path}`);
		}
		await this.app.vault.process(file, (raw) => replaceBody(raw, renderTableBody(existing.name, rows)));
		return true;
	}
}
