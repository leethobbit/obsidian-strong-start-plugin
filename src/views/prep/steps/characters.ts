import { Notice, type App } from "obsidian";
import { FormModal } from "../../../lib/form-modal";
import { textField } from "../../../lib/form-fields";
import { tryFileOp } from "../../../lib/notify";
import { createPcNote } from "../../../roster/entity-files";
import { renderEmptyState } from "../../panel-kit";
import type { StepContext } from "../step-context";
import type { CampaignModel } from "../../../campaigns/types";

/**
 * Roster from a store scan for `type: pc` notes of this campaign. Nothing
 * beyond the master-list "done" tick persists per session (SCHEMA.md: "Step
 * 1 stores nothing per-session").
 */
export function renderCharactersStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Review the characters" });

	const pcs = ctx.plugin.store?.pcsOf(ctx.campaign.path) ?? [];

	if (pcs.length === 0) {
		renderEmptyState(
			container,
			"No player characters yet. Add them during session zero — or create notes with lazyCampaign.type: pc."
		);
	} else {
		const list = container.createEl("ul", { cls: "lazy-campaign-roster-list" });
		for (const pc of pcs) {
			const item = list.createEl("li");
			const label = pc.player ? `${pc.name} (${pc.player})` : pc.name;
			const link = item.createEl("a", { cls: "lazy-campaign-session-link", text: label, attr: { href: "#" } });
			ctx.registerDomEvent(link, "click", (evt) => {
				evt.preventDefault();
				void ctx.openNote(pc.path);
			});
		}
	}

	const createBtn = container.createEl("button", { cls: "mod-cta", text: "Create character note" });
	ctx.registerDomEvent(createBtn, "click", () => {
		new CreatePcModal(ctx.app, ctx.campaign, () => ctx.requestRerender()).open();
	});
}

class CreatePcModal extends FormModal {
	private name = "";
	private player = "";

	constructor(
		app: App,
		private readonly campaign: CampaignModel,
		private readonly onCreated: () => void
	) {
		super(app);
	}

	protected render(): void {
		this.setTitle("Create character note");

		const nameInput = textField(this.contentEl, {
			name: "Name",
			placeholder: "Kara Windrunner",
			onChange: (value) => {
				this.name = value;
			},
		});
		this.registerFirstInput(nameInput);

		textField(this.contentEl, {
			name: "Player",
			placeholder: "Sarah",
			onChange: (value) => {
				this.player = value;
			},
		});

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, { ctaText: "Create", onSubmit: () => this.handleSubmit() });
	}

	private async handleSubmit(): Promise<void> {
		const name = this.name.trim();
		if (name.length === 0) {
			new Notice("Give the character a name first.");
			return;
		}

		const file = await tryFileOp(
			() => createPcNote(this.app, this.campaign, name, this.player.trim()),
			"Couldn't create the character note — check the console for details."
		);
		if (!file) return;

		this.close();
		this.onCreated();
	}
}
