import { Plugin, type WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, type LazyCampaignPluginSettings } from "./src/settings/settings";
import { LazyCampaignPluginSettingTab } from "./src/settings/settings-tab";
import { CampaignStore } from "./src/campaigns/campaign-store";
import { CreateCampaignModal } from "./src/campaigns/create-campaign";
import type { CampaignModel } from "./src/campaigns/types";
import { createNextSession } from "./src/sessions/session-files";
import { tryFileOp } from "./src/lib/notify";
import { createRng } from "./src/lib/rng";
import { buildRegistry, type TableRegistry } from "./src/tables/registry";
import { CORE_TABLES } from "./src/content";
import { RollTableSuggestModal } from "./src/views/tables/roll-table-modal";
import { LazyCampaignView, VIEW_TYPE_LAZY } from "./src/views/lazy-view";
import type { NavMode } from "./src/views/nav-model";

// data.json shape. Settings live under a key so future siblings (telemetry,
// caches) can be added without a migration — and so nothing ever calls
// saveData(this.settings) directly, which would wipe those siblings.
interface PersistedData {
	settings: LazyCampaignPluginSettings;
	ui: {
		lastCampaignId?: string;
		lastMode?: string;
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
	/** Core-only for now; M5 rebuilds this with `buildRegistry(CORE_TABLES,
	 * userTables)` once user tables exist — same seam, no call-site churn. */
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

		// Anything that scans the vault or attaches vault file-event listeners
		// belongs here — vault.on("create") fires per file during startup.
		this.app.workspace.onLayoutReady(() => {
			this.store = this.addChild(new CampaignStore(this.app));
			this.tables = buildRegistry(CORE_TABLES);
		});
	}

	onunload(): void {
		// Never detach leaves here — Obsidian owns leaf lifecycle. The view's
		// own onClose() tears down its store subscription.
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
