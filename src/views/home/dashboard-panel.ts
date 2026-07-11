import { Notice } from "obsidian";
import { createNextSession } from "../../sessions/session-files";
import { tryFileOp } from "../../lib/notify";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import { CreateCampaignModal } from "../../campaigns/create-campaign";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

const RECENT_SESSIONS_LIMIT = 5;

/**
 * The Home / Dashboard sub-tab. Zero-campaign empty state, a next-session
 * card, and a recent-sessions list. Kept honest for M1 — fronts/party/secrets
 * cards land in later milestones once those note types exist.
 */
export class DashboardPanel {
	constructor(
		private readonly view: LazyCampaignView,
		private readonly containerEl: HTMLElement
	) {}

	render(): void {
		this.containerEl.empty();
		const plugin = this.view.plugin;
		const campaign = plugin.activeCampaign();

		if (!campaign) {
			renderEmptyStateAction(this.containerEl, this.view, {
				title: "No campaign yet",
				body: "The lazy way: a pitch, six truths, a front or two — fifteen minutes and you're ready for session zero.",
				ctaText: "Create your campaign",
				onCta: () => new CreateCampaignModal(this.view.app, plugin).open(),
			});
			return;
		}

		const store = plugin.store;
		const sessions = store ? store.sessionsOf(campaign.path) : [];
		const latest: SessionModel | undefined = sessions[0];

		this.renderNextSessionCard(campaign, latest);
		this.renderRecentSessions(sessions);
	}

	private renderNextSessionCard(campaign: CampaignModel, latest: SessionModel | undefined): void {
		const card = this.containerEl.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: campaign.name });

		const actions = card.createDiv({ cls: "lazy-campaign-card-action" });

		if (!latest) {
			card.createEl("p", { text: "No sessions yet." });
			const button = actions.createEl("button", { cls: "mod-cta", text: "Prep session 1" });
			this.view.registerDomEvent(button, "click", () => void this.newSession(campaign));
			return;
		}

		const status = latest.status === "played" ? "Played" : "In prep";
		card.createEl("p", { text: `Session ${latest.session} — ${status}` });

		const newSessionBtn = actions.createEl("button", { cls: "mod-cta", text: "New session" });
		this.view.registerDomEvent(newSessionBtn, "click", () => void this.newSession(campaign));

		const openBtn = actions.createEl("button", { text: "Open note" });
		this.view.registerDomEvent(openBtn, "click", () => void this.openSessionNote(latest.path));
	}

	private renderRecentSessions(sessions: SessionModel[]): void {
		const card = this.containerEl.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "Recent sessions" });

		if (sessions.length === 0) {
			renderEmptyState(card, "No sessions yet.");
			return;
		}

		const list = card.createEl("ul", { cls: "lazy-campaign-session-list" });
		for (const session of sessions.slice(0, RECENT_SESSIONS_LIMIT)) {
			const item = list.createEl("li");
			const label = session.status === "played" ? "Played" : "In prep";
			const link = item.createEl("a", {
				cls: "lazy-campaign-session-link",
				text: `Session ${session.session} — ${label}`,
				attr: { href: "#" },
			});
			this.view.registerDomEvent(link, "click", (evt) => {
				evt.preventDefault();
				void this.openSessionNote(session.path);
			});
		}
	}

	private async newSession(campaign: CampaignModel): Promise<void> {
		const plugin = this.view.plugin;
		const store = plugin.store;
		if (!store) return;

		const file = await tryFileOp(
			() => createNextSession(this.view.app, plugin.settings, campaign, store),
			"Couldn't create the session note — check the console for details."
		);
		if (!file) return;
		await this.openSessionNote(file.path);
	}

	private async openSessionNote(path: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
		if (!file) {
			new Notice("That session note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const leaf = this.view.app.workspace.getLeaf(true);
		await leaf.openFile(file);
	}
}
