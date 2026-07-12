import { normalizePath, Notice, type App, type TFile } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { textField } from "../lib/form-fields";
import { tryFileOp } from "../lib/notify";
import { writeLazyFrontmatter } from "../lib/frontmatter";
import { newId } from "../lib/id";
import { toSafeFilename } from "../lib/slug";
import { buildCampaignBody, campaignBodyScaffold, writeCampaignFm } from "./campaign-schema";
import type { WizardFrontInput } from "./fronts";
import type LazyCampaignPlugin from "../../main";

export interface CreatedCampaign {
	file: TFile;
	id: string;
}

/** Extra body content the guided creation wizard (`views/home/campaign-wizard.ts`)
 * collects beyond name/system — omitted (or all-empty) for the quick-create
 * modal, which just gets the plain empty scaffold. */
export interface CampaignCreateExtras {
	pitch?: string;
	truths?: readonly string[];
	fronts?: readonly WizardFrontInput[];
}

/** Shared create-note flow for both the quick-create modal below and the
 * guided wizard: folder + note under `campaignRoot`, stable id, canonical
 * frontmatter. Collision policy: disambiguate with a trailing id rather than
 * silently overwrite an existing note of the same name. */
export async function createCampaignNote(
	app: App,
	campaignRoot: string,
	name: string,
	system: string,
	extras?: CampaignCreateExtras
): Promise<CreatedCampaign> {
	const safeName = toSafeFilename(name);
	const folderPath = normalizePath(`${campaignRoot}/${safeName}`);
	if (!app.vault.getFolderByPath(folderPath)) {
		await app.vault.createFolder(folderPath);
	}

	let filePath = normalizePath(`${folderPath}/${safeName}.md`);
	const id = newId("c");
	if (app.vault.getFileByPath(filePath)) {
		// Folder/note collision (e.g. re-creating after a manual rename) —
		// disambiguate rather than silently overwrite the GM's existing notes.
		filePath = normalizePath(`${folderPath}/${safeName} ${id}.md`);
	}

	const body = extras
		? buildCampaignBody(extras.pitch ?? "", extras.truths ?? [], extras.fronts ?? [])
		: campaignBodyScaffold();
	const file = await app.vault.create(filePath, body);
	await writeLazyFrontmatter(app, file, writeCampaignFm({ id, system, status: "active" }));

	return { file, id };
}

/** True if `campaignRoot/<safe name>` already has a campaign folder — the
 * wizard's name-uniqueness check (docs/plan.md: "validated non-empty/unique
 * folder"), surfaced as an inline error rather than the quick-create modal's
 * silent disambiguation, since a guided flow should let the GM pick another
 * name on purpose. */
export function campaignFolderExists(app: App, campaignRoot: string, name: string): boolean {
	const safeName = toSafeFilename(name);
	return app.vault.getFolderByPath(normalizePath(`${campaignRoot}/${safeName}`)) !== null;
}

/** Simple create-campaign form (name + optional system) — the "quick create"
 * path, reachable from the guided wizard's first step for GMs in a hurry. */
export class CreateCampaignModal extends FormModal {
	private name = "";
	private system = "";

	constructor(
		app: App,
		private readonly plugin: LazyCampaignPlugin,
		/** Called after the note is created and the active campaign is set,
		 * before the note is opened in a new leaf — the guided wizard's step 1
		 * "Quick create" link passes this to close itself back to the Dashboard
		 * instead of leaving a stale wizard behind the newly-opened note. */
		private readonly onCreated?: () => void
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
			() => createCampaignNote(this.app, this.plugin.settings.campaignRoot, name, this.system.trim()),
			"Couldn't create the campaign — check the console for details."
		);
		if (!created) return;

		this.plugin.ui.lastCampaignId = created.id;
		await this.plugin.persist();
		new Notice(`Created ${name}.`);
		this.close();
		this.onCreated?.();

		const leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(created.file);
	}
}
