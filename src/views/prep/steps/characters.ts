import { Notice, setIcon, TFile, type App } from "obsidian";
import { FormModal } from "../../../lib/form-modal";
import { textField } from "../../../lib/form-fields";
import { tryFileOp } from "../../../lib/notify";
import { asLazy, writeLazyFrontmatter } from "../../../lib/frontmatter";
import { createPcNote } from "../../../roster/entity-files";
import { readPcFm, writePcFm } from "../../../roster/entity-schema";
import { renderEmptyState, renderStepper } from "../../panel-kit";
import { openEntityEditor } from "../../home/entity-editor-modal";
import type { StepContext } from "../step-context";
import type { CampaignModel } from "../../../campaigns/types";
import type { PcModel } from "../../../roster/types";

const MIN_LEVEL = 1;
const MAX_LEVEL = 20;

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
			const item = list.createEl("li", { cls: "lazy-campaign-roster-row" });
			const label = pc.player ? `${pc.name} (${pc.player})` : pc.name;
			const link = item.createEl("a", { cls: "lazy-campaign-session-link", text: label, attr: { href: "#" } });
			ctx.registerDomEvent(link, "click", (evt) => {
				evt.preventDefault();
				void ctx.openNote(pc.path);
			});

			// M10: inline level edit (SCHEMA.md "pc" level, optional 1-20) — a
			// stepper writing straight to that PC's own note, not the session's
			// frontmatter (level is per-character, not per-session state).
			const levelRow = item.createSpan({ cls: "lazy-campaign-roster-level" });
			levelRow.createSpan({ cls: "lazy-campaign-roster-level-label", text: "Lv" });
			renderStepper(levelRow, ctx, {
				value: pc.level ?? MIN_LEVEL,
				min: MIN_LEVEL,
				max: MAX_LEVEL,
				label: `${pc.name}'s level`,
				onChange: (next) => void setPcLevel(ctx, pc, next),
			});

			// M17: full in-plugin editing — the name link keeps opening the raw
			// note; the pencil opens the entity editor (player/role/level/body).
			const editBtn = item.createEl("button", {
				cls: "lazy-campaign-icon-button",
				attr: { "aria-label": `Edit ${pc.name}`, type: "button" },
			});
			setIcon(editBtn, "pencil");
			ctx.registerDomEvent(editBtn, "click", () => {
				void openEntityEditor(ctx.app, { kind: "pc", campaign: ctx.campaign, existingPath: pc.path });
			});
		}
	}

	const createBtn = container.createEl("button", { cls: "mod-cta", text: "Create character note" });
	ctx.registerDomEvent(createBtn, "click", () => {
		new CreatePcModal(ctx.app, ctx.campaign, () => ctx.requestRerender()).open();
	});
}

/** Writes straight to `pc`'s own note frontmatter (never the session's) — the
 * roster is a scan, so a successful write is picked up by the next store
 * notification, but the step also rerenders itself optimistically the same
 * way "Create character note" does. */
async function setPcLevel(ctx: StepContext, pc: PcModel, level: number): Promise<void> {
	const file = ctx.app.vault.getFileByPath(pc.path);
	if (!(file instanceof TFile)) return;

	const existing = asLazy(ctx.app.metadataCache.getFileCache(file)?.frontmatter);
	const current = readPcFm(existing) ?? { campaign: pc.campaign, player: pc.player, role: pc.role };

	await tryFileOp(
		() => writeLazyFrontmatter(ctx.app, file, writePcFm({ ...current, level })),
		"Couldn't save that character's level — check the console for details."
	);
	ctx.requestRerender();
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
