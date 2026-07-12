import { DashboardPanel } from "./dashboard-panel";
import { FoundationPanel } from "./foundation-panel";
import { SessionZeroPanel } from "./session-zero-panel";
import { CampaignWizardPanel } from "./campaign-wizard";
import { featureEnabled } from "../../features";
import type { LazyCampaignView } from "../lazy-view";

export type HomeSubtab = "dashboard" | "foundation" | "session-zero";

const SUBTABS: readonly { id: HomeSubtab; label: string }[] = [
	{ id: "dashboard", label: "Dashboard" },
	{ id: "foundation", label: "Foundation" },
	{ id: "session-zero", label: "Session zero" },
];

function toggleShown(el: HTMLElement, shown: boolean): void {
	if (shown) el.show();
	else el.hide();
}

/**
 * The Home destination: a Dashboard/Foundation/Session zero sub-tab strip
 * (mirrors `tables-panel.ts`'s Roll/Generators strip) that swaps between
 * fixed, reused child containers — never tearing down the active sub-tab's
 * DOM on an unrelated campaign-store notification, which is what lets
 * `FoundationPanel` do its own focus-preserving rebuilds. The guided campaign
 * creation wizard (docs/plan.md M8) replaces this whole body while active,
 * full-screen-within-Home rather than a modal; it's deliberately unaffected
 * by store notifications (nothing it shows reads other notes) so no
 * focus-preserve machinery is needed there.
 */
export class HomePanel {
	private subtab: HomeSubtab = "dashboard";
	private wizardActive = false;
	private wizard: CampaignWizardPanel | null = null;
	private mounted = false;

	private shellEl!: HTMLElement;
	private subtabRowEl!: HTMLElement;
	private dashboardEl!: HTMLElement;
	private foundationEl!: HTMLElement;
	private sessionZeroEl!: HTMLElement;
	private wizardEl!: HTMLElement;

	private readonly dashboard: DashboardPanel;
	private readonly foundation: FoundationPanel;
	private readonly sessionZero: SessionZeroPanel;

	constructor(
		private readonly view: LazyCampaignView,
		private readonly containerEl: HTMLElement
	) {
		this.dashboard = new DashboardPanel(view);
		this.foundation = new FoundationPanel(view);
		this.sessionZero = new SessionZeroPanel(view);
	}

	render(changedPaths?: ReadonlySet<string>): void {
		this.ensureMounted();

		// The sub-tab button is hidden entirely when the feature is off
		// (session-zero-panel.ts has its own defensive fallback besides) — bounce
		// back to Dashboard if a stale `ui.lastMode` or stray command left the
		// panel pointed at a now-hidden tab.
		if (this.subtab === "session-zero" && !featureEnabled(this.view.plugin.settings, "session-zero")) {
			this.subtab = "dashboard";
		}

		this.renderSubtabRow();

		const showWizard = this.wizardActive;
		// Hide the whole shell, not just its children — the shell/body divs
		// keep their layout height otherwise, pinning the wizard to the bottom.
		toggleShown(this.shellEl, !showWizard);
		toggleShown(this.subtabRowEl, !showWizard);
		toggleShown(this.wizardEl, showWizard);
		toggleShown(this.dashboardEl, !showWizard && this.subtab === "dashboard");
		toggleShown(this.foundationEl, !showWizard && this.subtab === "foundation");
		toggleShown(this.sessionZeroEl, !showWizard && this.subtab === "session-zero");

		if (showWizard) {
			// The wizard ignores store notifications outright — nothing on it
			// reads another note's state, so a fresh mount (changedPaths
			// undefined) is the only time it needs to (re)build its DOM.
			if (changedPaths === undefined) this.wizard?.render(this.wizardEl);
			return;
		}

		if (this.subtab === "dashboard") this.dashboard.render(this.dashboardEl, () => this.openWizard());
		if (this.subtab === "foundation") this.foundation.render(this.foundationEl, changedPaths);
		if (this.subtab === "session-zero") this.sessionZero.render(this.sessionZeroEl, changedPaths);
	}

	setSubtab(subtab: HomeSubtab): void {
		this.subtab = subtab;
		this.wizardActive = false;
		this.render();
	}

	openWizard(): void {
		this.wizardActive = true;
		if (!this.wizard) {
			this.wizard = new CampaignWizardPanel(this.view, {
				onCancel: () => this.closeWizard(),
				onCreated: () => this.closeWizard(),
			});
		}
		this.render();
	}

	private closeWizard(): void {
		this.wizardActive = false;
		this.wizard = null;
		this.subtab = "dashboard";
		this.render();
	}

	private ensureMounted(): void {
		if (this.mounted) return;
		this.mounted = true;

		this.containerEl.empty();
		const shell = this.containerEl.createDiv({ cls: "lazy-campaign-home-shell" });
		this.shellEl = shell;
		// Reuses the Tables panel's Roll/Generators sub-tab strip styling
		// verbatim (docs/plan.md: "mirror how tables-panel.ts did its internal
		// ... strip") rather than duplicating the same CSS under a new name.
		this.subtabRowEl = shell.createDiv({ cls: "lazy-campaign-tables-subtabs" });
		const body = shell.createDiv({ cls: "lazy-campaign-home-body" });
		this.dashboardEl = body.createDiv();
		this.foundationEl = body.createDiv();
		this.sessionZeroEl = body.createDiv();
		this.wizardEl = this.containerEl.createDiv({ cls: "lazy-campaign-home-wizard-mount" });
	}

	private renderSubtabRow(): void {
		this.subtabRowEl.empty();
		const settings = this.view.plugin.settings;
		for (const tab of SUBTABS) {
			if (tab.id === "session-zero" && !featureEnabled(settings, "session-zero")) continue;
			const btn = this.subtabRowEl.createEl("button", {
				cls: `lazy-campaign-tables-subtab${this.subtab === tab.id && !this.wizardActive ? " is-active" : ""}`,
				text: tab.label,
				attr: { type: "button" },
			});
			this.view.registerDomEvent(btn, "click", () => this.setSubtab(tab.id));
		}
	}
}
