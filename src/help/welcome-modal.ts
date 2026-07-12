// Obsidian glue — the one-time first-run welcome modal (docs/plan.md "First-run
// flow"). Shown from `onLayoutReady` when `hints.dismissed` lacks `welcome`;
// replayable any time via the "Show welcome" command and the Help panel's
// "Replay welcome" link. Extends `Modal` directly (not `FormModal` — there's
// no form here, just a CTA) per AGENTS.md/M11 constraints.

import { Modal, setIcon, type App } from "obsidian";
import { DESTINATIONS, type NavMode } from "../views/nav-model";
import { ATTRIBUTION_TEXT, ATTRIBUTION_URL } from "../content/attribution";
import type LazyCampaignPlugin from "../../main";

const WELCOME_HINT_ID = "welcome";

/** One-line description per rail destination — kept here rather than on
 * `nav-model.ts` (pure) since it's welcome-modal-specific copy, not part of
 * the nav model itself. Footer destinations (Help) aren't shown in the grid. */
const DESTINATION_DESCRIPTIONS: Partial<Record<NavMode, string>> = {
	home: "Your campaign at a glance — dashboard, session list, foundation, and session zero.",
	prep: "The eight-step worksheet — the hero screen of the whole plugin.",
	run: "A distraction-free, at-the-table view for when players are watching.",
	secrets: "The ledger of everything carried between sessions.",
	tables: "Roll on built-in and custom tables, or fire off a generator.",
};

// `Modal` has no `Component` lifecycle (no `registerDomEvent`) — same
// documented exception `lib/form-modal.ts` notes for its own button row: the
// button and its listener are torn down together with `contentEl` on close,
// so a plain `addEventListener` here leaks nothing.
export class WelcomeModal extends Modal {
	constructor(
		app: App,
		private readonly plugin: LazyCampaignPlugin
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.empty();
		this.contentEl.addClass("lazy-campaign-welcome-modal");

		this.contentEl.createEl("h2", { text: "Prep less. Run better." });
		this.contentEl.createEl("p", {
			cls: "lazy-campaign-welcome-tagline",
			text: "Eight steps, about thirty minutes — that's the whole job.",
		});

		this.renderGrid(this.contentEl);
		this.renderAttribution(this.contentEl);

		const buttons = this.contentEl.createDiv({ cls: "lazy-campaign-welcome-buttons" });
		const cta = buttons.createEl("button", { cls: "mod-cta", text: "Get started" });
		cta.addEventListener("click", () => {
			this.close();
			void this.plugin.openView("home");
		});
	}

	onClose(): void {
		this.contentEl.empty();
		this.dismiss();
	}

	private renderGrid(container: HTMLElement): void {
		const grid = container.createDiv({ cls: "lazy-campaign-welcome-grid" });
		for (const dest of DESTINATIONS) {
			if (dest.group === "footer") continue;
			const card = grid.createDiv({ cls: "lazy-campaign-welcome-card" });
			const iconEl = card.createDiv({ cls: "lazy-campaign-welcome-card-icon" });
			setIcon(iconEl, dest.icon);
			card.createDiv({ cls: "lazy-campaign-welcome-card-label", text: dest.label });
			card.createDiv({
				cls: "lazy-campaign-welcome-card-desc",
				text: DESTINATION_DESCRIPTIONS[dest.mode] ?? "",
			});
		}
	}

	private renderAttribution(container: HTMLElement): void {
		const attribution = container.createDiv({ cls: "lazy-campaign-welcome-attribution" });
		attribution.createSpan({ text: `${ATTRIBUTION_TEXT} ` });
		attribution.createEl("a", {
			text: "Read the source document",
			href: ATTRIBUTION_URL,
			attr: { target: "_blank", rel: "noopener" },
		});
	}

	/** Idempotent — dismissing/starting both record `welcome`, and either the
	 * CTA (via `close()`) or any other close route (Escape, backdrop click,
	 * the built-in × button) ends up here through `onClose()`. */
	private dismiss(): void {
		if (this.plugin.hints.dismissed.includes(WELCOME_HINT_ID)) return;
		this.plugin.hints.dismissed = [...this.plugin.hints.dismissed, WELCOME_HINT_ID];
		void this.plugin.persist();
	}
}
