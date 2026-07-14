import { Component, MarkdownRenderer, Notice, setIcon, TFile } from "obsidian";
import { renderEmptyState, renderEmptyStateAction, renderCollapsibleSection, SectionState } from "../panel-kit";
import { replaceSection, sectionContent } from "../../lib/sections";
import { parseTaskBulletSection, renderTaskBulletRows, type TaskRow } from "../../sessions/bullet-list";
import { toSessionFm, writeSessionFm } from "../../sessions/session-schema";
import { deriveRunTallies } from "../../sessions/run-derive";
import { revealSecret, unrevealSecret } from "../../sessions/secrets-ops";
import { patchSessionSecrets } from "../../sessions/session-files";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { beginSelfWrite, isSelfWrite } from "../../lib/self-write";
import { DeferredRebuildQueue, preserveFocus } from "../../lib/focus-preserve";
import { tryFileOp } from "../../lib/notify";
import { renderHint } from "../../help/hint";
import { rollDice } from "../../tables/dice";
import { formatClockTime, formatElapsed } from "../../lib/format-elapsed";
import { featureEnabled } from "../../features";
import {
	renderBenchmarkCard,
	renderBossMinionTable,
	renderDifficultyDialsList,
	renderImprovisedDamageTable,
	renderImprovisedDcSection,
	renderLocationMonstersSection,
	renderMonsterStatsByCrTable,
	renderStressEffectsSection,
	renderWildernessTravelSection,
} from "../../dnd5e/dnd5e-cards";
import { openMonsterBuilder } from "../../dnd5e/monster-builder-modal";
import { EndSessionModal } from "./end-session-modal";
import { mountDicePopover, rollDetail, type DiceConfig } from "./dice-popover";
import { mountBottomPane, type BottomPaneHost } from "./bottom-pane";
import { GlancePane } from "./glance-pane";
import type { CampaignModel } from "../../campaigns/types";
import type { Secret, SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

type RunTextSize = "sm" | "md" | "lg";
const TEXT_SIZE_ORDER: readonly RunTextSize[] = ["sm", "md", "lg"];

const UNDO_WINDOW_MS = 5000;
const DICE_TOAST_LEAVE_MS = 1200;
const DICE_TOAST_TOTAL_MS = 1500;

interface ActivePopover {
	anchorEl: HTMLElement;
	popoverEl: HTMLElement;
}

/**
 * The at-the-table run panel (docs/plan.md M6): read-optimized, big type,
 * one-tap-or-nothing, cannot be accidentally edited — the bottom pane's log
 * input and Notes scratchpad are the only writing surfaces (the scratchpad is
 * the run-screen redesign's deliberate amendment to M6's log-only rule).
 * Shows whatever session Prep currently has selected
 * (`plugin.ui.lastSessionPath`), falling back to the latest.
 *
 * Mirrors `prep-panel.ts`'s self-write soft path / deferred-rebuild
 * architecture (AGENTS.md risk #2), scoped down to those two fields —
 * `DeferredRebuildQueue` guards them, and pending Notes writes are flushed
 * (awaited) before every body re-read.
 */
export class RunPanel {
	private campaign: CampaignModel | null = null;
	private session: SessionModel | null = null;

	private bodyText = "";
	private bodyPath: string | null = null;
	private sceneRows: TaskRow[] = [];
	private scenesMalformed = false;

	private textSize: RunTextSize;
	private readonly elapsedStart = new Map<string, number>();
	private readonly sectionStates = new Map<string, SectionState>();

	/** Scene rows whose detail block is expanded, keyed by scene TEXT (indices
	 * reorder as done rows sink). In-memory; reset on session switch. */
	private readonly expandedScenes = new Set<string>();
	/** Markdown child components for expanded scene details — disposed at the
	 * top of every `renderScenes()` (per-region bucket, not the single slot). */
	private readonly sceneMdBucket: Component[] = [];

	private peekedSecretId: string | null = null;
	private undoVisibleForId: string | null = null;
	private undoTimeoutHandle: number | null = null;
	/** One-shot card-flip garnish (docs/plan.md M13): set just before the
	 * re-render that follows a reveal, consumed by that render, then cleared —
	 * so later re-renders (undo timeout, store notifications) don't replay it. */
	private flipSecretId: string | null = null;

	private mdComponent: Component | null = null;
	private activePopover: ActivePopover | null = null;
	/** Last-composed dice pool — reopening the popover keeps the config
	 * (in-memory only, same policy as the other run-mode UI state). */
	private readonly diceConfig: DiceConfig = { count: 1, sides: 20, modifier: 0 };

	/** Pending debounced writers (the Notes scratchpad). FLUSHED, never
	 * dropped — see `flushDebouncers` and prep-panel's identical contract. */
	private debouncers: Array<{ cancel(): void; run(): unknown }> = [];

	private readonly glancePane: GlancePane;

	private shellEl: HTMLElement | null = null;
	private timerEl: HTMLElement | null = null;
	private scenesListEl: HTMLElement | null = null;
	private secretsListEl: HTMLElement | null = null;

	// 5e drawer (docs/plan.md M10) — settings-gated, read-only reference.
	// `dnd5eOpen`/section-collapse state is in-memory only and resets on the
	// next full rebuild (session switch), same policy as the other run-mode
	// UI-only state on this class.
	private dnd5eOpen = false;
	private dnd5eDrawerEl: HTMLElement | null = null;
	private dnd5eButtonEl: HTMLElement | null = null;
	private readonly dnd5eSectionState = new SectionState();

	private readonly rebuildQueue: DeferredRebuildQueue;

	constructor(
		private readonly view: LazyCampaignView,
		private readonly containerEl: HTMLElement
	) {
		this.textSize = this.view.plugin.ui.runTextSize ?? "md";
		this.glancePane = new GlancePane(view, (path) => this.openInNewLeaf(path));

		this.rebuildQueue = new DeferredRebuildQueue(containerEl, () => void this.doFullRebuildNow(false));
		this.rebuildQueue.bind(
			(el, cb) => this.view.registerDomEvent(el, "focusout", cb),
			(id) => this.view.registerInterval(id)
		);

		this.view.registerDomEvent(containerEl.ownerDocument, "click", (evt) => this.handleOutsideClick(evt));
		this.view.registerDomEvent(containerEl.ownerDocument, "keydown", (evt) => {
			if (evt.key === "Escape" && this.dnd5eOpen) this.setDnd5eOpen(false);
		});
		this.view.registerInterval(window.setInterval(() => this.updateTimerText(), 1000));
		this.view.register(() => this.disposeDom());
	}

	render(changedPaths?: ReadonlySet<string>): void {
		const plugin = this.view.plugin;
		const campaign = plugin.activeCampaign();

		if (!campaign) {
			this.disposeDom();
			this.campaign = null;
			this.session = null;
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

		if (sessions.length === 0) {
			this.disposeDom();
			this.session = null;
			this.containerEl.empty();
			renderEmptyStateAction(this.containerEl, this.view, {
				title: "Nothing to run yet.",
				body: "Prep a session first — the eight steps take about thirty minutes.",
				ctaText: "Go to prep",
				onCta: () => this.view.setMode("prep"),
			});
			return;
		}

		const desiredPath = plugin.ui.lastSessionPath;
		const found = desiredPath ? sessions.find((s) => s.path === desiredPath) : undefined;
		const nextSession = found ?? sessions[0];
		const sessionSwitched = campaignChanged || !this.session || this.session.path !== nextSession.path;
		this.session = nextSession;

		if (changedPaths === undefined || campaignChanged || sessionSwitched) {
			void this.doFullRebuildNow(sessionSwitched);
			return;
		}

		const path = this.session.path;
		if (changedPaths.has(path) && isSelfWrite(path)) {
			const fresh = sessions.find((s) => s.path === path);
			if (fresh) this.session = fresh;
			this.updateTimerText();
			return;
		}

		this.rebuildQueue.request();
	}

	// ---- Rebuild ------------------------------------------------------------

	private async ensureBody(path: string, force = false): Promise<void> {
		if (!force && this.bodyPath === path) return;
		const file = this.view.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return;
		this.bodyText = await this.view.app.vault.cachedRead(file);
		this.bodyPath = path;
	}

	private async doFullRebuildNow(sessionSwitched: boolean): Promise<void> {
		const session = this.session;
		if (!session) return;

		if (sessionSwitched) {
			this.peekedSecretId = null;
			this.clearUndo();
			this.closePopover();
			this.glancePane.resetForSession();
			this.expandedScenes.clear();
			if (!this.elapsedStart.has(session.path)) this.elapsedStart.set(session.path, Date.now());
		}

		// Land pending pinned writes BEFORE the body re-read — otherwise the
		// rebuilt Notes textarea re-seeds from a disk body older than what
		// was just typed (the flush is awaitable, so this closes the window
		// prep's fire-and-forget flush leaves open).
		await this.flushDebouncers();
		await this.ensureBody(session.path, true);
		if (this.session?.path !== session.path) return; // switched again mid-await
		preserveFocus(this.containerEl, () => this.fullRebuild());
	}

	/** Run every pending debounced writer and await the writes. Each write is
	 * pinned to the note it was typed against and diff-guarded, so a late
	 * flush after a session switch is a safe no-op (prep-panel's contract). */
	private async flushDebouncers(): Promise<void> {
		const settled = this.debouncers.map((debouncer) => debouncer.run());
		this.debouncers = [];
		const pending = settled.filter((result): result is Promise<unknown> => result instanceof Promise);
		if (pending.length > 0) await Promise.allSettled(pending);
	}

	private fullRebuild(): void {
		this.disposeDom();
		this.containerEl.empty();

		const session = this.session;
		const campaign = this.campaign;
		if (!session || !campaign) return;

		const scenesParsed = parseTaskBulletSection(sectionContent(this.bodyText, "Scenes"));
		this.scenesMalformed = scenesParsed.malformed;
		this.sceneRows = scenesParsed.rows.map((row) => ({ ...row }));

		const shell = this.containerEl.createDiv({ cls: `strong-start-run-shell is-text-${this.textSize}` });
		this.shellEl = shell;

		const topBar = shell.createDiv({ cls: "strong-start-run-topbar" });
		this.renderTopBar(topBar, session, campaign);

		// One dismissible line, then never again — run mode stays distraction-
		// free, but the face-down peek interaction is invisible until explained.
		renderHint(
			shell,
			this.view,
			this.view.plugin,
			"run-secrets",
			"Secrets stay face-down while players can see your screen — tap one to peek, then mark it revealed."
		);

		const board = shell.createDiv({ cls: "strong-start-run-board" });
		const mainCol = board.createDiv({ cls: "strong-start-run-main" });
		const glanceCol = board.createDiv({ cls: "strong-start-run-glance" });

		const strongStartSection = mainCol.createDiv({ cls: "strong-start-run-section strong-start-run-strong-start" });
		strongStartSection.createDiv({ cls: "strong-start-run-section-label", text: "Strong start" });
		const strongStartBody = strongStartSection.createDiv({ cls: "strong-start-run-strong-start-body" });
		void this.renderStrongStart(strongStartBody, session);

		// Scenes and Secrets are collapsible (run-screen redesign: they were
		// the panel's biggest space hogs). The collapsible body is built once
		// and CSS-toggled, so `renderScenes()`/`renderSecrets()` partial
		// re-renders keep pointing at live elements. They share one row —
		// equal-width columns on wide panes, stacking on narrow ones.
		const state = this.sectionStateFor(session.path);
		const sectionsRow = mainCol.createDiv({ cls: "strong-start-run-sections-row" });

		const scenesSection = sectionsRow.createDiv({ cls: "strong-start-run-section" });
		renderCollapsibleSection(scenesSection, this.view, state, "scenes", "Scenes", (body) => {
			this.scenesListEl = body.createDiv({ cls: "strong-start-run-scene-list" });
			this.renderScenes();
		});

		const secretCount = session.secrets.filter((s) => !s.archived).length;
		const secretsSection = sectionsRow.createDiv({ cls: "strong-start-run-section" });
		renderCollapsibleSection(
			secretsSection,
			this.view,
			state,
			"secrets",
			secretCount > 0 ? `Secrets (${secretCount})` : "Secrets",
			(body) => {
				this.secretsListEl = body.createDiv({ cls: "strong-start-run-secret-list" });
				this.renderSecrets();
			}
		);

		this.glancePane.render(glanceCol, session, campaign, this.bodyText, this.sectionStateFor(session.path));

		mountBottomPane(shell.createDiv(), this.bottomPaneHost(), session.path, this.bodyText);

		this.renderDnd5eDrawer(shell, campaign);

		this.updateTimerText();
	}

	private disposeDom(): void {
		this.closePopover();
		// Teardown safety net (view close, empty states): fire-and-forget
		// flush. Rebuilds go through `flushDebouncers` first, which awaits.
		for (const debouncer of this.debouncers) void debouncer.run();
		this.debouncers = [];
		this.glancePane.dispose();
		for (const component of this.sceneMdBucket) this.view.removeChild(component);
		this.sceneMdBucket.length = 0;
		if (this.mdComponent) {
			this.view.removeChild(this.mdComponent);
			this.mdComponent = null;
		}
	}

	// ---- Top bar --------------------------------------------------------------

	private renderTopBar(container: HTMLElement, session: SessionModel, campaign: CampaignModel): void {
		container.empty();

		// Two spans, not one string: the campaign half is CSS-hidden on phones
		// (the header directly above already names the campaign), so the top
		// bar keeps a readable "Session N" instead of truncating to nothing.
		const sessionLabel = container.createDiv({ cls: "strong-start-run-session-label" });
		sessionLabel.createSpan({ text: `Session ${session.session}` });
		sessionLabel.createSpan({
			cls: "strong-start-run-session-campaign",
			text: ` · ${campaign.name}`,
		});

		this.timerEl = container.createDiv({ cls: "strong-start-run-timer" });

		const diceAnchor = container.createDiv({ cls: "strong-start-run-popover-anchor" });
		const diceBtn = diceAnchor.createEl("button", {
			cls: "strong-start-run-icon-button",
			attr: { "aria-label": "Roll d20", type: "button" },
		});
		setIcon(diceBtn, "dices");
		this.view.registerDomEvent(diceBtn, "click", () => this.rollD20Toast());

		const chevronBtn = diceAnchor.createEl("button", {
			cls: "strong-start-run-icon-button strong-start-run-chevron",
			attr: { "aria-label": "More roll options", type: "button" },
		});
		setIcon(chevronBtn, "chevron-down");
		this.view.registerDomEvent(chevronBtn, "click", () =>
			this.togglePopover(diceAnchor, (el) => this.buildDicePopover(el))
		);

		const safetyBtn = container.createEl("button", {
			cls: "strong-start-run-icon-button",
			attr: { "aria-label": "Safety tools", type: "button" },
		});
		setIcon(safetyBtn, "shield");
		this.view.registerDomEvent(safetyBtn, "click", () => this.openSafetyCard(campaign));

		// 5e module (docs/plan.md M10) — zero UI when the feature is off.
		if (featureEnabled(this.view.plugin.settings, "dnd5e")) {
			const dnd5eBtn = container.createEl("button", {
				cls: "strong-start-run-icon-button",
				attr: { "aria-label": "5e reference", type: "button" },
			});
			setIcon(dnd5eBtn, "swords");
			this.dnd5eButtonEl = dnd5eBtn;
			this.view.registerDomEvent(dnd5eBtn, "click", (evt) => {
				evt.stopPropagation();
				this.setDnd5eOpen(!this.dnd5eOpen);
			});
		} else {
			this.dnd5eButtonEl = null;
		}

		const endBtn = container.createEl("button", {
			cls: "mod-warning strong-start-run-end-button",
			text: "End session",
		});
		// Read `this.session` at click time — the top bar isn't rebuilt on the
		// self-write soft path, so a captured `session` would predate any
		// reveals/scene ticks made since it was built.
		this.view.registerDomEvent(endBtn, "click", () => {
			if (this.session) this.openEndSessionModal(this.session);
		});

		const overflowAnchor = container.createDiv({ cls: "strong-start-run-popover-anchor" });
		const overflowBtn = overflowAnchor.createEl("button", {
			cls: "strong-start-run-icon-button",
			attr: { "aria-label": "More options", type: "button" },
		});
		setIcon(overflowBtn, "ellipsis");
		this.view.registerDomEvent(overflowBtn, "click", () =>
			this.togglePopover(overflowAnchor, (el) => this.buildOverflowPopover(el))
		);
	}

	private updateTimerText(): void {
		if (!this.timerEl || !this.session) return;
		const start = this.elapsedStart.get(this.session.path);
		this.timerEl.setText(start === undefined ? "0:00" : formatElapsed(Date.now() - start));
	}

	// ---- Popovers (d20 options, overflow menu) --------------------------------

	private togglePopover(anchorEl: HTMLElement, build: (el: HTMLElement) => void): void {
		if (this.activePopover?.anchorEl === anchorEl) {
			this.closePopover();
			return;
		}
		this.closePopover();
		const popoverEl = anchorEl.createDiv({ cls: "strong-start-run-popover" });
		build(popoverEl);
		this.activePopover = { anchorEl, popoverEl };
	}

	private closePopover(): void {
		if (!this.activePopover) return;
		this.activePopover.popoverEl.remove();
		this.activePopover = null;
	}

	private handleOutsideClick(evt: MouseEvent): void {
		const target = evt.target as Node;
		// A click whose target is no longer in the document was handled by one
		// of our own controls that re-rendered its DOM before this bubble-phase
		// handler ran (e.g. the 5e drawer's party steppers). `contains()` would
		// be false for it and wrongly read as "outside" — closing the drawer
		// out from under the user mid-interaction.
		if (!target.isConnected) return;
		const popover = this.activePopover;
		if (popover && !popover.anchorEl.contains(target) && !popover.popoverEl.contains(target)) {
			this.closePopover();
		}
		if (this.peekedSecretId !== null && this.secretsListEl && !this.secretsListEl.contains(target)) {
			this.peekedSecretId = null;
			this.renderSecrets();
		}
		if (
			this.dnd5eOpen &&
			this.dnd5eDrawerEl &&
			!this.dnd5eDrawerEl.contains(target) &&
			!this.dnd5eButtonEl?.contains(target)
		) {
			this.setDnd5eOpen(false);
		}
	}

	private buildDicePopover(el: HTMLElement): void {
		mountDicePopover(
			el,
			{
				registerDomEvent: (target, type, cb) => this.view.registerDomEvent(target, type, cb),
				rng: this.view.plugin.rng,
				onRoll: (result, config) => {
					// Garnish only a lone d20 (judged on the natural die, so
					// `1d20+5` rolling a 20 still earns it; `2d20`/`3d6` never do).
					const natural = config.count === 1 && config.sides === 20;
					this.showDiceToast(String(result.total), {
						detail: rollDetail(result),
						nat20: natural && result.rolls[0] === 20,
						nat1: natural && result.rolls[0] === 1,
					});
				},
				onAdvantage: (keepHigh) => {
					this.closePopover();
					this.rollAdvantage(keepHigh);
				},
			},
			this.diceConfig
		);
	}

	private buildOverflowPopover(el: HTMLElement): void {
		el.empty();
		const row = el.createDiv({ cls: "strong-start-run-textsize-row" });
		row.createSpan({ text: "Text size" });
		const minusBtn = row.createEl("button", {
			cls: "strong-start-run-icon-button",
			text: "A−",
			attr: { "aria-label": "Smaller text", type: "button" },
		});
		const plusBtn = row.createEl("button", {
			cls: "strong-start-run-icon-button",
			text: "A+",
			attr: { "aria-label": "Larger text", type: "button" },
		});
		this.view.registerDomEvent(minusBtn, "click", () => this.stepTextSize(-1));
		this.view.registerDomEvent(plusBtn, "click", () => this.stepTextSize(1));
	}

	private stepTextSize(direction: number): void {
		const idx = TEXT_SIZE_ORDER.indexOf(this.textSize);
		const next = TEXT_SIZE_ORDER[Math.min(TEXT_SIZE_ORDER.length - 1, Math.max(0, idx + direction))];
		if (next === this.textSize) return;
		this.textSize = next;
		this.view.plugin.ui.runTextSize = next;
		void this.view.plugin.persist();
		for (const size of TEXT_SIZE_ORDER) this.shellEl?.toggleClass(`is-text-${size}`, size === this.textSize);
	}

	// ---- Dice toast -------------------------------------------------------

	private rollD20Toast(): void {
		this.closePopover();
		const result = rollDice("1d20", this.view.plugin.rng);
		if (!result) return;
		this.showDiceToast(String(result.total), { nat20: result.total === 20, nat1: result.total === 1 });
	}

	private rollAdvantage(keepHigh: boolean): void {
		const rng = this.view.plugin.rng;
		const a = rollDice("1d20", rng);
		const b = rollDice("1d20", rng);
		if (!a || !b) return;
		const kept = keepHigh ? Math.max(a.total, b.total) : Math.min(a.total, b.total);
		// The kept die is still a natural d20 — it earns the same garnish
		// (docs/plan.md: gold ring / wry shake "on the d20 toast only").
		this.showDiceToast(`${a.total} / ${b.total} → ${kept}`, { nat20: kept === 20, nat1: kept === 1 });
	}

	private showDiceToast(display: string, options?: { nat20?: boolean; nat1?: boolean; detail?: string }): void {
		if (!this.shellEl) return;
		const toast = this.shellEl.createDiv({ cls: "strong-start-run-dice-toast" });
		if (options?.nat20) toast.addClass("is-nat20");
		if (options?.nat1) toast.addClass("is-nat1");
		toast.createDiv({ cls: "strong-start-run-dice-toast-total", text: display });
		if (options?.detail) toast.createDiv({ cls: "strong-start-run-dice-toast-detail", text: options.detail });

		// setTimeout handles get their own clearTimeout teardown —
		// registerInterval's contract is for setInterval handles.
		const leaveHandle = window.setTimeout(() => toast.addClass("is-leaving"), DICE_TOAST_LEAVE_MS);
		const removeHandle = window.setTimeout(() => toast.remove(), DICE_TOAST_TOTAL_MS);
		this.view.register(() => {
			window.clearTimeout(leaveHandle);
			window.clearTimeout(removeHandle);
		});
	}

	// ---- Strong start (read-aloud, rendered markdown) -------------------------

	private async renderStrongStart(container: HTMLElement, session: SessionModel): Promise<void> {
		const text = sectionContent(this.bodyText, "Strong start");
		if (text.length === 0) {
			renderEmptyState(container, "No strong start yet — add one in prep step 2.");
			return;
		}

		if (this.mdComponent) this.view.removeChild(this.mdComponent);
		const component = this.view.addChild(new Component());
		this.mdComponent = component;
		await MarkdownRenderer.render(this.view.app, text, container, session.path, component);
	}

	// ---- Scenes (one-tap checklist) --------------------------------------------

	private renderScenes(): void {
		const container = this.scenesListEl;
		if (!container) return;
		for (const component of this.sceneMdBucket) this.view.removeChild(component);
		this.sceneMdBucket.length = 0;
		container.empty();

		if (this.scenesMalformed) {
			const banner = container.createDiv({ cls: "strong-start-malformed-banner" });
			banner.createSpan({ text: "Scenes were edited outside the board — open the note to fix formatting." });
			const openBtn = banner.createEl("button", { text: "Open note" });
			this.view.registerDomEvent(openBtn, "click", () => void this.openInNewLeaf(this.session?.path));
			return;
		}

		if (this.sceneRows.length === 0) {
			renderEmptyState(container, "No scenes yet — add some in prep step 3.");
			return;
		}

		const indexed = this.sceneRows.map((row, index) => ({ row, index }));
		const ordered = [...indexed.filter((e) => !e.row.done), ...indexed.filter((e) => e.row.done)];

		for (const { row, index } of ordered) {
			// A row wrapper, not one big <button> — the detail chevron is its
			// own button, and nesting buttons is invalid HTML that breaks tap
			// handling on mobile.
			const wrap = container.createDiv({ cls: `strong-start-run-scene-row${row.done ? " is-done" : ""}` });
			const toggle = wrap.createEl("button", {
				cls: "strong-start-run-scene-toggle",
				attr: { type: "button", "aria-pressed": row.done ? "true" : "false" },
			});
			const icon = toggle.createSpan({ cls: "strong-start-run-scene-check" });
			setIcon(icon, row.done ? "check-circle" : "circle");
			toggle.createSpan({ cls: "strong-start-run-scene-text", text: row.text });
			this.view.registerDomEvent(toggle, "click", () => void this.toggleScene(index));

			const detail = row.detail;
			if (!detail) continue;

			const expanded = this.expandedScenes.has(row.text);
			const expandBtn = wrap.createEl("button", {
				cls: "strong-start-run-scene-expand",
				attr: {
					type: "button",
					"aria-label": expanded ? "Hide scene detail" : "Show scene detail",
					"aria-expanded": expanded ? "true" : "false",
				},
			});
			setIcon(expandBtn, expanded ? "chevron-down" : "chevron-right");
			this.view.registerDomEvent(expandBtn, "click", () => {
				if (!this.expandedScenes.delete(row.text)) this.expandedScenes.add(row.text);
				this.renderScenes();
			});

			if (expanded) {
				const detailEl = container.createDiv({ cls: "strong-start-run-scene-detail" });
				const component = this.view.addChild(new Component());
				this.sceneMdBucket.push(component);
				void MarkdownRenderer.render(this.view.app, detail, detailEl, this.session?.path ?? "", component);
			}
		}
	}

	private async toggleScene(index: number): Promise<void> {
		const session = this.session;
		const row = this.sceneRows[index];
		if (!session || !row) return;

		row.done = !row.done;
		this.renderScenes();

		const file = this.view.app.vault.getFileByPath(session.path);
		if (!(file instanceof TFile)) return;
		const rendered = renderTaskBulletRows(this.sceneRows);

		const done = beginSelfWrite(file.path);
		try {
			await tryFileOp(async () => {
				await this.view.app.vault.process(file, (body) => {
					if (sectionContent(body, "Scenes") === rendered) return body;
					return replaceSection(body, "Scenes", rendered);
				});
			}, "Couldn't save that scene — check the console for details.");
		} finally {
			done();
		}
	}

	// ---- Secrets (tap-to-peek, mark revealed, transient undo) ------------------

	private renderSecrets(): void {
		const container = this.secretsListEl;
		if (!container || !this.session) return;
		container.empty();

		const secrets = this.session.secrets.filter((s) => !s.archived);
		if (secrets.length === 0) {
			renderEmptyState(container, "No secrets yet — add some in prep step 4.");
			return;
		}
		for (const secret of secrets) this.renderSecretCard(container, secret);
		this.flipSecretId = null;
	}

	private renderSecretCard(container: HTMLElement, secret: Secret): void {
		const revealed = secret.revealed === true;
		const peeked = this.peekedSecretId === secret.id;

		const card = container.createDiv({
			cls: `strong-start-run-secret-card${revealed ? " is-revealed" : peeked ? " is-peeked" : " is-hidden"}${
				this.flipSecretId === secret.id ? " is-flipping" : ""
			}`,
			attr: { "data-key": `run-secret-${secret.id}` },
		});

		const icon = card.createSpan({ cls: "strong-start-run-secret-icon" });
		setIcon(icon, revealed ? "unlock" : "lock");

		if (revealed || peeked) {
			card.createDiv({ cls: "strong-start-run-secret-text", text: secret.text });
		} else {
			// One bar, one line — hidden secrets are a compact masked row now
			// (run-screen redesign), not a three-bar card.
			const mask = card.createDiv({ cls: "strong-start-run-secret-mask" });
			mask.createSpan({ cls: "strong-start-run-secret-mask-bar" });
		}

		if (!revealed) {
			this.view.registerDomEvent(card, "click", (evt) => {
				evt.stopPropagation();
				this.handleSecretTap(secret.id);
			});
		}

		if (!revealed && peeked) {
			const markBtn = card.createEl("button", { cls: "mod-cta strong-start-run-secret-mark", text: "Mark revealed" });
			this.view.registerDomEvent(markBtn, "click", (evt) => {
				evt.stopPropagation();
				void this.markRevealed(secret.id);
			});
		}

		if (revealed && this.undoVisibleForId === secret.id) {
			const undoBtn = card.createEl("button", { cls: "strong-start-run-secret-undo", text: "Undo" });
			this.view.registerDomEvent(undoBtn, "click", (evt) => {
				evt.stopPropagation();
				void this.undoReveal(secret.id);
			});
		}
	}

	private handleSecretTap(id: string): void {
		this.peekedSecretId = this.peekedSecretId === id ? null : id;
		this.renderSecrets();
	}

	private async markRevealed(id: string): Promise<void> {
		const session = this.session;
		if (!session) return;

		const result = await tryFileOp(
			() => patchSessionSecrets(this.view.app, session.path, (secrets) => revealSecret(secrets, id)),
			"Couldn't mark that secret revealed — check the console for details."
		);
		if (result === null) return;

		this.peekedSecretId = null;
		this.session = { ...session, secrets: revealSecret(session.secrets, id) };
		this.flipSecretId = id;
		this.showUndoFor(id);
		this.renderSecrets();
	}

	private async undoReveal(id: string): Promise<void> {
		const session = this.session;
		if (!session) return;

		this.clearUndo();

		const result = await tryFileOp(
			() => patchSessionSecrets(this.view.app, session.path, (secrets) => unrevealSecret(secrets, id)),
			"Couldn't undo that reveal — check the console for details."
		);
		if (result === null) return;

		this.session = { ...session, secrets: unrevealSecret(session.secrets, id) };
		this.renderSecrets();
	}

	private showUndoFor(id: string): void {
		this.clearUndo();
		this.undoVisibleForId = id;
		const handle = window.setTimeout(() => {
			this.undoTimeoutHandle = null;
			if (this.undoVisibleForId === id) {
				this.undoVisibleForId = null;
				this.renderSecrets();
			}
		}, UNDO_WINDOW_MS);
		this.undoTimeoutHandle = handle;
		this.view.registerInterval(handle);
	}

	private clearUndo(): void {
		if (this.undoTimeoutHandle !== null) {
			window.clearTimeout(this.undoTimeoutHandle);
			this.undoTimeoutHandle = null;
		}
		this.undoVisibleForId = null;
	}

	// ---- Glance column — see glance-pane.ts (master-detail focus pane) ---------

	private sectionStateFor(path: string): SectionState {
		let state = this.sectionStates.get(path);
		if (!state) {
			state = new SectionState();
			this.sectionStates.set(path, state);
		}
		return state;
	}

	private async openInNewLeaf(path: string | undefined): Promise<void> {
		if (!path) return;
		const file = this.view.app.vault.getFileByPath(path);
		if (!file) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const leaf = this.view.app.workspace.getLeaf(true);
		await leaf.openFile(file);
	}

	// ---- 5e drawer (docs/plan.md M10) --------------------------------------

	/** Built once per `fullRebuild` (feature-gated, so absent entirely when
	 * `dnd5e` is off) and toggled open/closed via a CSS class rather than
	 * rebuilt — the benchmark card's manual-override steppers live inside it,
	 * and rebuilding on every toggle would reset them for no reason. */
	private renderDnd5eDrawer(shell: HTMLElement, campaign: CampaignModel): void {
		if (!featureEnabled(this.view.plugin.settings, "dnd5e")) {
			this.dnd5eDrawerEl = null;
			return;
		}

		const drawer = shell.createDiv({ cls: "strong-start-run-dnd5e-drawer" });
		this.dnd5eDrawerEl = drawer;
		drawer.toggleClass("is-open", this.dnd5eOpen);
		drawer.setAttribute("aria-hidden", this.dnd5eOpen ? "false" : "true");

		const header = drawer.createDiv({ cls: "strong-start-run-dnd5e-drawer-header" });
		header.createEl("h3", { text: "5e reference" });
		const closeBtn = header.createEl("button", {
			cls: "strong-start-run-icon-button",
			attr: { "aria-label": "Close 5e reference", type: "button" },
		});
		setIcon(closeBtn, "x");
		this.view.registerDomEvent(closeBtn, "click", () => this.setDnd5eOpen(false));

		const body = drawer.createDiv({ cls: "strong-start-run-dnd5e-drawer-body" });
		const pcs = this.view.plugin.store?.pcsOf(campaign.path) ?? [];

		const buildRow = body.createDiv({ cls: "strong-start-run-dnd5e-build-row" });
		const buildBtn = buildRow.createEl("button", { text: "Build a monster" });
		this.view.registerDomEvent(buildBtn, "click", () => {
			void openMonsterBuilder(this.view.plugin.app, {
				campaign,
				partyLevels: pcs.map((pc) => pc.level).filter((level): level is number => level !== undefined),
			});
		});

		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "benchmark", "Encounter benchmark", (sectionBody) =>
			renderBenchmarkCard(sectionBody, { owner: this.view, pcs })
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "dcs", "Improvised DCs", (sectionBody) =>
			renderImprovisedDcSection(sectionBody)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "damage", "Improvised damage", (sectionBody) =>
			renderImprovisedDamageTable(sectionBody)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "stats", "Monster stats by CR", (sectionBody) =>
			renderMonsterStatsByCrTable(sectionBody, this.view)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "boss-minions", "Boss and minions", (sectionBody) =>
			renderBossMinionTable(sectionBody, this.view)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "location-monsters", "Monsters by location", (sectionBody) =>
			renderLocationMonstersSection(sectionBody, this.view)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "dials", "Difficulty dials", (sectionBody) =>
			renderDifficultyDialsList(sectionBody)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "travel", "Wilderness travel", (sectionBody) =>
			renderWildernessTravelSection(sectionBody)
		);
		renderCollapsibleSection(body, this.view, this.dnd5eSectionState, "stress", "Stress effects", (sectionBody) =>
			renderStressEffectsSection(sectionBody)
		);
	}

	private setDnd5eOpen(open: boolean): void {
		this.dnd5eOpen = open;
		this.dnd5eDrawerEl?.toggleClass("is-open", open);
		this.dnd5eDrawerEl?.setAttribute("aria-hidden", open ? "false" : "true");
	}

	// ---- Safety card ------------------------------------------------------

	private openSafetyCard(campaign: CampaignModel): void {
		const shell = this.shellEl;
		if (!shell) return;

		const zero = this.view.plugin.store?.sessionZeroOf(campaign.path) ?? null;

		const overlay = shell.createDiv({ cls: "strong-start-run-overlay" });
		const card = overlay.createDiv({ cls: "strong-start-run-safety-card" });
		card.createEl("h2", { text: "Safety tools" });
		card.createEl("p", { text: "Anyone can tap the X. The scene changes, no questions asked." });

		if (zero && (zero.lines.length > 0 || zero.veils.length > 0)) {
			if (zero.lines.length > 0) {
				card.createEl("h3", { text: "Lines" });
				const ul = card.createEl("ul");
				for (const line of zero.lines) ul.createEl("li", { text: line });
			}
			if (zero.veils.length > 0) {
				card.createEl("h3", { text: "Veils" });
				const ul = card.createEl("ul");
				for (const veil of zero.veils) ul.createEl("li", { text: veil });
			}
		} else {
			card.createEl("p", {
				cls: "strong-start-hint",
				text: "No lines or veils recorded yet — add them during session zero.",
			});
		}

		this.view.registerDomEvent(overlay, "click", () => overlay.remove());
	}

	// ---- Bottom pane (log history + notes scratchpad) ---------------------------

	private bottomPaneHost(): BottomPaneHost {
		const plugin = this.view.plugin;
		return {
			registerDomEvent: (el, type, cb) => this.view.registerDomEvent(el, type, cb),
			registerDebounce: (debouncer) => this.debouncers.push(debouncer),
			appendLog: (path, text) => this.appendLog(path, text),
			writeSectionAt: (path, heading, content) => this.writeSectionAt(path, heading, content),
			paneState: () => ({ open: plugin.ui.runBottomOpen ?? false, tab: plugin.ui.runBottomTab ?? "log" }),
			setPaneState: (next) => {
				if (next.open !== undefined) plugin.ui.runBottomOpen = next.open;
				if (next.tab !== undefined) plugin.ui.runBottomTab = next.tab;
				void plugin.persist();
			},
		};
	}

	private async appendLog(path: string, text: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return;

		const line = `- ${formatClockTime(new Date())} ${text}`;
		const done = beginSelfWrite(file.path);
		try {
			await tryFileOp(async () => {
				await this.view.app.vault.process(file, (body) => {
					const existing = sectionContent(body, "Log");
					const next = existing.length > 0 ? `${existing}\n${line}` : line;
					return replaceSection(body, "Log", next);
				});
			}, "Couldn't save that log entry — check the console for details.");
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

	// ---- End session ------------------------------------------------------

	private openEndSessionModal(session: SessionModel): void {
		const tallies = deriveRunTallies(session, this.sceneRows);
		// Carry-forward lands in the next NEW session: max existing number + 1
		// (not session.session + 1 — the GM may be re-running an older session).
		const store = this.view.plugin.store;
		const all = store && this.campaign ? store.sessionsOf(this.campaign.path) : [session];
		const nextSessionNumber = Math.max(...all.map((s) => s.session)) + 1;
		new EndSessionModal(this.view.app, {
			tallies,
			nextSessionNumber,
			onSubmit: (recapText, stars, wishes) => this.handleEndSession(session, recapText, stars, wishes),
		}).open();
	}

	private async handleEndSession(session: SessionModel, recapText: string, stars: string, wishes: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(session.path);
		if (!(file instanceof TFile)) return;

		const done = beginSelfWrite(file.path);
		try {
			const result = await tryFileOp(async () => {
				if (recapText.length > 0) {
					await this.view.app.vault.process(file, (body) => replaceSection(body, "Recap", recapText));
				}
				// Stars & wishes land in their OWN section, not the recap — the
				// player-recap export shares `## Recap` verbatim, and table
				// feedback is the GM's working material, not story-so-far.
				if (stars.length > 0 || wishes.length > 0) {
					const feedback = [
						stars.length > 0 ? `**Stars:** ${stars}` : null,
						wishes.length > 0 ? `**Wishes:** ${wishes}` : null,
					]
						.filter((line): line is string => line !== null)
						.join("\n\n");
					await this.view.app.vault.process(file, (body) => replaceSection(body, "Stars and wishes", feedback));
				}
				await writeLazyFrontmatter(
					this.view.app,
					file,
					writeSessionFm({ ...toSessionFm(session), status: "played" })
				);
			}, "Couldn't end the session — check the console for details.");
			if (result === null) return;
		} finally {
			done();
		}

		this.view.setMode("home");
	}
}
