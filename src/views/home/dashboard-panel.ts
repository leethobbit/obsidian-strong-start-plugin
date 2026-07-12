import { Notice, setIcon } from "obsidian";
import { createNextSession } from "../../sessions/session-files";
import { STEPS } from "../../sessions/steps";
import { openSecrets, type DerivedSecret } from "../../sessions/carryover";
import { tryFileOp } from "../../lib/notify";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import { CreateCampaignModal } from "../../campaigns/create-campaign";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

const TOP_SECRETS_LIMIT = 3;
/** Staleness threshold: a secret carried this many sessions or more earns the
 * dashboard's "retire it or plant it somewhere obvious" nudge. */
const STALE_THRESHOLD = 3;

const RECENT_SESSIONS_LIMIT = 5;

/**
 * The Home / Dashboard sub-tab. Zero-campaign empty state, a next-session
 * card, a secrets-in-play card, and a recent-sessions list. Kept honest —
 * fronts/party cards land in later milestones once those note types exist.
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
		this.renderSecretsCard(sessions);
		this.renderRecentSessions(sessions);
	}

	private renderSecretsCard(sessions: SessionModel[]): void {
		const inPlay = openSecrets(sessions).filter((d) => d.state === "in-play");

		const card = this.containerEl.createDiv({ cls: "lazy-campaign-card" });
		const heading = card.createEl("h3", { cls: "lazy-campaign-secrets-card-heading", text: "Secrets in play" });

		const staleCount = inPlay.filter((d) => d.sessionsCarried >= STALE_THRESHOLD).length;
		if (staleCount > 0) {
			const stale = inPlay.reduce((worst, d) => (d.sessionsCarried > worst.sessionsCarried ? d : worst));
			const staleIcon = heading.createSpan({
				cls: "lazy-campaign-secrets-card-stale",
				attr: { title: `Carried ${stale.sessionsCarried} sessions — retire it or plant it somewhere obvious.` },
			});
			setIcon(staleIcon, "hourglass");
		}

		if (inPlay.length === 0) {
			renderEmptyState(card, "No secrets in play.");
		} else {
			card.createEl("p", { text: `${inPlay.length} in play` });
			const list = card.createEl("ul", { cls: "lazy-campaign-secrets-card-list" });
			for (const secret of topSecrets(inPlay)) {
				list.createEl("li", { cls: "lazy-campaign-secrets-card-item", text: secret.text });
			}
		}

		const link = card.createEl("a", { cls: "lazy-campaign-secrets-card-link", text: "All secrets →", attr: { href: "#" } });
		this.view.registerDomEvent(link, "click", (evt) => {
			evt.preventDefault();
			this.view.setMode("secrets");
		});
	}

	private renderNextSessionCard(campaign: CampaignModel, latest: SessionModel | undefined): void {
		const card = this.containerEl.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: campaign.name });

		const actions = card.createDiv({ cls: "lazy-campaign-card-action" });

		if (!latest) {
			card.createEl("p", { text: "No sessions yet." });
			const button = actions.createEl("button", { cls: "mod-cta", text: "Prep session 1" });
			this.view.registerDomEvent(button, "click", () => this.view.setMode("prep"));
			return;
		}

		if (latest.status === "prep") {
			this.renderProgressDots(card, latest);
			const continueBtn = actions.createEl("button", { cls: "mod-cta", text: "Continue prep" });
			this.view.registerDomEvent(continueBtn, "click", () => this.view.setMode("prep"));
		} else {
			card.createEl("p", { text: `Session ${latest.session} — Played` });
			const nextBtn = actions.createEl("button", { cls: "mod-cta", text: `Prep session ${latest.session + 1}` });
			this.view.registerDomEvent(nextBtn, "click", () => void this.prepNextSession(campaign));
		}

		const openBtn = actions.createEl("button", { text: "Open note" });
		this.view.registerDomEvent(openBtn, "click", () => void this.openSessionNote(latest.path));
	}

	private renderProgressDots(card: HTMLElement, session: SessionModel): void {
		const dots = card.createDiv({ cls: "lazy-campaign-progress-dots" });
		for (const step of STEPS) {
			const done = session.stepsDone.includes(step.id);
			dots.createSpan({
				cls: `lazy-campaign-progress-dot${done ? " is-done" : ""}`,
				attr: { "aria-label": step.shortLabel },
			});
		}
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

	/** "Prep session N+1" (latest session already played) — create the next
	 * session and jump straight to the board, rather than the raw note. */
	private async prepNextSession(campaign: CampaignModel): Promise<void> {
		const plugin = this.view.plugin;
		const store = plugin.store;
		if (!store) return;

		const file = await tryFileOp(
			() => createNextSession(this.view.app, plugin.settings, campaign, store),
			"Couldn't create the session note — check the console for details."
		);
		if (!file) return;
		this.view.setMode("prep");
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

/** Top N in-play secrets for the dashboard card, most-carried (stalest)
 * first, so the ones most worth a GM's attention surface without a click
 * through to the full ledger. */
function topSecrets(inPlay: readonly DerivedSecret[]): DerivedSecret[] {
	return [...inPlay].sort((a, b) => b.sessionsCarried - a.sessionsCarried || a.originSession - b.originSession).slice(0, TOP_SECRETS_LIMIT);
}
