import { Component, debounce, MarkdownRenderer, setIcon } from "obsidian";
import { replaceSection, sectionContent } from "../../lib/sections";
import { DeferredRebuildQueue, preserveFocus } from "../../lib/focus-preserve";
import { isSelfWrite } from "../../lib/self-write";
import { readCampaignBody, writeCampaignSection } from "../../campaigns/campaign-files";
import { blankFront, parseFronts, renderFronts, toggleFrontPortent, type Front } from "../../campaigns/fronts";
import { renderHint } from "../../help/hint";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import { renderInspireControl, type RegisterDomEvent } from "../roll-chip";
import { renderListSectionEditor, type SectionEditorCtx } from "../prep/steps/list-section-editor";
import { rollTable } from "../../tables/roll";
import type { RollResult } from "../../tables/types";
import type { CampaignModel } from "../../campaigns/types";
import type { LazyCampaignView } from "../lazy-view";

const PITCH_HEADING = "Campaign pitch";
const TRUTHS_HEADING = "Six truths";
const FRONTS_HEADING = "Fronts";
const PITCH_TABLE_ID = "campaign-pitches";
const TRUTHS_TABLE_ID = "campaign-truths";

/**
 * The Home / Foundation sub-tab: a read/edit view of the campaign note's
 * `## Campaign pitch` / `## Six truths` / `## Fronts` body sections, using the
 * same section-write + focus-preserve/self-write machinery as the prep board
 * (AGENTS.md risk #2). Mounted by `home-panel.ts` into a container it owns and
 * reuses across re-renders (never emptied by anyone else).
 */
export class FoundationPanel {
	private containerEl: HTMLElement | null = null;
	private campaign: CampaignModel | null = null;
	private bodyText = "";

	private editingPitch = false;
	private fronts: Front[] = [];
	private rawFrontsSection = "";
	private confirmingDeleteIndex: number | null = null;

	private pitchMdComponent: Component | null = null;
	private debouncers: Array<{ cancel(): void; run(): unknown }> = [];
	private frontsWriteQueue: Promise<void> = Promise.resolve();
	private rebuildQueue: DeferredRebuildQueue | null = null;

	constructor(private readonly view: LazyCampaignView) {}

	render(container: HTMLElement, changedPaths?: ReadonlySet<string>): void {
		const plugin = this.view.plugin;
		const campaign = plugin.activeCampaign();
		const campaignChanged = !this.campaign || this.campaign.path !== campaign?.path;

		if (container !== this.containerEl) {
			this.containerEl = container;
			this.rebuildQueue = new DeferredRebuildQueue(container, () => void this.doFullRebuildNow());
			this.rebuildQueue.bind(
				(el, cb) => this.view.registerDomEvent(el, "focusout", cb),
				(id) => this.view.registerInterval(id)
			);
		}

		this.campaign = campaign;

		if (!campaign) {
			this.disposeTransient();
			container.empty();
			renderEmptyStateAction(container, this.view, {
				title: "No campaign yet",
				body: "The lazy way: a pitch, six truths, a front or two — fifteen minutes and you're ready for session zero.",
				ctaText: "Create your campaign",
				onCta: () => this.view.openCampaignCreation(),
			});
			return;
		}

		if (changedPaths === undefined || campaignChanged) {
			void this.doFullRebuildNow();
			return;
		}

		const path = campaign.path;
		if (!changedPaths.has(path)) return; // an unrelated note changed — nothing here reads it.

		if (isSelfWrite(path)) {
			// Our own write: every commit path below already rebuilds itself
			// (preserveFocus-wrapped) right after the write settles — this
			// notification is just a late echo of that same change.
			return;
		}

		// A genuinely external edit to the open campaign note — defer while the
		// GM is mid-edit (same acceptance criterion as the prep board), rebuild
		// immediately otherwise.
		this.rebuildQueue?.request();
	}

	private async doFullRebuildNow(): Promise<void> {
		const campaign = this.campaign;
		if (!campaign) return;

		this.bodyText = await readCampaignBody(this.view.app, campaign.path);
		if (this.campaign?.path !== campaign.path) return; // switched again while awaiting

		this.rawFrontsSection = sectionContent(this.bodyText, FRONTS_HEADING);
		this.fronts = parseFronts(this.rawFrontsSection);
		this.confirmingDeleteIndex = null;

		this.rebuild();
	}

	/** Rebuild the whole sub-tab from current in-memory state, preserving
	 * whichever editor has focus. Every commit path in this file (pitch edit,
	 * truths list, front field, portent toggle, add/remove front) ends by
	 * calling this — safe to call after every edit because of that
	 * preservation, so no path here needs its own bespoke "skip the rebuild"
	 * special-casing. */
	private rebuild(): void {
		const container = this.containerEl;
		const campaign = this.campaign;
		if (!container || !campaign) return;
		preserveFocus(container, () => this.fullRebuild(container, campaign));
	}

	private fullRebuild(container: HTMLElement, campaign: CampaignModel): void {
		this.disposeTransient();
		container.empty();

		const shell = container.createDiv({ cls: "lazy-campaign-foundation-shell" });
		renderHint(
			shell,
			this.view,
			this.view.plugin,
			"foundation",
			"Pitch, truths, and fronts live in the campaign note itself — edit them here or there, same text."
		);
		this.renderPitchCard(shell, campaign);
		this.renderTruthsCard(shell, campaign);
		this.renderFrontsCard(shell, campaign);
	}

	private disposeTransient(): void {
		// FLUSH, don't drop — a pending debounced write holds real keystrokes
		// (typing then switching campaigns/tabs within the idle window). Every
		// write is pinned to the campaign captured at render time, so a late
		// flush targets the right note.
		for (const debouncer of this.debouncers) debouncer.run();
		this.debouncers = [];
	}

	/** Generic pass-through kept as an actual generic function (see
	 * `prep-panel.ts`'s identical comment): an inline arrow bound with
	 * `.bind()`/assigned contextually to `RegisterDomEvent` widens the event
	 * name type and needs a cast — this doesn't. */
	private registerDomEvent: RegisterDomEvent = <K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		cb: (evt: HTMLElementEventMap[K]) => void
	): void => {
		this.view.registerDomEvent(el, type, cb);
	};

	// ---- Pitch card ---------------------------------------------------------

	private renderPitchCard(shell: HTMLElement, campaign: CampaignModel): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card lazy-campaign-foundation-pitch-card" });
		const header = card.createDiv({ cls: "lazy-campaign-foundation-card-header" });
		header.createEl("h3", { text: "Campaign pitch" });

		const pitch = sectionContent(this.bodyText, PITCH_HEADING);

		if (this.editingPitch) {
			const textarea = card.createEl("textarea", {
				cls: "lazy-campaign-strong-start-textarea",
				attr: { rows: "3", "data-key": "foundation-pitch-textarea" },
			});
			textarea.value = pitch;

			const debouncedWrite = debounce(() => void this.writeSection(campaign, PITCH_HEADING, textarea.value), 800, true);
			this.debouncers.push(debouncedWrite);
			this.view.registerDomEvent(textarea, "input", () => debouncedWrite());
			this.view.registerDomEvent(textarea, "blur", () => debouncedWrite.run());

			renderInspireControl({
				container: card.createDiv(),
				tableIds: [PITCH_TABLE_ID],
				getTable: (id) => this.view.plugin.tables?.get(id),
				rollTable: (id) => this.rollTable(id),
				registerDomEvent: this.registerDomEvent,
				buttonText: "Need a spark?",
				onInsert: (text) => {
					const existing = textarea.value.trim();
					textarea.value = existing.length > 0 ? `${existing} ${text}` : text;
					debouncedWrite.run();
				},
			});

			const doneBtn = card.createEl("button", { cls: "mod-cta", text: "Done" });
			this.view.registerDomEvent(doneBtn, "click", () => {
				debouncedWrite.run();
				this.editingPitch = false;
				this.rebuild();
			});
			return;
		}

		const pencil = header.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": "Edit pitch", type: "button" },
		});
		setIcon(pencil, "pencil");
		this.view.registerDomEvent(pencil, "click", () => {
			this.editingPitch = true;
			this.rebuild();
		});

		if (pitch.length === 0) {
			renderEmptyState(card, "No pitch yet — what's the campaign about in one sentence?");
			renderInspireControl({
				container: card.createDiv(),
				tableIds: [PITCH_TABLE_ID],
				getTable: (id) => this.view.plugin.tables?.get(id),
				rollTable: (id) => this.rollTable(id),
				registerDomEvent: this.registerDomEvent,
				buttonText: "Need a spark?",
				onInsert: (text) => void this.writeSection(campaign, PITCH_HEADING, text).then(() => this.rebuild()),
			});
			return;
		}

		const proseEl = card.createDiv({ cls: "lazy-campaign-foundation-pitch-prose" });
		if (this.pitchMdComponent) this.view.removeChild(this.pitchMdComponent);
		const component = this.view.addChild(new Component());
		this.pitchMdComponent = component;
		void MarkdownRenderer.render(this.view.app, pitch, proseEl, campaign.path, component);
	}

	// ---- Six truths card -----------------------------------------------------

	private renderTruthsCard(shell: HTMLElement, campaign: CampaignModel): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "Six truths" });
		card.createEl("p", {
			cls: "lazy-campaign-hint",
			text: "What makes this world yours? Three is plenty to start.",
		});

		const ctx: SectionEditorCtx = {
			registerDomEvent: this.registerDomEvent,
			registerDebounce: (d) => this.debouncers.push(d),
			writeSection: (heading, content) => this.writeSection(campaign, heading, content),
			openNote: (path) => this.openNote(path),
			notePath: campaign.path,
		};

		renderListSectionEditor(card, ctx, this.bodyText, {
			stepId: "truths",
			heading: TRUTHS_HEADING,
			placeholder: "A truth about this world…",
			hint: "",
			dice: {
				tableId: TRUTHS_TABLE_ID,
				sourceLabel: "Six truths inspiration",
				rollTable: (id) => this.rollTable(id),
			},
		});
	}

	// ---- Fronts card -----------------------------------------------------------

	private renderFrontsCard(shell: HTMLElement, campaign: CampaignModel): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		const header = card.createDiv({ cls: "lazy-campaign-foundation-card-header" });
		header.createEl("h3", { text: "Fronts" });

		if (this.fronts.length === 0) {
			renderEmptyState(card, "Nothing to fight yet. Optimistic. One good villain beats three vague ones.");
		}

		for (let i = 0; i < this.fronts.length; i++) {
			this.renderFrontCard(card, campaign, i);
		}

		const addBtn = card.createEl("button", { text: "Add front" });
		this.view.registerDomEvent(addBtn, "click", () => {
			this.fronts = [...this.fronts, blankFront()];
			this.commitFronts(campaign);
		});
	}

	private renderFrontCard(container: HTMLElement, campaign: CampaignModel, index: number): void {
		const front = this.fronts[index];
		const frontCard = container.createDiv({ cls: "lazy-campaign-front-card" });

		const nameInput = frontCard.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-name-input",
			attr: { "data-key": `front-${index}-name`, placeholder: "Front name" },
		});
		nameInput.value = front.name;
		this.bindFrontField(nameInput, campaign, (value) => {
			this.fronts[index] = { ...this.fronts[index], name: value };
		});

		const goalInput = frontCard.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-goal-input",
			attr: { "data-key": `front-${index}-goal`, placeholder: "Goal…" },
		});
		goalInput.value = front.goal;
		this.bindFrontField(goalInput, campaign, (value) => {
			this.fronts[index] = { ...this.fronts[index], goal: value };
		});

		const portentsEl = frontCard.createDiv({ cls: "lazy-campaign-front-portents" });
		// Every existing portent, plus one trailing empty slot to add another —
		// never truncates a hand-edited front with more than three.
		for (let p = 0; p <= front.portents.length; p++) {
			this.renderPortentRow(portentsEl, campaign, index, p);
		}

		const doomInput = frontCard.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-doom-input",
			attr: { "data-key": `front-${index}-doom`, placeholder: "Doom — what happens if this front wins?" },
		});
		doomInput.value = front.doom;
		this.bindFrontField(doomInput, campaign, (value) => {
			this.fronts[index] = { ...this.fronts[index], doom: value };
		});

		this.renderDeleteControl(frontCard, campaign, index);
	}

	private renderPortentRow(portentsEl: HTMLElement, campaign: CampaignModel, frontIndex: number, portentIndex: number): void {
		const front = this.fronts[frontIndex];
		const portent = front.portents[portentIndex] ?? { text: "", done: false };
		const row = portentsEl.createDiv({ cls: "lazy-campaign-front-portent-row" });

		const checkbox = row.createEl("button", {
			cls: `lazy-campaign-fronts-pip${portent.done ? " is-done" : ""}`,
			attr: { type: "button", "aria-label": portent.done ? "Mark not happened" : "Mark happened" },
		});
		this.view.registerDomEvent(checkbox, "click", () => this.togglePortent(campaign, frontIndex, portentIndex));

		const input = row.createEl("input", {
			type: "text",
			cls: "lazy-campaign-front-portent-input",
			attr: { "data-key": `front-${frontIndex}-portent-${portentIndex}`, placeholder: "A grim portent…" },
		});
		input.value = portent.text;
		this.bindFrontField(input, campaign, (value) => {
			const nextPortents = [...this.fronts[frontIndex].portents];
			while (nextPortents.length <= portentIndex) nextPortents.push({ text: "", done: false });
			nextPortents[portentIndex] = { ...nextPortents[portentIndex], text: value };
			this.fronts[frontIndex] = { ...this.fronts[frontIndex], portents: nextPortents };
		});
	}

	private renderDeleteControl(frontCard: HTMLElement, campaign: CampaignModel, index: number): void {
		const actions = frontCard.createDiv({ cls: "lazy-campaign-front-actions" });

		if (this.confirmingDeleteIndex === index) {
			actions.createSpan({ cls: "lazy-campaign-hint", text: "Remove this front?" });
			const confirmBtn = actions.createEl("button", { cls: "mod-warning", text: "Confirm remove" });
			this.view.registerDomEvent(confirmBtn, "click", () => {
				this.fronts = this.fronts.filter((_, i) => i !== index);
				this.confirmingDeleteIndex = null;
				this.commitFronts(campaign);
			});
			const cancelBtn = actions.createEl("button", { text: "Cancel" });
			this.view.registerDomEvent(cancelBtn, "click", () => {
				this.confirmingDeleteIndex = null;
				this.rebuild();
			});
			return;
		}

		const removeBtn = actions.createEl("button", { text: "Remove front" });
		this.view.registerDomEvent(removeBtn, "click", () => {
			this.confirmingDeleteIndex = index;
			this.rebuild();
		});
	}

	/** Wire a front-card text input to an idle-debounced + blur-flushed commit
	 * of the whole `## Fronts` section, re-derived from `this.fronts` via
	 * `renderFronts` — the same pattern every section-backed textarea in this
	 * plugin uses. Never used for the portent checkbox, which stays on the
	 * byte-preserving `toggleFrontPortent` path instead. */
	private bindFrontField(input: HTMLInputElement, campaign: CampaignModel, apply: (value: string) => void): void {
		const commit = debounce(() => this.commitFronts(campaign), 800, true);
		this.debouncers.push(commit);
		this.view.registerDomEvent(input, "input", () => {
			apply(input.value);
			commit();
		});
		this.view.registerDomEvent(input, "blur", () => commit.run());
	}

	/**
	 * All `## Fronts` writes are serialized through this queue: the field-
	 * commit path derives its content from `this.fronts` while the portent
	 * toggle derives from `this.rawFrontsSection`, and letting two writes
	 * overlap meant whichever read the older snapshot silently reverted the
	 * other's change (e.g. two quick pip taps, or a pip tap racing a typed
	 * field's debounce flush). Each queued task now reads the fresh state
	 * only once its predecessor's write — and state sync — has resolved.
	 */
	private enqueueFrontsWrite(task: () => Promise<void>): void {
		this.frontsWriteQueue = this.frontsWriteQueue.then(task, task);
	}

	private commitFronts(campaign: CampaignModel): void {
		this.enqueueFrontsWrite(async () => {
			const rendered = renderFronts(this.fronts);
			await this.writeSection(campaign, FRONTS_HEADING, rendered);
			this.rawFrontsSection = rendered;
			this.rebuild();
		});
	}

	private togglePortent(campaign: CampaignModel, frontIndex: number, portentIndex: number): void {
		this.enqueueFrontsWrite(async () => {
			const toggled = toggleFrontPortent(this.rawFrontsSection, frontIndex, portentIndex);
			if (toggled === this.rawFrontsSection) return;
			await this.writeSection(campaign, FRONTS_HEADING, toggled);
			this.rawFrontsSection = toggled;
			this.fronts = parseFronts(toggled);
			this.rebuild();
		});
	}

	// ---- Shared helpers ---------------------------------------------------

	private rollTable(id: string): RollResult | null {
		const registry = this.view.plugin.tables;
		return registry ? rollTable(id, registry, this.view.plugin.rng) : null;
	}

	private async writeSection(campaign: CampaignModel, heading: string, content: string): Promise<void> {
		await writeCampaignSection(this.view.app, campaign.path, heading, content);
		// A late flush for a previous campaign must not poison the in-memory
		// body of the one now on screen.
		if (this.campaign?.path === campaign.path) {
			this.bodyText = replaceSection(this.bodyText, heading, content);
		}
	}

	private async openNote(path: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
		if (!file) return;
		const leaf = this.view.app.workspace.getLeaf(true);
		await leaf.openFile(file);
	}
}
