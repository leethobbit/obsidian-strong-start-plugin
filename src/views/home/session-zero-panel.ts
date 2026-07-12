import { Component, MarkdownRenderer, Notice, setIcon, TFile, type App } from "obsidian";
import { renderCollapsibleSection, renderEmptyState, SectionState } from "../panel-kit";
import { sectionContent } from "../../lib/sections";
import { readCampaignBody } from "../../campaigns/campaign-files";
import { DeferredRebuildQueue, preserveFocus } from "../../lib/focus-preserve";
import { beginSelfWrite, isSelfWrite } from "../../lib/self-write";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { tryFileOp } from "../../lib/notify";
import { FormModal } from "../../lib/form-modal";
import { textField } from "../../lib/form-fields";
import { ensureSessionZeroNote } from "../../checklist/session-zero-files";
import { writeSessionZeroFm, type SessionZeroFm } from "../../checklist/session-zero-schema";
import { createPcNote } from "../../roster/entity-files";
import { featureEnabled } from "../../features";
import {
	checklistItemsInGroup,
	SAFETY_ANONYMOUS_REMINDER,
	SAFETY_LINES_VEILS_COPY,
	SAFETY_PAUSE_COPY,
	SAFETY_SENSITIVE_TOPICS_COPY,
	SESSION_ZERO_CHECKLIST,
	type SessionZeroGroup,
} from "../../content/session-zero";
import type { CampaignModel } from "../../campaigns/types";
import type { PcModel } from "../../roster/types";
import type { LazyCampaignView } from "../lazy-view";

const PITCH_HEADING = "Campaign pitch";

function emptyFm(campaign: CampaignModel): SessionZeroFm {
	return { campaign: `[[${campaign.name}]]`, done: [], lines: [], veils: [] };
}

/**
 * The Home / Session zero sub-tab (docs/plan.md M9): four collapsible
 * sections (Pitch & expectations / Safety tools / Characters / Logistics)
 * over the campaign's `Session zero.md` note. Mounted by `home-panel.ts` into
 * a container it owns and reuses across re-renders — same shape as
 * `FoundationPanel`: focus-preserving rebuilds + a self-write soft path for
 * the chip inputs (lines/veils), since those are the only editable fields
 * here (checklist rows and "Add character" are one-shot actions, not
 * continuously-typed fields).
 *
 * The session-zero note is created lazily — visiting this tab never writes
 * to the vault by itself; the note is created (`ensureSessionZeroNote`) the
 * first time the GM actually checks an item or adds a line/veil.
 */
export class SessionZeroPanel {
	private containerEl: HTMLElement | null = null;
	private campaign: CampaignModel | null = null;
	private zeroPath: string | null = null;
	private fm: SessionZeroFm | null = null;
	private pitchBody = "";
	private roster: PcModel[] = [];

	private readonly sectionState = new SectionState();
	private pitchMdComponent: Component | null = null;
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

		// Defensive fallback — `home-panel.ts` hides the sub-tab button
		// entirely when the feature is off; this only matters if something
		// (a persisted `ui.lastMode`, a stray command) still routes here.
		if (!featureEnabled(plugin.settings, "session-zero")) {
			this.disposeTransient();
			container.empty();
			renderEmptyState(container, "Session zero is turned off in settings.");
			return;
		}

		if (!campaign) {
			this.disposeTransient();
			this.zeroPath = null;
			this.fm = null;
			container.empty();
			renderEmptyState(container, "Create a campaign from Home first.");
			return;
		}

		if (changedPaths === undefined || campaignChanged) {
			void this.doFullRebuildNow();
			return;
		}

		if (this.zeroPath && changedPaths.has(this.zeroPath) && isSelfWrite(this.zeroPath)) {
			return; // echo of our own write — every commit path below already rebuilds.
		}

		this.rebuildQueue?.request();
	}

	private async doFullRebuildNow(): Promise<void> {
		const campaign = this.campaign;
		const plugin = this.view.plugin;
		const store = plugin.store;
		if (!campaign) return;

		const existing = store?.sessionZeroOf(campaign.path) ?? null;
		this.zeroPath = existing?.path ?? null;
		this.fm = existing ? { campaign: existing.campaign, done: existing.done, lines: existing.lines, veils: existing.veils } : emptyFm(campaign);
		this.roster = store?.pcsOf(campaign.path) ?? [];

		this.pitchBody = await readCampaignBody(this.view.app, campaign.path);
		if (this.campaign?.path !== campaign.path) return; // switched again mid-await

		this.rebuild();
	}

	private rebuild(): void {
		const container = this.containerEl;
		const campaign = this.campaign;
		if (!container || !campaign) return;
		preserveFocus(container, () => this.fullRebuild(container, campaign));
	}

	private fullRebuild(container: HTMLElement, campaign: CampaignModel): void {
		this.disposeTransient();
		container.empty();

		const fm = this.fm ?? emptyFm(campaign);
		const shell = container.createDiv({ cls: "lazy-campaign-session-zero-shell" });

		const total = SESSION_ZERO_CHECKLIST.length;
		const done = fm.done.filter((id) => SESSION_ZERO_CHECKLIST.some((item) => item.id === id)).length;
		shell.createDiv({ cls: "lazy-campaign-session-zero-progress", text: `${done} of ${total} done` });

		this.renderPitchSection(shell, campaign, fm);
		this.renderSafetySection(shell, campaign, fm);
		this.renderCharactersSection(shell, campaign, fm);
		this.renderLogisticsSection(shell, campaign, fm);
	}

	private disposeTransient(): void {
		if (this.pitchMdComponent) {
			this.view.removeChild(this.pitchMdComponent);
			this.pitchMdComponent = null;
		}
	}

	// ---- Pitch & expectations -------------------------------------------------

	private renderPitchSection(shell: HTMLElement, campaign: CampaignModel, fm: SessionZeroFm): void {
		renderCollapsibleSection(shell, this.view, this.sectionState, "pitch", "Pitch & expectations", (body) => {
			const pitch = sectionContent(this.pitchBody, PITCH_HEADING);
			const pitchEl = body.createDiv({ cls: "lazy-campaign-session-zero-pitch-prose" });
			if (pitch.length === 0) {
				renderEmptyState(pitchEl, "No pitch yet.");
			} else {
				const component = this.view.addChild(new Component());
				this.pitchMdComponent = component;
				void MarkdownRenderer.render(this.view.app, pitch, pitchEl, campaign.path, component);
			}

			const link = body.createEl("a", { text: "Edit on the foundation tab →", attr: { href: "#" } });
			this.view.registerDomEvent(link, "click", (evt) => {
				evt.preventDefault();
				this.view.setMode("home", "foundation");
			});

			this.renderChecklistGroup(body, campaign, fm, "pitch");
		});
	}

	// ---- Safety tools -----------------------------------------------------

	private renderSafetySection(shell: HTMLElement, campaign: CampaignModel, fm: SessionZeroFm): void {
		renderCollapsibleSection(shell, this.view, this.sectionState, "safety", "Safety tools", (body) => {
			this.renderChecklistGroup(body, campaign, fm, "safety");

			const copyEl = body.createDiv({ cls: "lazy-campaign-session-zero-safety-copy" });
			copyEl.createEl("h4", { text: "Sensitive topics" });
			copyEl.createEl("p", { text: SAFETY_SENSITIVE_TOPICS_COPY });
			copyEl.createEl("h4", { text: "Lines & veils" });
			copyEl.createEl("p", { text: SAFETY_LINES_VEILS_COPY });
			copyEl.createEl("h4", { text: "Pause for a second" });
			copyEl.createEl("p", { text: SAFETY_PAUSE_COPY });

			body.createEl("h4", { text: "Hard lines" });
			this.renderChipList(body, "line", fm.lines, (next) => void this.commitZero(campaign, { ...this.currentFm(campaign), lines: next }));

			body.createEl("h4", { text: "Veils" });
			this.renderChipList(body, "veil", fm.veils, (next) => void this.commitZero(campaign, { ...this.currentFm(campaign), veils: next }));

			body.createEl("p", { cls: "lazy-campaign-hint", text: SAFETY_ANONYMOUS_REMINDER });
		});
	}

	// ---- Characters -----------------------------------------------------

	private renderCharactersSection(shell: HTMLElement, campaign: CampaignModel, fm: SessionZeroFm): void {
		renderCollapsibleSection(shell, this.view, this.sectionState, "characters", "Characters", (body) => {
			this.renderChecklistGroup(body, campaign, fm, "characters");

			body.createEl("h4", { text: "The party" });
			if (this.roster.length === 0) {
				renderEmptyState(body, "No characters yet.");
			} else {
				const list = body.createEl("ul", { cls: "lazy-campaign-roster-list" });
				for (const pc of this.roster) {
					const suffix = pc.player ? ` — ${pc.player}` : "";
					const item = list.createEl("li");
					const link = item.createEl("a", { text: `${pc.name}${suffix}`, attr: { href: "#" } });
					this.view.registerDomEvent(link, "click", (evt) => {
						evt.preventDefault();
						void this.openNote(pc.path);
					});
				}
			}

			const addBtn = body.createEl("button", { text: "Add character" });
			this.view.registerDomEvent(addBtn, "click", () => {
				new AddCharacterModal(this.view.app, campaign, () => void this.doFullRebuildNow()).open();
			});
		});
	}

	// ---- Logistics -----------------------------------------------------

	private renderLogisticsSection(shell: HTMLElement, campaign: CampaignModel, fm: SessionZeroFm): void {
		renderCollapsibleSection(shell, this.view, this.sectionState, "logistics", "Logistics", (body) => {
			this.renderChecklistGroup(body, campaign, fm, "logistics");

			body.createEl("p", {
				cls: "lazy-campaign-hint",
				text: "Freeform expectations and logistics notes live in the session zero note's body.",
			});
			const openBtn = body.createEl("button", { text: "Open note" });
			this.view.registerDomEvent(openBtn, "click", () => void this.openZeroNote(campaign));
		});
	}

	// ---- Checklist rows -----------------------------------------------------

	private renderChecklistGroup(container: HTMLElement, campaign: CampaignModel, fm: SessionZeroFm, group: SessionZeroGroup): void {
		const list = container.createDiv({ cls: "lazy-campaign-session-zero-items" });
		for (const item of checklistItemsInGroup(group)) {
			const isDone = fm.done.includes(item.id);
			const row = list.createDiv({ cls: `lazy-campaign-session-zero-item${isDone ? " is-done" : ""}` });
			const checkbox = row.createEl("button", {
				cls: `lazy-campaign-session-zero-check${isDone ? " is-done" : ""}`,
				attr: {
					type: "button",
					"aria-pressed": isDone ? "true" : "false",
					"aria-label": isDone ? "Mark not done" : "Mark done",
				},
			});
			setIcon(checkbox, isDone ? "check-circle" : "circle");

			const textEl = row.createDiv({ cls: "lazy-campaign-session-zero-item-text" });
			textEl.createDiv({ cls: "lazy-campaign-session-zero-item-label", text: item.label });
			textEl.createDiv({ cls: "lazy-campaign-session-zero-item-detail", text: item.detail });

			this.view.registerDomEvent(row, "click", () => void this.toggleDone(campaign, item.id));
		}
	}

	private async toggleDone(campaign: CampaignModel, id: string): Promise<void> {
		const fm = this.currentFm(campaign);
		const has = fm.done.includes(id);
		const next: SessionZeroFm = { ...fm, done: has ? fm.done.filter((x) => x !== id) : [...fm.done, id] };
		await this.commitZero(campaign, next);
	}

	// ---- Chip list (lines/veils) ---------------------------------------------

	private renderChipList(
		container: HTMLElement,
		kind: "line" | "veil",
		items: readonly string[],
		onChange: (next: string[]) => void
	): void {
		const chipRow = container.createDiv({ cls: "lazy-campaign-chip-row" });
		if (items.length === 0) {
			chipRow.createSpan({ cls: "lazy-campaign-empty-state", text: "None yet." });
		}
		items.forEach((text, index) => {
			const chip = chipRow.createDiv({
				cls: "lazy-campaign-chip",
				attr: { "data-key": `session-zero-${kind}-chip-${index}` },
			});
			chip.createSpan({ cls: "lazy-campaign-chip-label", text });
			const removeBtn = chip.createEl("button", {
				cls: "lazy-campaign-icon-button",
				attr: { "aria-label": "Remove", type: "button" },
			});
			setIcon(removeBtn, "x");
			this.view.registerDomEvent(removeBtn, "click", () => onChange(items.filter((_, i) => i !== index)));
		});

		const inputRow = container.createDiv({ cls: "lazy-campaign-chip-input-row" });
		const input = inputRow.createEl("input", {
			type: "text",
			cls: "lazy-campaign-chip-input",
			attr: {
				placeholder: kind === "line" ? "Add a hard line…" : "Add a veil…",
				"data-key": `session-zero-${kind}-add`,
			},
		});
		this.view.registerDomEvent(input, "keydown", (evt) => {
			if (evt.key !== "Enter") return;
			evt.preventDefault();
			const value = input.value.trim();
			if (value.length === 0) return;
			onChange([...items, value]);
		});
	}

	// ---- Shared helpers ---------------------------------------------------

	private currentFm(campaign: CampaignModel): SessionZeroFm {
		return this.fm ?? emptyFm(campaign);
	}

	/** Commit a full `SessionZeroFm` — updates the in-memory model and
	 * rebuilds immediately (optimistic), creating the note on first write if
	 * it doesn't exist yet. Writes directly to the `TFile` handle already in
	 * hand (rather than routing through `patchSessionZero`'s read-then-mutate
	 * shape, which re-reads via `metadataCache`) — a note created a moment
	 * ago by `ensureSessionZeroNote` isn't guaranteed to have a warm cache
	 * entry yet, and this panel always knows the full desired state anyway
	 * (`next`), so there's nothing to read back for. */
	private async commitZero(campaign: CampaignModel, next: SessionZeroFm): Promise<void> {
		this.fm = next;
		this.rebuild();

		const store = this.view.plugin.store;
		if (!store) return;

		let file: TFile | null = this.zeroPath ? this.view.app.vault.getFileByPath(this.zeroPath) : null;
		if (!(file instanceof TFile)) {
			file = await tryFileOp(
				() => ensureSessionZeroNote(this.view.app, campaign, store),
				"Couldn't create the session zero note — check the console for details."
			);
			if (!file) return;
			this.zeroPath = file.path;
		}

		const targetFile = file;
		const done = beginSelfWrite(targetFile.path);
		try {
			await tryFileOp(
				() => writeLazyFrontmatter(this.view.app, targetFile, writeSessionZeroFm(next)),
				"Couldn't save that change — check the console for details."
			);
		} finally {
			done();
		}
	}

	private async openNote(path: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
		if (!file) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const leaf = this.view.app.workspace.getLeaf(true);
		await leaf.openFile(file);
	}

	private async openZeroNote(campaign: CampaignModel): Promise<void> {
		const store = this.view.plugin.store;
		if (!store) return;

		let path = this.zeroPath;
		if (!path) {
			const file = await tryFileOp(
				() => ensureSessionZeroNote(this.view.app, campaign, store),
				"Couldn't create the session zero note — check the console for details."
			);
			if (!file) return;
			path = file.path;
			this.zeroPath = path;
			this.rebuild();
		}

		await this.openNote(path);
	}
}

/** "Add character" (docs/plan.md M9): name + player, reusing the same
 * `createPcNote` create-flow as the campaign wizard's party step. */
class AddCharacterModal extends FormModal {
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
		this.setTitle("Add character");

		const nameInput = textField(this.contentEl, {
			name: "Name",
			placeholder: "Character name",
			onChange: (value) => {
				this.name = value;
			},
		});
		this.registerFirstInput(nameInput);

		textField(this.contentEl, {
			name: "Player",
			placeholder: "Player name",
			onChange: (value) => {
				this.player = value;
			},
		});

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, { ctaText: "Add", onSubmit: () => this.handleSubmit() });
	}

	private async handleSubmit(): Promise<void> {
		const name = this.name.trim();
		if (name.length === 0) {
			new Notice("Give the character a name first.");
			return;
		}

		const created = await tryFileOp(
			() => createPcNote(this.app, this.campaign, name, this.player.trim()),
			`Couldn't create a note for ${name} — check the console for details.`
		);
		if (!created) return;

		this.close();
		this.onCreated();
	}
}
