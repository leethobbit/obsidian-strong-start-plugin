import { DropdownComponent, ItemView, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type LazyCampaignPlugin from "../../main";
import { DESTINATIONS, type NavDestination, type NavGroup, type NavMode } from "./nav-model";
import { renderEmptyState } from "./panel-kit";
import { DashboardPanel } from "./home/dashboard-panel";
import { PrepPanel } from "./prep/prep-panel";
import { RunPanel } from "./run/run-panel";
import { TablesPanel } from "./tables/tables-panel";
import { SecretsPanel } from "./secrets/secrets-panel";
import { CreateCampaignModal } from "../campaigns/create-campaign";

export const VIEW_TYPE_LAZY = "lazy-campaign";

interface Panel {
	/** `changedPaths` is only passed on a campaign-store notification (never
	 * on a fresh mount/mode switch) — see `prep/prep-panel.ts` for the panel
	 * that actually uses it (self-write/focus-preserve gating). Panels that
	 * don't care can keep the parameterless `render(): void` signature. */
	render(changedPaths?: ReadonlySet<string>): void;
}

/** Sentence-case, honest "not yet" panel for every destination beyond the M1
 * dashboard. Replaced with the real panel as each milestone lands. */
class PlaceholderPanel implements Panel {
	constructor(
		private readonly containerEl: HTMLElement,
		private readonly label: string
	) {}

	render(): void {
		this.containerEl.empty();
		renderEmptyState(this.containerEl, `${this.label} is coming in a later milestone.`);
	}
}

const RAIL_GROUP_ORDER: readonly NavGroup[] = ["hub", "pipeline", "insight"];

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
	private readonly panels = new Map<NavMode, { el: HTMLElement; panel: Panel }>();
	private unsubscribe: (() => void) | null = null;

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

		const rememberedMode = this.isNavMode(this.plugin.ui.lastMode) ? this.plugin.ui.lastMode : "home";
		this.mode = rememberedMode;
		this.renderRail();
		this.renderHeader();
		this.renderActivePanel();

		const store = this.plugin.store;
		if (store) {
			this.unsubscribe = store.subscribe((changedPaths) => {
				this.renderHeader();
				this.renderActivePanel(changedPaths);
			});
		}
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	setMode(mode: NavMode, _subtab?: string): void {
		// M1: sub-tabs (Home > Foundation/Session zero, Tables > Generators)
		// aren't implemented yet, so `_subtab` is accepted but unused for now.
		this.mode = mode;
		this.plugin.ui.lastMode = mode;
		void this.plugin.persist();
		this.renderRail();
		this.renderActivePanel();
	}

	/** Called by the plugin after `refreshRegistry()` rebuilds the table
	 * registry off a `TableStore` invalidation (M5) — an out-of-band
	 * re-render for the one panel whose data lives outside the campaign
	 * store's own notifications. Every other panel already re-renders off
	 * that store's `subscribe` callback. */
	notifyTablesChanged(): void {
		this.renderActivePanel();
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
					? new DashboardPanel(this, el)
					: dest.mode === "prep"
						? new PrepPanel(this, el)
						: dest.mode === "run"
							? new RunPanel(this, el)
							: dest.mode === "tables"
								? new TablesPanel(this, el)
								: dest.mode === "secrets"
										? new SecretsPanel(this, el)
										: new PlaceholderPanel(el, dest.label);
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
		setIcon(button, dest.icon);
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
			dropdown.addOption(campaign.path, campaign.name);
		}
		dropdown.addOption("__new__", "New campaign…");
		dropdown.setValue(active?.path ?? "__new__");
		dropdown.onChange((value) => {
			if (value === "__new__") {
				new CreateCampaignModal(this.app, plugin).open();
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
		this.registerDomEvent(menuButton, "click", () => {
			// M1 stub — rename/archive land in a later milestone.
			new Notice("Campaign options are coming in a later milestone.");
		});
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
