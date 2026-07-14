import { DropdownComponent, Menu, Notice, setIcon, TFile } from "obsidian";
import { renderEmptyStateAction } from "../panel-kit";
import { STEPS, type StepDef } from "../../sessions/steps";
import { createNextSession } from "../../sessions/session-files";
import { toSessionFm, writeSessionFm, type SessionFm } from "../../sessions/session-schema";
import { parseBulletSection } from "../../sessions/bullet-list";
import { buildSessionSheet } from "../../sessions/session-sheet";
import { sectionContent, replaceSection } from "../../lib/sections";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { beginSelfWrite, isSelfWrite } from "../../lib/self-write";
import { DeferredRebuildQueue, preserveFocus } from "../../lib/focus-preserve";
import { tryFileOp } from "../../lib/notify";
import { isPhone } from "../../lib/platform";
import { renderHint } from "../../help/hint";
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
	private boardEl!: HTMLElement;
	private masterListEl!: HTMLElement;
	private workspaceEl!: HTMLElement;
	/** Phone master→detail (docs/plan.md M12): false = the step list is the
	 * screen, true = the active step's workspace is, with a back header. Only
	 * consulted on phones — desktop always shows both panes side by side. */
	private phoneDetailOpen = false;

	private readonly rebuildQueue: DeferredRebuildQueue;
	private suggesters: Array<{ close(): void }> = [];
	private debouncers: Array<{ cancel(): void; run(): unknown }> = [];

	/** Prep timer (docs/plan.md M13): active prep minutes per session path,
	 * in-memory only — it counts THIS sitting, not lifetime prep, and a stale
	 * cross-restart total would make the under-30-minutes toast lie. Ticks only
	 * accumulate while the panel is actually visible (`isShown()`), so leaving
	 * the board open in a background tab overnight doesn't read as prep. */
	private readonly prepElapsedMs = new Map<string, number>();
	private lastTickAt: number | null = null;
	private prepTimerEl: HTMLElement | null = null;

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
		this.view.registerInterval(window.setInterval(() => this.tickPrepTimer(), 5000));
		this.view.register(() => this.disposeTransient());
	}

	private tickPrepTimer(): void {
		const now = Date.now();
		const last = this.lastTickAt ?? now;
		this.lastTickAt = now;
		const session = this.session;
		if (!session || !this.containerEl.isShown()) return;
		this.prepElapsedMs.set(session.path, (this.prepElapsedMs.get(session.path) ?? 0) + (now - last));
		this.updatePrepTimerText();
	}

	private prepMinutes(path: string): number {
		return Math.floor((this.prepElapsedMs.get(path) ?? 0) / 60000);
	}

	/** Quiet by design: nothing at all until the first full minute. */
	private updatePrepTimerText(): void {
		const el = this.prepTimerEl;
		const session = this.session;
		if (!el || !session) return;
		const minutes = this.prepMinutes(session.path);
		el.setText(minutes >= 1 ? `Prep: ${minutes} min` : "");
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
			renderEmptyStateAction(this.containerEl, this.view, {
				title: "No campaign yet",
				body: "The lazy way: a pitch, six truths, a front or two — fifteen minutes and you're ready for session zero.",
				ctaText: "Create your campaign",
				onCta: () => this.view.openCampaignCreation(),
			});
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

		// Honor the shared selection (`ui.lastSessionPath`): Run mode and the
		// dashboard key off it, and prep's own dropdown keeps it in sync — so
		// a divergence means another surface (e.g. the dashboard's "Continue
		// prep" card) deliberately re-pointed it, and prep must follow instead
		// of keeping whatever older session its dropdown last had open.
		const remembered = plugin.ui.lastSessionPath;
		const rememberedSession = remembered ? sessions.find((s) => s.path === remembered) : undefined;
		const sessionInvalid = !this.session || !sessions.some((s) => s.path === this.session?.path);
		const divergedFromShared = rememberedSession !== undefined && this.session?.path !== rememberedSession.path;
		const sessionSwitched = campaignChanged || sessionInvalid || divergedFromShared;
		if (sessionSwitched) {
			this.setSession(rememberedSession ?? sessions[0]);
			this.activeStepId = STEPS[0].id;
			this.phoneDetailOpen = false;
		}

		if (changedPaths === undefined || sessionSwitched || !this.session) {
			// A fresh mount/mode switch re-reads the BODY but `this.session`
			// (the fm model) would otherwise stay whatever object this panel
			// last held — stale against any external fm change that happened
			// while the panel was hidden (hidden panels get no store
			// notifications; e.g. an entity rename updating this session's
			// npc wikilinks from the World tab). Re-point it at the store's
			// current model for the same path before rebuilding.
			if (!sessionSwitched && this.session) {
				const currentPath = this.session.path;
				this.session = sessions.find((s) => s.path === currentPath) ?? this.session;
			}
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
		// Alt+R (docs/plan.md M13): roll inspiration for the field being
		// worked on — i.e. the active step's inspire control. Deliberately
		// BEFORE the typing guard: rolling mid-type is exactly the use case
		// (the chip renders below; the caret never moves).
		if (evt.altKey && !evt.ctrlKey && !evt.metaKey && evt.key.toLowerCase() === "r") {
			const rollBtn = this.workspaceEl?.querySelector<HTMLElement>(".strong-start-inspire-button");
			if (rollBtn) {
				evt.preventDefault();
				rollBtn.click();
			}
			return;
		}

		// Never hijack Ctrl/Cmd+digit while the GM is typing in a field —
		// switching steps yanks the focused editor out mid-edit.
		if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement) return;
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

		const shell = this.containerEl.createDiv({ cls: "strong-start-prep-shell" });
		renderHint(
			shell,
			this.view,
			this.view.plugin,
			"prep-board",
			"Work top to bottom or skip around — mark a step done when it's done enough."
		);
		this.toolbarEl = shell.createDiv({ cls: "strong-start-prep-toolbar" });
		const board = shell.createDiv({ cls: "strong-start-prep-board" });
		this.boardEl = board;
		this.masterListEl = board.createDiv({ cls: "strong-start-prep-master" });
		this.workspaceEl = board.createDiv({ cls: "strong-start-prep-workspace" });

		this.renderToolbar();
		this.renderMasterList();
		this.renderWorkspace();
		this.updatePhoneLayout();
	}

	/** Reflect the phone master→detail state as a board class (CSS shows one
	 * pane or the other under `body.is-phone`; desktop ignores the class). */
	private updatePhoneLayout(): void {
		this.boardEl.toggleClass("is-phone-detail", this.phoneDetailOpen);
	}

	private openPhoneDetail(stepId: string): void {
		this.activeStepId = stepId;
		this.phoneDetailOpen = true;
		this.renderMasterList();
		this.renderWorkspace();
		this.updatePhoneLayout();
	}

	private closePhoneDetail(): void {
		this.phoneDetailOpen = false;
		this.renderMasterList();
		this.updatePhoneLayout();
	}

	private disposeTransient(): void {
		for (const suggest of this.suggesters) suggest.close();
		this.suggesters = [];
		// FLUSH, don't drop — a pending debounced write holds real keystrokes
		// (typing then immediately switching sessions or closing the view).
		// Safe to run late: every write is pinned to the session path it was
		// editing, and the section diff guard no-ops clean flushes.
		for (const debouncer of this.debouncers) debouncer.run();
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

		const selectorEl = this.toolbarEl.createDiv({ cls: "strong-start-prep-session-selector" });
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

		this.prepTimerEl = this.toolbarEl.createSpan({ cls: "strong-start-prep-timer" });
		this.updatePrepTimerText();

		this.toolbarEl.createSpan({
			cls: "strong-start-prep-progress",
			text: `${session.stepsDone.length} of ${STEPS.length}`,
		});

		const overflowBtn = this.toolbarEl.createEl("button", {
			cls: "strong-start-icon-button",
			attr: { "aria-label": "More actions", type: "button" },
		});
		setIcon(overflowBtn, "ellipsis");
		this.view.registerDomEvent(overflowBtn, "click", (evt) => {
			const menu = new Menu();
			menu.addItem((item) =>
				item
					.setTitle("Copy session sheet")
					.setIcon("clipboard-copy")
					.onClick(() => void this.copySessionSheet())
			);
			menu.showAtMouseEvent(evt);
		});
	}

	/** One-page markdown prep sheet for the open session, straight to the
	 * clipboard (docs/plan.md delight detail) — pure builder in
	 * `sessions/session-sheet.ts`, reading the same cached body this panel
	 * already holds rather than a fresh vault read. */
	private async copySessionSheet(): Promise<void> {
		const campaign = this.campaign;
		const session = this.session;
		if (!campaign || !session) return;

		const sheet = buildSessionSheet(campaign.name, session, this.bodyText);
		const copied = await tryFileOp(
			() => navigator.clipboard.writeText(sheet),
			"Couldn't copy the session sheet to the clipboard."
		);
		if (copied !== null) new Notice("Session sheet copied.");
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
				cls: `strong-start-step-row is-${state}${step.id === this.activeStepId ? " is-active" : ""}`,
				attr: { "data-key": `step-row-${step.id}` },
			});

			const circle = row.createEl("button", {
				cls: `strong-start-step-circle is-${state}`,
				attr: { "aria-label": isDone ? "Marked done — click to unmark" : "Mark step done", type: "button" },
				text: state === "done" ? "✓" : state === "auto" ? "◐" : "○",
			});
			this.view.registerDomEvent(circle, "click", (evt) => {
				evt.stopPropagation();
				void this.toggleStepDone(step.id);
			});

			row.createSpan({ cls: "strong-start-step-number", text: String(step.number) });
			row.createSpan({ cls: "strong-start-step-label", text: step.shortLabel });

			const summary = summaryFor(step, session, this.bodyText);
			if (summary) row.createSpan({ cls: "strong-start-step-summary", text: summary });

			this.view.registerDomEvent(row, "click", () => {
				if (isPhone(this.view.app)) {
					this.openPhoneDetail(step.id);
					return;
				}
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
		await this.patchFrontmatterFor(session.path, (fm) => ({ ...fm, stepsDone: nextStepsDone }));
		this.maybeCelebrateLazyPrep(session.path, nextStepsDone);
		this.renderMasterList();
		this.renderToolbar();
	}

	/** The under-30-minutes toast (docs/plan.md M13): fires once per session
	 * when the LAST step gets its manual ✓ inside the lazy window. Never
	 * guilts when over — past 30 minutes there's no toast at all. */
	private readonly lazyToastShownFor = new Set<string>();

	private maybeCelebrateLazyPrep(path: string, stepsDone: readonly string[]): void {
		if (stepsDone.length < STEPS.length) return;
		if (this.lazyToastShownFor.has(path)) return;
		const minutes = this.prepMinutes(path);
		if (minutes >= 30) return;
		this.lazyToastShownFor.add(path);
		new Notice(
			minutes < 1
				? "Prepped in under a minute. Suspiciously lazy — and proud of it."
				: `Prepped in ${minutes} minute${minutes === 1 ? "" : "s"}. Lazy, and proud of it.`
		);
	}

	// ---- Workspace --------------------------------------------------------

	private renderWorkspace(): void {
		this.workspaceEl.empty();
		const session = this.session;
		const campaign = this.campaign;
		if (!session || !campaign) return;

		// Phone drill-down back header (docs/plan.md M12) — CSS hides it on
		// desktop, where both panes are always visible.
		if (isPhone(this.view.app)) {
			const step = STEPS.find((s) => s.id === this.activeStepId);
			const header = this.workspaceEl.createDiv({ cls: "strong-start-phone-back-header" });
			const backBtn = header.createEl("button", {
				cls: "strong-start-phone-back-button",
				attr: { "aria-label": "Back to steps", type: "button" },
			});
			setIcon(backBtn, "arrow-left");
			this.view.registerDomEvent(backBtn, "click", () => this.closePhoneDetail());
			header.createSpan({
				cls: "strong-start-phone-back-title",
				text: step ? `${step.number} · ${step.shortLabel}` : "Step",
			});
		}

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
			// Pinned to THIS render's session — see patchFrontmatterFor.
			patchFrontmatter: (mutate) => this.patchFrontmatterFor(session.path, mutate),
			writeSection: (heading, content) => this.writeSectionAt(session.path, heading, content),
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

	/**
	 * Both persistence paths are PINNED to the session path captured when the
	 * step context was built, never resolved from `this.session` at call time:
	 * a debounced write can fire after the GM switches sessions (the panel's
	 * async rebuild hasn't flushed/cancelled it yet), and resolving the target
	 * late wrote one session's prose into another session's note.
	 */
	private async patchFrontmatterFor(path: string, mutate: (fm: SessionFm) => SessionFm): Promise<void> {
		// Freshest model for that path (soft-path updates land on
		// `this.session`), but never a *different* session's model.
		const session = this.session?.path === path ? this.session : this.sessions.find((s) => s.path === path);
		if (!session) return;
		const file = this.view.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return;

		const next = mutate(toSessionFm(session));
		if (this.session?.path === path) this.session = { ...session, ...next };

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

	private async writeSectionAt(path: string, heading: string, content: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
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
