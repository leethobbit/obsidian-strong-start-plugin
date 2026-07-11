import { normalizePath, Notice, type App, type TFile } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { textField } from "../lib/form-fields";
import { tryFileOp } from "../lib/notify";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { newId } from "../lib/id";
import { toSafeFilename } from "../lib/slug";
import { campaignBodyScaffold, writeCampaignFm } from "./campaign-schema";
import type LazyCampaignPlugin from "../../main";

interface CreatedCampaign {
	file: TFile;
	id: string;
}

/** Simple create-campaign form (name + optional system). The full guided
 * wizard — pitch/truths/fronts with inspiration rolls — lands in M8; this
 * stays as the "quick create" path afterward. */
export class CreateCampaignModal extends FormModal {
	private name = "";
	private system = "";

	constructor(
		app: App,
		private readonly plugin: LazyCampaignPlugin
	) {
		super(app);
	}

	protected render(): void {
		this.setTitle("Create campaign");

		const nameInput = textField(this.contentEl, {
			name: "Name",
			placeholder: "Greenhollow",
			onChange: (value) => {
				this.name = value;
			},
		});
		this.registerFirstInput(nameInput);

		textField(this.contentEl, {
			name: "System",
			desc: 'Optional, free text (e.g. "5e") — lights up system-specific affordances later.',
			placeholder: "5e",
			onChange: (value) => {
				this.system = value;
			},
		});

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, {
			ctaText: "Create",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async handleSubmit(): Promise<void> {
		const name = this.name.trim();
		if (name.length === 0) {
			new Notice("Give the campaign a name first.");
			return;
		}

		const created = await tryFileOp(
			() => this.createCampaignNote(name, this.system.trim()),
			"Couldn't create the campaign — check the console for details."
		);
		if (!created) return;

		this.plugin.ui.lastCampaignId = created.id;
		await this.plugin.persist();
		new Notice(`Created ${name}.`);
		this.close();

		const leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(created.file);
	}

	private async createCampaignNote(name: string, system: string): Promise<CreatedCampaign> {
		const safeName = toSafeFilename(name);
		const folderPath = normalizePath(`${this.plugin.settings.campaignRoot}/${safeName}`);
		if (!this.app.vault.getFolderByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}

		let filePath = normalizePath(`${folderPath}/${safeName}.md`);
		const id = newId("c");
		if (this.app.vault.getFileByPath(filePath)) {
			// Folder/note collision (e.g. re-creating after a manual rename) —
			// disambiguate rather than silently overwrite the GM's existing notes.
			filePath = normalizePath(`${folderPath}/${safeName} ${id}.md`);
		}

		const file = await this.app.vault.create(filePath, campaignBodyScaffold());
		await writeLazyFrontmatter(this.app, file, writeCampaignFm({ id, system, status: "active" }));

		return { file, id };
	}
}
