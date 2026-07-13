import { DropdownComponent, ItemView, Menu, setIcon, TFile, type WorkspaceLeaf } from "obsidian";
import type LazyCampaignPlugin from "../../main";
import { RenameCampaignModal, setCampaignStatus } from "../campaigns/campaign-actions";
import { tryFileOp } from "../lib/notify";
import { isPhone } from "../lib/platform";
import { RollTableSuggestModal } from "./tables/roll-table-modal";
import { DESTINATIONS, type NavDestination, type NavGroup, type NavMode } from "./nav-model";
import { PhoneShell } from "./phone/phone-shell";
import { openMoreSheet } from "./phone/more-sheet";
import { KeyboardWatcher } from "./phone/keyboard-watch";
import { HomePanel, type HomeSubtab } from "./home/home-panel";
import { PrepPanel } from "./prep/prep-panel";
import { RunPanel } from "./run/run-panel";
import { TablesPanel } from "./tables/tables-panel";
import { SecretsPanel } from "./secrets/secrets-panel";
import { HelpPanel } from "./help-panel";

export const VIEW_TYPE_LAZY = "lazy-campaign";

interface Panel {
	/** `changedPaths` is only passed on a campaign-store notification (never
	 * on a fresh mount/mode switch) — see `prep/prep-panel.ts` for the panel
	 * that actually uses it (self-write/focus-preserve gating). Panels that
	 * don't care can keep the parameterless `render(): void` signature. */
	render(changedPaths?: ReadonlySet<string>): void;
}

const RAIL_GROUP_ORDER: readonly NavGroup[] = ["hub", "pipeline", "insight"];

const HOME_SUBTABS: readonly HomeSubtab[] = ["dashboard", "sessions", "world", "foundation", "session-zero"];

function isHomeSubtab(value: string | undefined): value is HomeSubtab {
	return HOME_SUBTABS.some((s) => s === value);
}

/**
 * The single host view. Every surface is a panel swapped inside this view,
 * driven by `nav-model.ts` — never add a second view type (AGENTS.md).
 */
export class LazyCampaignView extends ItemView {
	readonly plugin: LazyCampaignPlugin;

	private mode: NavMode = "home";
	private railEl!: HTMLElement;
	private headerEl!: HTMLElement;
	private bodyEl!: HTMLElement;
	/** Phone bottom-bar chrome (docs/plan.md M12) — only mounted on phones;
	 * null on desktop/tablet, where the icon rail stays. */
	private phone: PhoneShell | null = null;
	private readonly panels = new Map<NavMode, { el: HTMLElement; panel: Panel }>();
	private unsubscribe: (() => void) | null = null;
	/** Set alongside `panels.get("home")` in `buildPanels()` — the header's
	 * "New campaign…" dropdown option needs to reach past the `Panel`
	 * interface to open the wizard, not just re-render. */
	private homePanel: HomePanel | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: LazyCampaignPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_LAZY;
	}

	getDisplayText(): string {
		return "Lazy GM's campaign manager";
	}

	getIcon(): string {
		return "castle";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("lazy-campaign-view");

		this.railEl = this.contentEl.createDiv({ cls: "lazy-campaign-rail" });
		const main = this.contentEl.createDiv({ cls: "lazy-campaign-main" });
		this.headerEl = main.createDiv({ cls: "lazy-campaign-header" });
		this.bodyEl = main.createDiv({ cls: "lazy-campaign-body" });

		this.buildPanels();

		// Phone shell (docs/plan.md M12): bottom bar as a sibling AFTER the
		// body (last child of main), so the body's per-render empty() can't
		// tear it down. Desktop/tablet never mount it — the rail stays.
		if (isPhone(this.app)) {
			const phone = new PhoneShell();
			this.phone = phone;
			phone.mount(main, {
				onTab: (mode) => this.setMode(mode),
				onMore: (evt) =>
					openMoreSheet(
						evt,
						(mode) => this.setMode(mode),
						() => new RollTableSuggestModal(this.app, this.plugin).open()
					),
			});
			// Keep the bar flush above Obsidian's global mobile navbar, and get
			// it out of the way while the soft keyboard is up (the keyboard
			// watcher publishes `is-keyboard-open` + the inset on contentEl).
			const watcher = new KeyboardWatcher();
			this.register(watcher.attach(this.contentEl, () => phone.alignAboveNavbar()));
			this.registerEvent(this.app.workspace.on("layout-change", () => phone.alignAboveNavbar()));
		}

		const rememberedMode = this.isNavMode(this.plugin.ui.lastMode) ? this.plugin.ui.lastMode : "home";
		this.mode = rememberedMode;
		this.renderRail();
		this.renderHeader();
		this.renderActivePanel();
		this.phone?.setActive(this.mode);
		this.phone?.alignAboveNavbar();

		// On app startup this view's onOpen runs during workspace layout
		// restore, BEFORE the plugin's onLayoutReady callback has constructed
		// the store — subscribing directly here would silently no-op and leave
		// the view frozen on its zero-campaign render until reopened. Deferring
		// through onLayoutReady covers both paths: it fires immediately when
		// the layout is already ready (manual open), and otherwise runs after
		// the plugin's own callback (registered first, in onload), so the
		// store exists either way.
		this.app.workspace.onLayoutReady(() => {
			if (!this.contentEl.isConnected) return; // view closed before the layout finished restoring
			const store = this.plugin.store;
			if (!store) return;
			this.unsubscribe = store.subscribe((changedPaths) => {
				this.renderHeader();
				this.renderActivePanel(changedPaths);
			});
			// Catch up on anything the store indexed before we subscribed.
			this.renderHeader();
			this.renderActivePanel();
		});
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	setMode(mode: NavMode, subtab?: string): void {
		this.mode = mode;
		this.plugin.ui.lastMode = mode;
		void this.plugin.persist();
		if (mode === "home" && this.homePanel && isHomeSubtab(subtab)) {
			this.homePanel.setSubtab(subtab);
		}
		this.renderRail();
		this.renderActivePanel();
		this.phone?.setActive(mode);
		this.phone?.alignAboveNavbar();
	}

	/** Obsidian calls this on every view resize/rotation — the navbar overlap
	 * changes with it, so re-measure the phone bar's lift. */
	onResize(): void {
		this.phone?.alignAboveNavbar();
	}

	/** Called by the plugin after `refreshRegistry()` rebuilds the table
	 * registry off a `TableStore` invalidation (M5) — an out-of-band
	 * re-render for the one panel whose data lives outside the campaign
	 * store's own notifications. Every other panel already re-renders off
	 * that store's `subscribe` callback. */
	notifyTablesChanged(): void {
		this.renderActivePanel();
	}

	/** Single funnel for every "no campaign yet" empty-state CTA outside
	 * Home itself (Prep/Run/Secrets/Foundation/Session zero all dead-end
	 * without this — M11 empty-state audit): jump to Home and open the
	 * campaign creation wizard in one action, same as the header's
	 * "New campaign…" dropdown option. */
	openCampaignCreation(): void {
		this.setMode("home");
		this.homePanel?.openWizard();
	}

	private isNavMode(value: string | undefined): value is NavMode {
		return DESTINATIONS.some((d) => d.mode === value);
	}

	private buildPanels(): void {
		for (const dest of DESTINATIONS) {
			const el = this.bodyEl.createDiv({ cls: "lazy-campaign-panel" });
			el.hide();
			const panel: Panel =
				dest.mode === "home"
					? (this.homePanel = new HomePanel(this, el))
					: dest.mode === "prep"
						? new PrepPanel(this, el)
						: dest.mode === "run"
							? new RunPanel(this, el)
							: dest.mode === "tables"
								? new TablesPanel(this, el)
								: dest.mode === "secrets"
										? new SecretsPanel(this, el)
										: new HelpPanel(this, el);
			this.panels.set(dest.mode, { el, panel });
		}
	}

	private renderRail(): void {
		this.railEl.empty();
		for (const group of RAIL_GROUP_ORDER) {
			const groupEl = this.railEl.createDiv({ cls: "lazy-campaign-rail-group" });
			for (const dest of DESTINATIONS.filter((d) => d.group === group)) {
				this.renderRailButton(groupEl, dest);
			}
		}
		const footerEl = this.railEl.createDiv({ cls: "lazy-campaign-rail-footer" });
		for (const dest of DESTINATIONS.filter((d) => d.group === "footer")) {
			this.renderRailButton(footerEl, dest);
		}
	}

	private renderRailButton(container: HTMLElement, dest: NavDestination): void {
		const isActive = this.mode === dest.mode;
		const button = container.createEl("button", {
			cls: `lazy-campaign-rail-button${isActive ? " is-active" : ""}`,
			attr: { "aria-label": dest.label, type: "button" },
		});
		const iconEl = button.createSpan({ cls: "lazy-campaign-rail-icon" });
		setIcon(iconEl, dest.icon);
		button.createSpan({ cls: "lazy-campaign-rail-label", text: dest.label });
		this.registerDomEvent(button, "click", () => this.setMode(dest.mode));
	}

	private renderHeader(): void {
		this.headerEl.empty();
		const plugin = this.plugin;
		const campaigns = plugin.store?.campaigns() ?? [];
		const active = plugin.activeCampaign();

		const selectorEl = this.headerEl.createDiv({ cls: "lazy-campaign-header-selector" });
		const dropdown = new DropdownComponent(selectorEl);
		for (const campaign of campaigns) {
			dropdown.addOption(campaign.path, campaign.status === "archived" ? `${campaign.name} (archived)` : campaign.name);
		}
		dropdown.addOption("__new__", "New campaign…");
		dropdown.setValue(active?.path ?? "__new__");
		dropdown.onChange((value) => {
			if (value === "__new__") {
				this.setMode("home");
				this.homePanel?.openWizard();
				return;
			}
			const campaign = campaigns.find((c) => c.path === value);
			if (!campaign) return;
			plugin.ui.lastCampaignId = campaign.id;
			void plugin.persist();
			this.renderHeader();
			this.renderActivePanel();
		});

		const menuButton = this.headerEl.createEl("button", {
			cls: "lazy-campaign-header-menu",
			attr: { "aria-label": "Campaign options", type: "button" },
		});
		setIcon(menuButton, "ellipsis");
		this.registerDomEvent(menuButton, "click", (evt) => this.showCampaignMenu(evt));
	}

	private showCampaignMenu(evt: MouseEvent): void {
		const active = this.plugin.activeCampaign();
		const menu = new Menu();

		if (active) {
			menu.addItem((item) =>
				item
					.setTitle("Rename campaign")
					.setIcon("pencil")
					.onClick(() => new RenameCampaignModal(this.app, active).open())
			);
			menu.addItem((item) =>
				item
					.setTitle(active.status === "archived" ? "Unarchive campaign" : "Archive campaign")
					.setIcon("archive")
					.onClick(() =>
						void tryFileOp(
							() => setCampaignStatus(this.app, active, active.status === "archived" ? "active" : "archived"),
							"Couldn't update the campaign — check the console for details."
						)
					)
			);
			menu.addItem((item) =>
				item
					.setTitle("Open campaign note")
					.setIcon("file-text")
					.onClick(() => {
						const file = this.app.vault.getFileByPath(active.path);
						if (file instanceof TFile) void this.app.workspace.getLeaf(true).openFile(file);
					})
			);
			menu.addSeparator();
		}

		menu.addItem((item) =>
			item
				.setTitle("New campaign…")
				.setIcon("plus")
				.onClick(() => this.openCampaignCreation())
		);
		menu.showAtMouseEvent(evt);
	}

	private renderActivePanel(changedPaths?: ReadonlySet<string>): void {
		for (const [mode, entry] of this.panels) {
			if (mode === this.mode) {
				entry.el.show();
				entry.panel.render(changedPaths);
			} else {
				entry.el.hide();
			}
		}
	}
}
