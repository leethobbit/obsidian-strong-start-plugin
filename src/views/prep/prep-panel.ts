import { DropdownComponent, Notice, TFile } from "obsidian";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import { STEPS, type StepDef } from "../../sessions/steps";
import { createNextSession } from "../../sessions/session-files";
import { toSessionFm, writeSessionFm, type SessionFm } from "../../sessions/session-schema";
import { parseBulletSection } from "../../sessions/bullet-list";
import { sectionContent, replaceSection } from "../../lib/sections";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { beginSelfWrite, isSelfWrite } from "../../lib/self-write";
import { DeferredRebuildQueue, preserveFocus } from "../../lib/focus-preserve";
import { tryFileOp } from "../../lib/notify";
import { renderCharactersStep } from "./steps/characters";
import { renderStrongStartStep } from "./steps/strong-start";
import { renderScenesStep } from "./steps/scenes";
import { renderSecretsStep } from "./steps/secrets";
import { renderLocationsStep } from "./steps/locations";
import { renderNpcsStep } from "./steps/npcs";
import { renderMonstersStep } from "./steps/monsters";
import { renderRewardsStep } from "./steps/rewards";
import type { StepContext } from "./step-context";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

/**
 * The Prep board: master (8-step) list + a right-pane workspace per step. See
 * AGENTS.md risk #2 for the focus-preserve/self-write architecture this panel
 * hinges on — read `src/lib/self-write.ts` and `src/lib/focus-preserve.ts`
 * before changing the render()/rebuild plumbing below.
 */
export class PrepPanel {
	private campaign: CampaignModel | null = null;
	private session: SessionModel | null = null;
	private sessions: SessionModel[] = [];
	private activeStepId: string = STEPS[0].id;

	private bodyText = "";
	private bodyPath: string | null = null;

	private toolbarEl!: HTMLElement;
	private masterListEl!: HTMLElement;
	private workspaceEl!: HTMLElement;

	private readonly rebuildQueue: DeferredRebuildQueue;
	private suggesters: Array<{ close(): void }> = [];
	private debouncers: Array<{ cancel(): void }> = [];

	constructor(
		private readonly view: LazyCampaignView,
		private readonly containerEl: HTMLElement
	) {
		this.rebuildQueue = new DeferredRebuildQueue(containerEl, () => void this.doFullRebuildNow());
		this.rebuildQueue.bind(
			(el, cb) => this.view.registerDomEvent(el, "focusout", cb),
			(id) => this.view.registerInterval(id)
		);
		this.view.registerDomEvent(containerEl, "keydown", (evt) => this.handleKeydown(evt));
		this.view.register(() => this.disposeTransient());
	}

	/**
	 * `changedPaths` is undefined for a fresh mount / mode switch (always a
	 * full rebuild). Otherwise it's a campaign-store notification: the
	 * plugin's own write to the open session note takes the "soft path"
	 * (in-memory refresh + master-list/toolbar only); a genuinely external
	 * change defers the rebuild while the user is mid-edit (the M2 acceptance
	 * criterion) and runs immediately otherwise.
	 */
	render(changedPaths?: ReadonlySet<string>): void {
		const plugin = this.view.plugin;
		const campaign = plugin.activeCampaign();

		if (!campaign) {
			this.campaign = null;
			this.session = null;
			this.disposeTransient();
			this.containerEl.empty();
			renderEmptyState(this.containerEl, "Create a campaign from Home first.");
			return;
		}

		const campaignChanged = !this.campaign || this.campaign.path !== campaign.path;
		this.campaign = campaign;

		const store = plugin.store;
		const sessions = store ? store.sessionsOf(campaign.path) : [];
		this.sessions = sessions;

		if (sessions.length === 0) {
			this.session = null;
			this.disposeTransient();
			this.containerEl.empty();
			renderEmptyStateAction(this.containerEl, this.view, {
				title: `Nothing prepped for ${campaign.name}.`,
				body: "Eight steps, about thirty minutes — that's the whole job.",
				ctaText: "Start session 1",
				onCta: () => void this.createAndSwitchSession(campaign),
			});
			return;
		}

		if (campaignChanged || !this.session || !sessions.some((s) => s.path === this.session?.path)) {
			this.setSession(sessions[0]);
			this.activeStepId = STEPS[0].id;
		}

		if (changedPaths === undefined || campaignChanged || !this.session) {
			void this.doFullRebuildNow();
			return;
		}

		const path = this.session.path;

		if (changedPaths.has(path) && isSelfWrite(path)) {
			// Our own write to the open session note: refresh the in-memory
			// model and the non-focus-risk chrome (master-list circles/
			// summaries, toolbar progress), but never rebuild the active
			// step's own workspace DOM — it's already showing what was just
			// typed (the self-write "soft path").
			const fresh = sessions.find((s) => s.path === path);
			if (fresh) this.session = fresh;
			this.renderMasterList();
			this.renderToolbar();
			return;
		}

		// Either the session note changed externally (the M2 acceptance
		// scenario), or some other managed note changed that a step reads
		// from the store directly (a PC/NPC/location note — the
		// Characters/Locations/NPCs steps don't have their own path to
		// check against `changedPaths`). Either way: defer while the user is
		// mid-edit, rebuild immediately otherwise.
		this.session = sessions.find((s) => s.path === path) ?? this.session;
		this.rebuildQueue.request();
	}

	private handleKeydown(evt: KeyboardEvent): void {
		if (!(evt.ctrlKey || evt.metaKey)) return;
		const num = Number(evt.key);
		if (!Number.isInteger(num) || num < 1 || num > STEPS.length) return;
		evt.preventDefault();
		this.activeStepId = STEPS[num - 1].id;
		this.renderMasterList();
		this.renderWorkspace();
	}

	private async ensureBody(path: string, force = false): Promise<void> {
		if (!force && this.bodyPath === path) return;
		const file = this.view.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return;
		this.bodyText = await this.view.app.vault.cachedRead(file);
		this.bodyPath = path;
	}

	private async doFullRebuildNow(): Promise<void> {
		const session = this.session;
		if (!session) return;
		await this.ensureBody(session.path, true);
		if (this.session?.path !== session.path) return; // switched again while awaiting
		preserveFocus(this.containerEl, () => this.fullRebuild());
	}

	private fullRebuild(): void {
		this.disposeTransient();
		this.containerEl.empty();

		const shell = this.containerEl.createDiv({ cls: "lazy-campaign-prep-shell" });
		this.toolbarEl = shell.createDiv({ cls: "lazy-campaign-prep-toolbar" });
		const board = shell.createDiv({ cls: "lazy-campaign-prep-board" });
		this.masterListEl = board.createDiv({ cls: "lazy-campaign-prep-master" });
		this.workspaceEl = board.createDiv({ cls: "lazy-campaign-prep-workspace" });

		this.renderToolbar();
		this.renderMasterList();
		this.renderWorkspace();
	}

	private disposeTransient(): void {
		for (const suggest of this.suggesters) suggest.close();
		this.suggesters = [];
		for (const debouncer of this.debouncers) debouncer.cancel();
		this.debouncers = [];
	}

	private async createAndSwitchSession(campaign: CampaignModel): Promise<void> {
		const plugin = this.view.plugin;
		const store = plugin.store;
		if (!store) return;

		const file = await tryFileOp(
			() => createNextSession(this.view.app, plugin.settings, campaign, store),
			"Couldn't create the session note — check the console for details."
		);
		if (!file) return;

		const sessions = store.sessionsOf(campaign.path);
		const created = sessions.find((s) => s.path === file.path);
		this.sessions = sessions;
		this.setSession(created ?? sessions[0] ?? null);
		this.activeStepId = STEPS[0].id;
		if (this.session) await this.doFullRebuildNow();
	}

	/** Sets the open session and syncs `plugin.ui.lastSessionPath` — the
	 * shared selection Run mode reads so its picker agrees with whatever Prep
	 * currently shows (docs/plan.md M6). */
	private setSession(session: SessionModel | null): void {
		this.session = session;
		if (!session) return;
		this.view.plugin.ui.lastSessionPath = session.path;
		void this.view.plugin.persist();
	}

	// ---- Toolbar ------------------------------------------------------------

	private renderToolbar(): void {
		this.toolbarEl.empty();
		const campaign = this.campaign;
		const session = this.session;
		if (!campaign || !session) return;

		const selectorEl = this.toolbarEl.createDiv({ cls: "lazy-campaign-prep-session-selector" });
		const dropdown = new DropdownComponent(selectorEl);
		for (const s of this.sessions) {
			dropdown.addOption(s.path, `Session ${s.session}${s.status === "played" ? " — played" : ""}`);
		}
		dropdown.addOption("__new__", "New session…");
		dropdown.setValue(session.path);
		dropdown.onChange((value) => {
			if (value === "__new__") {
				void this.createAndSwitchSession(campaign);
				return;
			}
			const target = this.sessions.find((s) => s.path === value);
			if (!target) return;
			this.setSession(target);
			this.activeStepId = STEPS[0].id;
			void this.doFullRebuildNow();
		});

		const openNoteBtn = this.toolbarEl.createEl("button", { text: "Open note" });
		this.view.registerDomEvent(openNoteBtn, "click", () => void this.openNote(session.path));

		const runBtn = this.toolbarEl.createEl("button", { cls: "mod-cta", text: "Run" });
		this.view.registerDomEvent(runBtn, "click", () => {
			this.setSession(session);
			this.view.setMode("run");
		});

		this.toolbarEl.createSpan({
			cls: "lazy-campaign-prep-progress",
			text: `${session.stepsDone.length} of ${STEPS.length}`,
		});
	}

	// ---- Master list ----------------------------------------------------------

	private renderMasterList(): void {
		this.masterListEl.empty();
		const session = this.session;
		const campaign = this.campaign;
		if (!session || !campaign) return;

		const pcCount = this.view.plugin.store?.pcsOf(campaign.path).length ?? 0;

		for (const step of STEPS) {
			const isDone = session.stepsDone.includes(step.id);
			const auto = hasContent(step, session, this.bodyText, pcCount);
			const state: "done" | "auto" | "empty" = isDone ? "done" : auto ? "auto" : "empty";

			const row = this.masterListEl.createDiv({
				cls: `lazy-campaign-step-row is-${state}${step.id === this.activeStepId ? " is-active" : ""}`,
				attr: { "data-key": `step-row-${step.id}` },
			});

			const circle = row.createEl("button", {
				cls: `lazy-campaign-step-circle is-${state}`,
				attr: { "aria-label": isDone ? "Marked done — click to unmark" : "Mark step done", type: "button" },
				text: state === "done" ? "✓" : state === "auto" ? "◐" : "○",
			});
			this.view.registerDomEvent(circle, "click", (evt) => {
				evt.stopPropagation();
				void this.toggleStepDone(step.id);
			});

			row.createSpan({ cls: "lazy-campaign-step-number", text: String(step.number) });
			row.createSpan({ cls: "lazy-campaign-step-label", text: step.shortLabel });

			const summary = summaryFor(step, session, this.bodyText);
			if (summary) row.createSpan({ cls: "lazy-campaign-step-summary", text: summary });

			this.view.registerDomEvent(row, "click", () => {
				this.activeStepId = step.id;
				this.renderMasterList();
				this.renderWorkspace();
			});
		}
	}

	private async toggleStepDone(stepId: string): Promise<void> {
		const session = this.session;
		if (!session) return;
		const isDone = session.stepsDone.includes(stepId);
		const nextStepsDone = isDone ? session.stepsDone.filter((s) => s !== stepId) : [...session.stepsDone, stepId];
		await this.patchFrontmatter((fm) => ({ ...fm, stepsDone: nextStepsDone }));
		this.renderMasterList();
		this.renderToolbar();
	}

	// ---- Workspace --------------------------------------------------------

	private renderWorkspace(): void {
		this.workspaceEl.empty();
		const session = this.session;
		const campaign = this.campaign;
		if (!session || !campaign) return;

		const ctx = this.buildStepContext(session, campaign);
		switch (this.activeStepId) {
			case "characters":
				renderCharactersStep(this.workspaceEl, ctx);
				break;
			case "strong-start":
				renderStrongStartStep(this.workspaceEl, ctx);
				break;
			case "scenes":
				renderScenesStep(this.workspaceEl, ctx);
				break;
			case "secrets":
				renderSecretsStep(this.workspaceEl, ctx);
				break;
			case "locations":
				renderLocationsStep(this.workspaceEl, ctx);
				break;
			case "npcs":
				renderNpcsStep(this.workspaceEl, ctx);
				break;
			case "monsters":
				renderMonstersStep(this.workspaceEl, ctx);
				break;
			case "rewards":
				renderRewardsStep(this.workspaceEl, ctx);
				break;
		}
	}

	/** Generic pass-through kept as an actual generic function (not an
	 * object-literal arrow) so TypeScript can unify its type parameter with
	 * `Component.registerDomEvent`'s own generic across the call — an inline
	 * arrow assigned contextually to `StepContext["registerDomEvent"]` widens
	 * the event-name type and needs a cast; this doesn't. */
	private registerDomEvent = <K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		cb: (evt: HTMLElementEventMap[K]) => void
	): void => {
		this.view.registerDomEvent(el, type, cb);
	};

	private buildStepContext(session: SessionModel, campaign: CampaignModel): StepContext {
		return {
			app: this.view.app,
			plugin: this.view.plugin,
			campaign,
			session,
			sessions: this.sessions,
			body: this.bodyText,
			patchFrontmatter: (mutate) => this.patchFrontmatter(mutate),
			writeSection: (heading, content) => this.writeSection(heading, content),
			openNote: (path) => this.openNote(path),
			registerDomEvent: this.registerDomEvent,
			registerDebounce: (d) => this.debouncers.push(d),
			registerSuggest: (s) => this.suggesters.push(s),
			requestSoftRefresh: () => {
				this.renderMasterList();
				this.renderToolbar();
			},
			requestRerender: () => preserveFocus(this.containerEl, () => this.renderWorkspace()),
		};
	}

	// ---- Persistence --------------------------------------------------------

	private async patchFrontmatter(mutate: (fm: SessionFm) => SessionFm): Promise<void> {
		const session = this.session;
		if (!session) return;
		const file = this.view.app.vault.getFileByPath(session.path);
		if (!(file instanceof TFile)) return;

		const next = mutate(toSessionFm(session));
		this.session = { ...session, ...next };

		const done = beginSelfWrite(file.path);
		try {
			await tryFileOp(
				() => writeLazyFrontmatter(this.view.app, file, writeSessionFm(next)),
				"Couldn't save that change — check the console for details."
			);
		} finally {
			done();
		}
	}

	private async writeSection(heading: string, content: string): Promise<void> {
		const session = this.session;
		if (!session) return;
		const file = this.view.app.vault.getFileByPath(session.path);
		if (!(file instanceof TFile)) return;

		const done = beginSelfWrite(file.path);
		try {
			await tryFileOp(async () => {
				await this.view.app.vault.process(file, (body) => {
					// Section-level diff guard: skip the write entirely if
					// nothing actually changed, preventing write loops.
					if (sectionContent(body, heading) === content.replace(/\s+$/, "")) return body;
					return replaceSection(body, heading, content);
				});
			}, "Couldn't save that section — check the console for details.");
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
}

function hasContent(step: StepDef, session: SessionModel, body: string, pcCount: number): boolean {
	switch (step.storage) {
		case "roster":
			return pcCount > 0;
		case "section":
			return sectionContent(body, step.sectionHeading ?? "").length > 0;
		case "list-section":
			return parseBulletSection(sectionContent(body, step.sectionHeading ?? "")).rows.length > 0;
		case "secrets":
			return session.secrets.some((s) => !s.archived);
		case "links":
			return step.fmKey !== undefined && session[step.fmKey].length > 0;
		default:
			return false;
	}
}

function summaryFor(step: StepDef, session: SessionModel, body: string): string | null {
	switch (step.storage) {
		case "list-section": {
			const count = parseBulletSection(sectionContent(body, step.sectionHeading ?? "")).rows.length;
			return count > 0 ? `(${count})` : null;
		}
		case "secrets": {
			const count = session.secrets.filter((s) => !s.archived).length;
			return `${count}/10`;
		}
		case "links": {
			if (step.fmKey === undefined) return null;
			const count = session[step.fmKey].length;
			return count > 0 ? `(${count})` : null;
		}
		default:
			return null;
	}
}
