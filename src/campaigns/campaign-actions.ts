import { Notice, TFile, normalizePath, type App } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { textField } from "../lib/form-fields";
import { tryFileOp } from "../lib/notify";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { toSafeFilename } from "../lib/slug";
import { writeCampaignFm } from "./campaign-schema";
import type { CampaignModel } from "./types";

/**
 * Rename a campaign: the note first (so `fileManager.renameFile` updates every
 * `campaign: "[[...]]"` frontmatter link), then the folder-note's folder when
 * it shares the campaign's name, keeping the `<Name>/<Name>.md` convention.
 * Collisions abort with a Notice rather than overwrite.
 */
export async function renameCampaign(app: App, campaign: CampaignModel, newName: string): Promise<boolean> {
	const file = app.vault.getFileByPath(campaign.path);
	if (!(file instanceof TFile)) return false;

	const safeName = toSafeFilename(newName);
	if (safeName.length === 0) {
		new Notice("Give the campaign a name first.");
		return false;
	}
	if (safeName === file.basename) return true;

	const folder = file.parent;
	const folderIsCampaignFolder = folder !== null && folder.name === file.basename;

	const newNotePath = normalizePath(`${folder ? folder.path : ""}/${safeName}.md`);
	if (app.vault.getFileByPath(newNotePath)) {
		new Notice(`A note named "${safeName}" already exists there.`);
		return false;
	}
	await app.fileManager.renameFile(file, newNotePath);

	if (folderIsCampaignFolder && folder.parent) {
		const parentPath = folder.parent.path === "/" ? "" : folder.parent.path;
		const newFolderPath = normalizePath(`${parentPath}/${safeName}`);
		if (app.vault.getFolderByPath(newFolderPath) || app.vault.getFileByPath(newFolderPath)) {
			new Notice(`Renamed the note, but a folder named "${safeName}" already exists — the campaign folder kept its old name.`);
			return true;
		}
		await app.fileManager.renameFile(folder, newFolderPath);
	}
	return true;
}

/** Toggle archived state through the campaign codec ("cleared = deleted":
 * active is the absent default, so unarchiving removes the key). */
export async function setCampaignStatus(
	app: App,
	campaign: CampaignModel,
	status: CampaignModel["status"]
): Promise<void> {
	const file = app.vault.getFileByPath(campaign.path);
	if (!(file instanceof TFile)) return;
	await writeLazyFrontmatter(app, file, writeCampaignFm({ id: campaign.id, system: campaign.system, status }));
}

export class RenameCampaignModal extends FormModal {
	private name: string;

	constructor(
		app: App,
		private readonly campaign: CampaignModel
	) {
		super(app);
		this.name = campaign.name;
	}

	protected render(): void {
		this.setTitle("Rename campaign");

		const nameInput = textField(this.contentEl, {
			name: "Name",
			value: this.campaign.name,
			onChange: (value) => {
				this.name = value;
			},
		});
		this.registerFirstInput(nameInput);

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, {
			ctaText: "Rename",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async handleSubmit(): Promise<void> {
		const renamed = await tryFileOp(
			() => renameCampaign(this.app, this.campaign, this.name.trim()),
			"Couldn't rename the campaign — check the console for details."
		);
		if (renamed) this.close();
	}
}
