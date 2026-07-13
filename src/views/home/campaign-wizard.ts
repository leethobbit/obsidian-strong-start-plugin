import { Notice, setIcon } from "obsidian";
import { textField } from "../../lib/form-fields";
import { tryFileOp } from "../../lib/notify";
import { mountRollChip, renderInspireControl, type RegisterDomEvent } from "../roll-chip";
import { rollTable } from "../../tables/roll";
import { campaignFolderExists, createCampaignNote, CreateCampaignModal } from "../../campaigns/create-campaign";
import { createPcNote } from "../../roster/entity-files";
import type { WizardFrontInput } from "../../campaigns/fronts";
import type { RollResult } from "../../tables/types";
import type { CampaignModel } from "../../campaigns/types";
import type { LazyCampaignView } from "../lazy-view";

const PITCH_TABLE_ID = "campaign-pitches";
const TRUTHS_TABLE_ID = "campaign-truths";
const FRONTS_TABLE_ID = "campaign-fronts";
const TRUTHS_COUNT = 6;
const FRONTS_MAX = 3;
const PORTENTS_PER_FRONT = 3;

const STEP_LABELS = ["Name & pitch", "Six truths", "Fronts", "The party", "Done"] as const;

interface WizardFrontDraft {
	name: string;
	goal: string;
	portents: string[];
	doom: string;
}

interface WizardPartyRow {
	name: string;
	player: string;
	oneLiner: string;
}

export interface CampaignWizardOptions {
	onCancel: () => void;
	onCreated: () => void;
}

/**
 * The guided campaign creation wizard (docs/plan.md M8): a full-body flow
 * inside the Home panel (never a modal) that replaces its host container
 * while active. State is in-memory only on this instance — it survives step
 * navigation but is lost if the view closes before "Create campaign"
 * (docs/plan.md mentions a persistent "Finish setting up…" draft banner; this
 * deliberately skips that — DEVIATION: an abandoned wizard is simply gone,
 * matching the plugin's existing "nothing persists outside a real note or
 * data.json" posture rather than adding a new scratch-state slot for a
 * one-time flow).
 *
 * No focus-preserve/self-write machinery here: nothing is written to the
 * vault until "Create campaign", and no field's `input` handler triggers a
 * DOM rebuild (only Back/Next/step-dot navigation and structural edits like
 * add/remove front do), so there's nothing that could steal focus mid-type.
 */
export class CampaignWizardPanel {
	private containerEl: HTMLElement | null = null;
	private step = 0;

	private name = "";
	private nameError: string | null = null;
	private pitch = "";
	private truths: string[] = Array.from({ length: TRUTHS_COUNT }, () => "");
	private fronts: WizardFrontDraft[] = [];
	private party: WizardPartyRow[] = [];

	constructor(
		private readonly view: LazyCampaignView,
		private readonly options: CampaignWizardOptions
	) {}

	render(container: HTMLElement): void {
		this.containerEl = container;
		container.empty();

		const shell = container.createDiv({ cls: "lazy-campaign-wizard-shell" });
		this.renderDots(shell);

		const content = shell.createDiv({ cls: "lazy-campaign-wizard-content" });
		switch (this.step) {
			case 0:
				this.renderStepNamePitch(content);
				break;
			case 1:
				this.renderStepTruths(content);
				break;
			case 2:
				this.renderStepFronts(content);
				break;
			case 3:
				this.renderStepParty(content);
				break;
			case 4:
				this.renderStepDone(content);
				break;
		}

		this.renderNav(shell);
	}

	private rerender(): void {
		if (this.containerEl) this.render(this.containerEl);
	}

	/** Generic pass-through kept as an actual generic function (see
	 * `prep-panel.ts`'s identical comment) so it type-checks as
	 * `RegisterDomEvent` without a cast. */
	private registerDomEvent: RegisterDomEvent = <K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		cb: (evt: HTMLElementEventMap[K]) => void
	): void => {
		this.view.registerDomEvent(el, type, cb);
	};

	private rollTable(id: string): RollResult | null {
		const registry = this.view.plugin.tables;
		return registry ? rollTable(id, registry, this.view.plugin.rng) : null;
	}

	// ---- Progress dots + nav ------------------------------------------------

	private renderDots(shell: HTMLElement): void {
		const dots = shell.createDiv({ cls: "lazy-campaign-progress-dots lazy-campaign-wizard-dots" });
		STEP_LABELS.forEach((label, index) => {
			dots.createSpan({
				cls: `lazy-campaign-progress-dot${index < this.step ? " is-done" : ""}${index === this.step ? " is-active" : ""}`,
				attr: { "aria-label": label },
			});
		});
	}

	private renderNav(shell: HTMLElement): void {
		const nav = shell.createDiv({ cls: "lazy-campaign-wizard-nav" });

		const cancelBtn = nav.createEl("button", { text: "Cancel" });
		this.view.registerDomEvent(cancelBtn, "click", () => this.options.onCancel());

		const right = nav.createDiv({ cls: "lazy-campaign-wizard-nav-right" });

		if (this.step > 0) {
			const backBtn = right.createEl("button", { text: "Back" });
			this.view.registerDomEvent(backBtn, "click", () => {
				this.step--;
				this.rerender();
			});
		}

		if (this.step < STEP_LABELS.length - 1) {
			const nextBtn = right.createEl("button", { text: "Next" });
			this.view.registerDomEvent(nextBtn, "click", () => {
				this.step++;
				this.rerender();
			});
		}

		// Available from step 1 on (docs/plan.md) — only the name is required,
		// so a GM can create after just the first step if they want to.
		const createBtn = right.createEl("button", { cls: "mod-cta", text: "Create campaign" });
		this.view.registerDomEvent(createBtn, "click", () => void this.handleCreate());
	}

	// ---- Step 1: name & pitch -----------------------------------------------

	private renderStepNamePitch(container: HTMLElement): void {
		container.createEl("h3", { text: "Name your campaign" });

		const nameInput = textField(container, {
			name: "Name",
			placeholder: "Greenhollow",
			value: this.name,
			onChange: (value) => {
				this.name = value;
				this.nameError = null;
			},
		});
		nameInput.setAttribute("data-key", "wizard-name");
		if (this.nameError) {
			container.createEl("p", { cls: "lazy-campaign-wizard-error", text: this.nameError });
		}

		container.createEl("p", {
			cls: "lazy-campaign-hint",
			text: "Describe the central theme of your campaign in a single sentence.",
		});
		const pitchTextarea = container.createEl("textarea", {
			cls: "lazy-campaign-wizard-textarea",
			attr: { rows: "3", "data-key": "wizard-pitch", placeholder: "Prevent the coming of the black moon…" },
		});
		pitchTextarea.value = this.pitch;
		this.view.registerDomEvent(pitchTextarea, "input", () => {
			this.pitch = pitchTextarea.value;
		});

		renderInspireControl({
			container: container.createDiv(),
			tableIds: [PITCH_TABLE_ID],
			getTable: (id) => this.view.plugin.tables?.get(id),
			rollTable: (id) => this.rollTable(id),
			registerDomEvent: this.registerDomEvent,
			buttonText: "Need a spark?",
			onInsert: (text) => {
				this.pitch = text;
				pitchTextarea.value = text;
			},
		});

		const quick = container.createEl("p", { cls: "lazy-campaign-wizard-quick-create" });
		const quickLink = quick.createEl("a", { text: "In a hurry? Quick create", attr: { href: "#" } });
		this.view.registerDomEvent(quickLink, "click", (evt) => {
			evt.preventDefault();
			new CreateCampaignModal(this.view.app, this.view.plugin, () => this.options.onCreated()).open();
		});

		const starter = container.createEl("p", { cls: "lazy-campaign-wizard-quick-create" });
		const starterLink = starter.createEl("a", {
			text: "First campaign? Start with Whitesparrow, a ready-to-run village adventure",
			attr: { href: "#" },
		});
		this.view.registerDomEvent(starterLink, "click", (evt) => {
			evt.preventDefault();
			void (async () => {
				// Only close the wizard when the starter actually got created —
				// on failure the GM keeps whatever they'd already typed here.
				if (await this.view.plugin.createStarterCampaignAndOpen()) this.options.onCreated();
			})();
		});
	}

	// ---- Step 2: six truths --------------------------------------------------

	private renderStepTruths(container: HTMLElement): void {
		container.createEl("h3", { text: "Six truths" });
		container.createEl("p", {
			cls: "lazy-campaign-hint",
			text: "What makes this world yours? Three is plenty to start.",
		});

		const list = container.createDiv({ cls: "lazy-campaign-wizard-truths" });
		this.truths.forEach((truth, index) => {
			const row = list.createDiv({ cls: "lazy-campaign-wizard-truth-row" });
			row.createSpan({ cls: "lazy-campaign-wizard-truth-number", text: String(index + 1) });

			const input = row.createEl("input", {
				type: "text",
				cls: "lazy-campaign-wizard-truth-input",
				attr: { "data-key": `wizard-truth-${index}`, placeholder: "A truth about this world…" },
			});
			input.value = truth;
			this.view.registerDomEvent(input, "input", () => {
				this.truths[index] = input.value;
			});

			const chipMount = row.createDiv({ cls: "lazy-campaign-roll-chip-mount" });
			const diceBtn = row.createEl("button", {
				cls: "lazy-campaign-icon-button",
				attr: { "aria-label": "Roll for inspiration", type: "button" },
			});
			setIcon(diceBtn, "dices");
			this.view.registerDomEvent(diceBtn, "click", () => {
				mountRollChip({
					container: chipMount,
					sourceLabel: "Six truths inspiration",
					roll: () => this.rollTable(TRUTHS_TABLE_ID),
					onInsert: (text) => {
						this.truths[index] = text;
						input.value = text;
					},
					registerDomEvent: this.registerDomEvent,
				});
			});
		});
	}

	// ---- Step 3: fronts -------------------------------------------------------

	private renderStepFronts(container: HTMLElement): void {
		container.createEl("h3", { text: "Fronts" });
		container.createEl("p", { cls: "lazy-campaign-hint", text: "One good villain beats three vague ones." });

		const list = container.createDiv();
		this.fronts.forEach((front, index) => this.renderFrontDraftCard(list, front, index));

		if (this.fronts.length < FRONTS_MAX) {
			const addBtn = container.createEl("button", { text: "Add front" });
			this.view.registerDomEvent(addBtn, "click", () => {
				this.fronts.push({ name: "", goal: "", portents: Array.from({ length: PORTENTS_PER_FRONT }, () => ""), doom: "" });
				this.rerender();
			});
		}
	}

	private renderFrontDraftCard(container: HTMLElement, front: WizardFrontDraft, index: number): void {
		const card = container.createDiv({ cls: "lazy-campaign-front-card" });

		const nameRow = card.createDiv({ cls: "lazy-campaign-wizard-field-row" });
		const nameInput = nameRow.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-name-input",
			attr: { "data-key": `wizard-front-${index}-name`, placeholder: "Front name" },
		});
		nameInput.value = front.name;
		this.view.registerDomEvent(nameInput, "input", () => {
			front.name = nameInput.value;
		});
		this.renderFieldDice(nameRow, "Campaign fronts", FRONTS_TABLE_ID, (text) => {
			front.name = text;
			nameInput.value = text;
		});

		const goalRow = card.createDiv({ cls: "lazy-campaign-wizard-field-row" });
		const goalInput = goalRow.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-goal-input",
			attr: { "data-key": `wizard-front-${index}-goal`, placeholder: "Goal…" },
		});
		goalInput.value = front.goal;
		this.view.registerDomEvent(goalInput, "input", () => {
			front.goal = goalInput.value;
		});
		this.renderFieldDice(goalRow, "Campaign fronts", FRONTS_TABLE_ID, (text) => {
			front.goal = text;
			goalInput.value = text;
		});

		const portentsEl = card.createDiv({ cls: "lazy-campaign-front-portents" });
		front.portents.forEach((portent, portentIndex) => {
			const input = portentsEl.createEl("input", {
				type: "text",
				cls: "lazy-campaign-front-portent-input",
				attr: { "data-key": `wizard-front-${index}-portent-${portentIndex}`, placeholder: `Grim portent ${portentIndex + 1}` },
			});
			input.value = portent;
			this.view.registerDomEvent(input, "input", () => {
				front.portents[portentIndex] = input.value;
			});
		});

		const doomInput = card.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-doom-input",
			attr: { "data-key": `wizard-front-${index}-doom`, placeholder: "Doom — what happens if this front wins?" },
		});
		doomInput.value = front.doom;
		this.view.registerDomEvent(doomInput, "input", () => {
			front.doom = doomInput.value;
		});

		const actions = card.createDiv({ cls: "lazy-campaign-front-actions" });
		const removeBtn = actions.createEl("button", { text: "Remove front" });
		this.view.registerDomEvent(removeBtn, "click", () => {
			this.fronts = this.fronts.filter((_, i) => i !== index);
			this.rerender();
		});
	}

	private renderFieldDice(row: HTMLElement, sourceLabel: string, tableId: string, onInsert: (text: string) => void): void {
		const chipMount = row.createDiv({ cls: "lazy-campaign-roll-chip-mount" });
		const diceBtn = row.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": "Roll for inspiration", type: "button" },
		});
		setIcon(diceBtn, "dices");
		this.view.registerDomEvent(diceBtn, "click", () => {
			mountRollChip({
				container: chipMount,
				sourceLabel,
				roll: () => this.rollTable(tableId),
				onInsert,
				registerDomEvent: this.registerDomEvent,
			});
		});
	}

	// ---- Step 4: the party -----------------------------------------------------

	private renderStepParty(container: HTMLElement): void {
		container.createEl("h3", { text: "The party" });
		container.createEl("p", { cls: "lazy-campaign-hint", text: "Skip this if session zero hasn't happened yet." });

		this.party.forEach((row, index) => this.renderPartyRow(container, row, index));

		const addBtn = container.createEl("button", { text: "Add character" });
		this.view.registerDomEvent(addBtn, "click", () => {
			this.party.push({ name: "", player: "", oneLiner: "" });
			this.rerender();
		});
	}

	private renderPartyRow(container: HTMLElement, row: WizardPartyRow, index: number): void {
		const card = container.createDiv({ cls: "lazy-campaign-wizard-party-row" });

		const nameInput = card.createEl("input", {
			type: "text",
			cls: "lazy-campaign-wizard-party-input",
			attr: { "data-key": `wizard-party-${index}-name`, placeholder: "Character name" },
		});
		nameInput.value = row.name;
		this.view.registerDomEvent(nameInput, "input", () => {
			row.name = nameInput.value;
		});

		const playerInput = card.createEl("input", {
			type: "text",
			cls: "lazy-campaign-wizard-party-input",
			attr: { "data-key": `wizard-party-${index}-player`, placeholder: "Player" },
		});
		playerInput.value = row.player;
		this.view.registerDomEvent(playerInput, "input", () => {
			row.player = playerInput.value;
		});

		const lineInput = card.createEl("input", {
			type: "text",
			cls: "lazy-campaign-wizard-party-input",
			attr: { "data-key": `wizard-party-${index}-line`, placeholder: "One-liner" },
		});
		lineInput.value = row.oneLiner;
		this.view.registerDomEvent(lineInput, "input", () => {
			row.oneLiner = lineInput.value;
		});

		const removeBtn = card.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": "Remove character", type: "button" },
		});
		setIcon(removeBtn, "x");
		this.view.registerDomEvent(removeBtn, "click", () => {
			this.party = this.party.filter((_, i) => i !== index);
			this.rerender();
		});
	}

	// ---- Step 5: done ----------------------------------------------------------

	private renderStepDone(container: HTMLElement): void {
		container.createEl("h3", { text: "Ready when you are" });
		const summary = container.createDiv({ cls: "lazy-campaign-wizard-summary" });

		const name = this.name.trim();
		summary.createEl("p", {
			cls: name.length === 0 ? "lazy-campaign-wizard-error" : undefined,
			text: name.length > 0 ? name : "No name yet — give it one on the first step before creating.",
		});

		const pitch = this.pitch.trim();
		if (pitch.length > 0) summary.createEl("p", { text: pitch });

		const truths = this.truths.map((t) => t.trim()).filter((t) => t.length > 0);
		if (truths.length > 0) {
			const ul = summary.createEl("ul");
			for (const truth of truths) ul.createEl("li", { text: truth });
		}

		const fronts = this.fronts.filter((f) => f.name.trim().length > 0);
		for (const front of fronts) {
			summary.createEl("p", { text: `Front: ${front.name.trim()}` });
		}

		const party = this.party.filter((p) => p.name.trim().length > 0);
		for (const row of party) {
			const suffix = row.player.trim().length > 0 ? ` (played by ${row.player.trim()})` : "";
			summary.createEl("p", { text: `${row.name.trim()}${suffix}` });
		}

		if (pitch.length === 0 && truths.length === 0 && fronts.length === 0 && party.length === 0) {
			summary.createEl("p", { cls: "lazy-campaign-hint", text: "Just a name — you can fill in the rest later on the foundation tab." });
		}
	}

	// ---- Create --------------------------------------------------------------

	private async handleCreate(): Promise<void> {
		const plugin = this.view.plugin;
		const name = this.name.trim();

		if (name.length === 0) {
			this.nameError = "Give the campaign a name first.";
			this.step = 0;
			this.rerender();
			return;
		}
		if (campaignFolderExists(this.view.app, plugin.settings.campaignRoot, name)) {
			this.nameError = `A campaign named "${name}" already exists — pick another name.`;
			this.step = 0;
			this.rerender();
			return;
		}

		const truths = this.truths.map((t) => t.trim()).filter((t) => t.length > 0);
		const fronts: WizardFrontInput[] = this.fronts
			.filter((f) => f.name.trim().length > 0)
			.map((f) => ({ name: f.name, goal: f.goal, portents: f.portents, doom: f.doom }));

		const created = await tryFileOp(
			() => createCampaignNote(this.view.app, plugin.settings.campaignRoot, name, "", { pitch: this.pitch, truths, fronts }),
			"Couldn't create the campaign — check the console for details."
		);
		if (!created) return;

		const campaignModel: CampaignModel = { id: created.id, name, path: created.file.path, status: "active" };
		for (const row of this.party) {
			const rowName = row.name.trim();
			if (rowName.length === 0) continue;
			await tryFileOp(
				() => createPcNote(this.view.app, campaignModel, rowName, row.player.trim(), row.oneLiner.trim()),
				`Couldn't create a note for ${rowName} — check the console for details.`
			);
		}

		plugin.ui.lastCampaignId = created.id;
		await plugin.persist();
		new Notice(`Created ${name}.`);
		this.options.onCreated();
	}
}
