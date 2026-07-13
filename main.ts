import { Notice, Plugin, TFile, type WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, type LazyCampaignPluginSettings } from "./src/settings/settings";
import { LazyCampaignPluginSettingTab } from "./src/settings/settings-tab";
import { CampaignStore } from "./src/campaigns/campaign-store";
import { CreateCampaignModal } from "./src/campaigns/create-campaign";
import { createDemoCampaign } from "./src/campaigns/demo-campaign";
import { createStarterCampaign } from "./src/campaigns/starter-campaign";
import type { CampaignModel } from "./src/campaigns/types";
import { createNextSession } from "./src/sessions/session-files";
import { buildSessionSheet } from "./src/sessions/session-sheet";
import { buildPlayerRecap } from "./src/sessions/recap-export";
import { buildSessionZeroGuide } from "./src/checklist/guide-export";
import type { SessionModel } from "./src/sessions/types";
import { tryFileOp } from "./src/lib/notify";
import { createRng } from "./src/lib/rng";
import { buildRegistry, type TableRegistry } from "./src/tables/registry";
import { TableStore } from "./src/tables/table-store";
import { CORE_TABLES } from "./src/content";
import { SOLO_TABLES } from "./src/content/solo";
import { STRESS_TABLES } from "./src/content/stress";
import { featureEnabled } from "./src/features";
import { RollTableSuggestModal } from "./src/views/tables/roll-table-modal";
import { LazyCampaignView, VIEW_TYPE_LAZY } from "./src/views/lazy-view";
import type { NavMode } from "./src/views/nav-model";
import { WelcomeModal } from "./src/help/welcome-modal";

// data.json shape. Settings live under a key so future siblings (telemetry,
// caches) can be added without a migration — and so nothing ever calls
// saveData(this.settings) directly, which would wipe those siblings.
interface PersistedData {
	settings: LazyCampaignPluginSettings;
	ui: {
		lastCampaignId?: string;
		lastMode?: string;
		/** The session path Prep and Run agree on showing (docs/plan.md M6:
		 * "Run mode shows the same session the prep board has selected"). */
		lastSessionPath?: string;
		/** Run mode's text-size stepper (top-bar overflow menu), M6. */
		runTextSize?: "sm" | "md" | "lg";
		/** Run mode's bottom Log/Notes pane — open state and active tab
		 * (device preference, same tier as `runTextSize`). */
		runBottomOpen?: boolean;
		runBottomTab?: "log" | "notes";
	};
	hints: {
		dismissed: string[];
	};
}

const DEFAULT_UI: PersistedData["ui"] = {};
const DEFAULT_HINTS: PersistedData["hints"] = { dismissed: [] };

export default class LazyCampaignPlugin extends Plugin {
	settings: LazyCampaignPluginSettings = DEFAULT_SETTINGS;
	ui: PersistedData["ui"] = { ...DEFAULT_UI };
	hints: PersistedData["hints"] = { dismissed: [] };
	store: CampaignStore | null = null;
	/** Parses/caches `type: table` notes into the user half of the rolling
	 * registry (M5) — `refreshRegistry()` folds it into `tables` alongside
	 * `CORE_TABLES`, user tables shadowing core ones by id. */
	tableStore: TableStore | null = null;
	/** The merged core+user registry every roller reads at roll time
	 * (`plugin.tables?.get(...)`/`.all()`) — always reassigned wholesale by
	 * `refreshRegistry()`, never mutated in place, so consumers that read it
	 * fresh on each roll (never captured at construction) pick up rebuilds
	 * automatically. */
	tables: TableRegistry | null = null;
	/** One long-lived, unseeded generator reused for every UI roll (tests
	 * build their own seeded one via `createRng(seed)` for determinism). */
	rng: () => number = createRng();

	async onload(): Promise<void> {
		// onload is a budget: settings, commands, views, post-processors only.
		await this.loadPersisted();
		this.addSettingTab(new LazyCampaignPluginSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_LAZY, (leaf) => new LazyCampaignView(leaf, this));

		this.addRibbonIcon("castle", "Open Lazy GM's campaign manager", () => {
			void this.openView("home");
		});

		this.addCommand({
			id: "open",
			// Store rule: command names must NOT include the plugin name (the UI
			// already shows it) — obsidianmd/commands/no-plugin-name-in-command-name.
			name: "Open view",
			callback: () => {
				void this.openView("home");
			},
		});

		this.addCommand({
			id: "create-campaign",
			name: "Create campaign",
			callback: () => {
				new CreateCampaignModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "new-session",
			name: "New session",
			checkCallback: (checking) => {
				const campaign = this.activeCampaign();
				if (!campaign) return false;
				if (!checking) void this.createSessionAndOpen(campaign);
				return true;
			},
		});

		this.addCommand({
			id: "roll-table",
			name: "Roll on a table",
			checkCallback: (checking) => {
				if (!this.tables) return false;
				if (!checking) new RollTableSuggestModal(this.app, this).open();
				return true;
			},
		});

		this.addCommand({
			id: "create-starter-campaign",
			name: "Create starter campaign",
			callback: () => {
				void this.createStarterCampaignAndOpen();
			},
		});

		this.addCommand({
			id: "create-demo-campaign",
			name: "Create demo campaign",
			callback: () => {
				void (async () => {
					const created = await tryFileOp(
						() => createDemoCampaign(this.app, this.settings.campaignRoot),
						"Couldn't create the demo campaign — check the console for details."
					);
					if (!created) return;
					this.ui.lastCampaignId = created.id;
					await this.persist();
					new Notice("Demo campaign created — delete its folder to remove it.");
					await this.openView("home");
				})();
			},
		});

		this.addCommand({
			id: "show-welcome",
			name: "Show welcome",
			callback: () => {
				new WelcomeModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "copy-player-recap",
			name: "Copy player recap",
			checkCallback: (checking) => {
				const campaign = this.activeCampaign();
				const store = this.store;
				if (!campaign || !store) return false;
				if (store.sessionsOf(campaign.path).length === 0) return false;
				if (!checking) void this.copyPlayerRecap(campaign);
				return true;
			},
		});

		this.addCommand({
			id: "copy-session-zero-guide",
			name: "Copy session zero guide",
			checkCallback: (checking) => {
				const campaign = this.activeCampaign();
				if (!campaign) return false;
				if (!checking) void this.copySessionZeroGuide(campaign);
				return true;
			},
		});

		this.addCommand({
			id: "copy-session-sheet",
			name: "Copy session sheet",
			checkCallback: (checking) => {
				const campaign = this.activeCampaign();
				const store = this.store;
				if (!campaign || !store) return false;
				const sessions = store.sessionsOf(campaign.path);
				if (sessions.length === 0) return false;
				if (!checking) void this.copySessionSheet(campaign, sessions);
				return true;
			},
		});

		// Anything that scans the vault or attaches vault file-event listeners
		// belongs here — vault.on("create") fires per file during startup.
		this.app.workspace.onLayoutReady(() => {
			this.store = this.addChild(new CampaignStore(this.app));
			this.tableStore = this.addChild(new TableStore(this.app, this.store));
			this.refreshRegistry();

			this.tableStore.setOnRefresh(() => {
				this.refreshRegistry();
				for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_LAZY)) {
					if (leaf.view instanceof LazyCampaignView) leaf.view.notifyTablesChanged();
				}
			});
			// The campaign store's initial scan already ran (synchronously,
			// inside its own `onload()` above) by the time `tableStore` subscribed
			// to it — this kicks the first parse of whatever table notes already
			// exist, same as any later `ensureFresh()` call from that subscription.
			void this.tableStore.ensureFresh();

			// First-run flow (docs/plan.md): shown once, ever, then replayable via
			// the command above and the Help panel's "Replay welcome" link.
			if (!this.hints.dismissed.includes("welcome")) {
				new WelcomeModal(this.app, this).open();
			}
		});
	}

	onunload(): void {
		// Never detach leaves here — Obsidian owns leaf lifecycle. The view's
		// own onClose() tears down its store subscription.
	}

	/** Shared entry for the "Create starter campaign" command and the
	 * no-campaign CTAs (Dashboard empty state, wizard step 1): builds
	 * Whitesparrow, makes it active, and lands on Home. Returns false when
	 * creation failed (`tryFileOp` has already surfaced the Notice) so the
	 * wizard knows not to close itself. */
	async createStarterCampaignAndOpen(): Promise<boolean> {
		const created = await tryFileOp(
			() => createStarterCampaign(this.app, this.settings.campaignRoot),
			"Couldn't create the starter campaign — check the console for details."
		);
		if (!created) return false;
		this.ui.lastCampaignId = created.id;
		await this.persist();
		new Notice("Whitesparrow is ready — session 1 is prepped; add your party and run it.");
		await this.openView("home");
		return true;
	}

	/** The campaign to act on for global entry points (ribbon/command "New
	 * session"): the last one the GM looked at, falling back to the first
	 * campaign alphabetically. Null when the store isn't ready yet or there
	 * are no campaigns. */
	activeCampaign(): CampaignModel | null {
		const store = this.store;
		if (!store) return null;
		const campaigns = store.campaigns();
		if (campaigns.length === 0) return null;
		const remembered = this.ui.lastCampaignId
			? campaigns.find((c) => c.id === this.ui.lastCampaignId)
			: undefined;
		return remembered ?? campaigns[0] ?? null;
	}

	async createSessionAndOpen(campaign: CampaignModel): Promise<void> {
		const store = this.store;
		if (!store) return;

		const file = await tryFileOp(
			() => createNextSession(this.app, this.settings, campaign, store),
			"Couldn't create the session note — check the console for details."
		);
		if (!file) return;

		const leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(file);
	}

	/** The "Copy session sheet" command's global entry point (Prep's toolbar
	 * overflow action calls the pure builder directly, since it already has the
	 * open session's cached body in hand) — resolves the same "current
	 * session" Run mode and the Generators panel use: whichever session Prep
	 * has selected, falling back to the latest. */
	async copySessionSheet(campaign: CampaignModel, sessions: SessionModel[]): Promise<void> {
		const target = sessions.find((s) => s.path === this.ui.lastSessionPath) ?? sessions[0];
		const file = this.app.vault.getFileByPath(target.path);
		if (!(file instanceof TFile)) return;

		const body = await this.app.vault.cachedRead(file);
		const sheet = buildSessionSheet(campaign.name, target, body);
		const copied = await tryFileOp(
			() => navigator.clipboard.writeText(sheet),
			"Couldn't copy the session sheet to the clipboard."
		);
		if (copied !== null) new Notice("Session sheet copied.");
	}

	/** The player-facing recap export (docs/plan.md M15): every played
	 * session's `## Recap` + revealed secrets only — the pure builder
	 * (`sessions/recap-export.ts`) excludes everything else by construction. */
	async copyPlayerRecap(campaign: CampaignModel): Promise<void> {
		const store = this.store;
		if (!store) return;

		const sessions = store.sessionsOf(campaign.path);
		const sources = [];
		for (const session of sessions) {
			const file = this.app.vault.getFileByPath(session.path);
			if (!(file instanceof TFile)) continue;
			sources.push({ session, body: await this.app.vault.cachedRead(file) });
		}

		const recap = buildPlayerRecap(campaign.name, sources);
		if (recap === null) {
			new Notice("Nothing played yet — recaps come from ended sessions.");
			return;
		}
		const copied = await tryFileOp(
			() => navigator.clipboard.writeText(recap),
			"Couldn't copy the recap to the clipboard."
		);
		if (copied !== null) new Notice("Player recap copied — unrevealed secrets stayed home.");
	}

	/** The session-zero one-page guide export (docs/plan.md M15): pitch +
	 * truths + expectations + lines/veils as a hand-to-players note. */
	async copySessionZeroGuide(campaign: CampaignModel): Promise<void> {
		const campaignFile = this.app.vault.getFileByPath(campaign.path);
		if (!(campaignFile instanceof TFile)) return;
		const campaignBody = await this.app.vault.cachedRead(campaignFile);

		const zero = this.store?.sessionZeroOf(campaign.path) ?? null;
		let sessionZero: { lines: readonly string[]; veils: readonly string[]; body: string } | undefined;
		if (zero) {
			const zeroFile = this.app.vault.getFileByPath(zero.path);
			if (zeroFile instanceof TFile) {
				sessionZero = { lines: zero.lines, veils: zero.veils, body: await this.app.vault.cachedRead(zeroFile) };
			}
		}

		const guide = buildSessionZeroGuide({ campaignName: campaign.name, campaignBody, sessionZero });
		if (guide === null) {
			new Notice("Nothing to hand out yet — write a pitch or some truths first.");
			return;
		}
		const copied = await tryFileOp(
			() => navigator.clipboard.writeText(guide),
			"Couldn't copy the guide to the clipboard."
		);
		if (copied !== null) new Notice("Session zero guide copied.");
	}

	/** Rebuild `this.tables` from `CORE_TABLES` + whatever `tableStore` has
	 * currently parsed — the single seam every registry rebuild goes through
	 * (initial build and every later table-store invalidation alike). The
	 * feature gates live here rather than in `CORE_TABLES` so a toggle takes
	 * effect on the next rebuild without touching pure content: `solo5e`
	 * gates the solo oracle tables, `dnd5e` gates the stress tables (5e
	 * mechanics + the consent-sensitive horror framing belong to that module). */
	refreshRegistry(): void {
		const core = [
			...CORE_TABLES,
			...(featureEnabled(this.settings, "solo5e") ? SOLO_TABLES : []),
			...(featureEnabled(this.settings, "dnd5e") ? STRESS_TABLES : []),
		];
		this.tables = buildRegistry(core, this.tableStore?.userTables() ?? []);
	}

	/** Called by the settings tab after any feature toggle: re-derive the
	 * registry (solo tables come and go with `solo5e`) and re-render open
	 * views so feature-gated UI appears/disappears without a mode switch. */
	notifyFeaturesChanged(): void {
		this.refreshRegistry();
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_LAZY)) {
			if (leaf.view instanceof LazyCampaignView) leaf.view.notifyTablesChanged();
		}
	}

	/** Single funnel to the host view: reuse the existing leaf if one is open,
	 * otherwise create it — only one instance ever (AGENTS.md). */
	async openView(mode: NavMode, subtab?: string): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_LAZY);
		const leaf: WorkspaceLeaf = existing[0] ?? this.app.workspace.getLeaf(true);
		if (existing.length === 0) {
			await leaf.setViewState({ type: VIEW_TYPE_LAZY, active: true });
		}
		await this.app.workspace.revealLeaf(leaf);

		if (leaf.view instanceof LazyCampaignView) {
			leaf.view.setMode(mode, subtab);
		}
	}

	async loadPersisted(): Promise<void> {
		const data = ((await this.loadData()) ?? {}) as Partial<PersistedData>;
		this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
		this.ui = { ...DEFAULT_UI, ...data.ui };
		this.hints = { dismissed: [...(data.hints?.dismissed ?? DEFAULT_HINTS.dismissed)] };
	}

	async persist(): Promise<void> {
		const data: PersistedData = { settings: this.settings, ui: this.ui, hints: this.hints };
		await this.saveData(data);
	}
}
