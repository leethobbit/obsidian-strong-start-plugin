import { Notice, setIcon } from "obsidian";
import { createNextSession } from "../../sessions/session-files";
import { STEPS } from "../../sessions/steps";
import { openSecrets, type DerivedSecret } from "../../sessions/carryover";
import { tryFileOp } from "../../lib/notify";
import { replaceSection, sectionContent } from "../../lib/sections";
import { readCampaignBody, writeCampaignSection } from "../../campaigns/campaign-files";
import { parseFronts, toggleFrontPortent } from "../../campaigns/fronts";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import { featureEnabled } from "../../features";
import { SESSION_ZERO_CHECKLIST } from "../../content/session-zero";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

const TOP_SECRETS_LIMIT = 3;
/** Staleness threshold: a secret carried this many sessions or more earns the
 * dashboard's "retire it or plant it somewhere obvious" nudge. */
const STALE_THRESHOLD = 3;

const RECENT_SESSIONS_LIMIT = 5;
const FRONTS_HEADING = "Fronts";

/**
 * The Home / Dashboard sub-tab (mounted by `home-panel.ts` into a container it
 * owns and reuses across re-renders). Zero-campaign empty state, a
 * next-session card, a secrets-in-play card, a fronts card (the dashboard's
 * only editable element — tapping a grim-portent pip toggles it), and a
 * recent-sessions list.
 */
export class DashboardPanel {
	/** Cached campaign-note body backing the fronts card, refetched whenever
	 * the active campaign changes — `render()` itself stays synchronous
	 * (matching every other card here), the async read just triggers one more
	 * `render()` once it resolves. */
	private frontsBody = "";
	private frontsBodyPath: string | null = null;
	private frontsBodyLoading = false;
	private frontsWriteQueue: Promise<void> = Promise.resolve();

	constructor(private readonly view: LazyCampaignView) {}

	render(container: HTMLElement, onOpenWizard: () => void): void {
		container.empty();
		const plugin = this.view.plugin;
		const campaign = plugin.activeCampaign();

		if (!campaign) {
			renderEmptyStateAction(container, this.view, {
				title: "No campaign yet",
				body: "The lazy way: a pitch, six truths, a front or two — fifteen minutes and you're ready for session zero. Or skip straight to the table with Whitesparrow, a ready-to-run village adventure.",
				ctaText: "Create your campaign",
				onCta: () => onOpenWizard(),
				secondaryText: "Start with Whitesparrow",
				onSecondary: () => void plugin.createStarterCampaignAndOpen(),
			});
			return;
		}

		const store = plugin.store;
		const sessions = store ? store.sessionsOf(campaign.path) : [];
		const latest: SessionModel | undefined = sessions[0];

		this.renderNextSessionCard(container, campaign, latest);
		this.renderSessionZeroNudge(container, campaign);
		this.renderSecretsCard(container, sessions);
		this.renderFrontsCard(container, campaign, () => this.render(container, onOpenWizard));
		this.renderRecentSessions(container, sessions);
	}

	private renderSecretsCard(container: HTMLElement, sessions: SessionModel[]): void {
		const inPlay = openSecrets(sessions).filter((d) => d.state === "in-play");

		const card = container.createDiv({ cls: "strong-start-card" });
		const heading = card.createEl("h3", { cls: "strong-start-secrets-card-heading", text: "Secrets in play" });

		const staleCount = inPlay.filter((d) => d.sessionsCarried >= STALE_THRESHOLD).length;
		if (staleCount > 0) {
			const stale = inPlay.reduce((worst, d) => (d.sessionsCarried > worst.sessionsCarried ? d : worst));
			const staleIcon = heading.createSpan({
				cls: "strong-start-secrets-card-stale",
				attr: { title: `Carried ${stale.sessionsCarried} sessions — retire it or plant it somewhere obvious.` },
			});
			setIcon(staleIcon, "hourglass");
		}

		if (inPlay.length === 0) {
			renderEmptyState(card, "No secrets in play.");
		} else {
			card.createEl("p", { text: `${inPlay.length} in play` });
			const list = card.createEl("ul", { cls: "strong-start-secrets-card-list" });
			for (const secret of topSecrets(inPlay)) {
				list.createEl("li", { cls: "strong-start-secrets-card-item", text: secret.text });
			}
		}

		const link = card.createEl("a", { cls: "strong-start-secrets-card-link", text: "All secrets →", attr: { href: "#" } });
		this.view.registerDomEvent(link, "click", (evt) => {
			evt.preventDefault();
			this.view.setMode("secrets");
		});
	}

	private renderFrontsCard(container: HTMLElement, campaign: CampaignModel, requestRerender: () => void): void {
		const card = container.createDiv({ cls: "strong-start-card" });
		card.createEl("h3", { text: "Fronts" });

		if (this.frontsBodyPath !== campaign.path) {
			if (!this.frontsBodyLoading) {
				this.frontsBodyLoading = true;
				void readCampaignBody(this.view.app, campaign.path).then((body) => {
					this.frontsBody = body;
					this.frontsBodyPath = campaign.path;
					this.frontsBodyLoading = false;
					requestRerender();
				});
			}
			renderEmptyState(card, "Loading…");
			return;
		}

		const fronts = parseFronts(sectionContent(this.frontsBody, FRONTS_HEADING));
		if (fronts.length === 0) {
			renderEmptyState(card, "Nothing to fight yet. Optimistic.");
			const link = card.createEl("a", { text: "Add a front on the foundation tab →", attr: { href: "#" } });
			this.view.registerDomEvent(link, "click", (evt) => {
				evt.preventDefault();
				this.view.setMode("home", "foundation");
			});
			return;
		}

		const list = card.createDiv({ cls: "strong-start-fronts-card-list" });
		fronts.forEach((front, frontIndex) => {
			const row = list.createDiv({ cls: "strong-start-fronts-card-row" });
			row.createSpan({ cls: "strong-start-fronts-card-name", text: front.name });

			if (front.portents.length === 0) {
				row.createSpan({ cls: "strong-start-hint", text: "No grim portents yet" });
				return;
			}

			const pips = row.createDiv({ cls: "strong-start-fronts-card-pips" });
			front.portents.forEach((portent, portentIndex) => {
				const pip = pips.createEl("button", {
					cls: `strong-start-fronts-pip${portent.done ? " is-done" : ""}`,
					attr: { type: "button", "aria-label": portent.text, title: portent.text },
				});
				this.view.registerDomEvent(pip, "click", () => this.toggleFront(campaign, frontIndex, portentIndex, requestRerender));
			});
		});
	}

	/** Tap a grim-portent pip: docs/plan.md calls this the dashboard's only
	 * editable element. Toggles the one targeted `- [ ]`/`- [x]` line via
	 * `fronts.ts` (byte-preserving every other line) and refreshes the
	 * in-memory cache directly rather than re-reading the file back.
	 * Serialized through `frontsWriteQueue`: two quick taps otherwise both
	 * read the pre-first-write body and the second tap silently reverts the
	 * first (same lost-update race as the Foundation panel's fronts editors). */
	private toggleFront(campaign: CampaignModel, frontIndex: number, portentIndex: number, requestRerender: () => void): void {
		const task = async (): Promise<void> => {
			const raw = sectionContent(this.frontsBody, FRONTS_HEADING);
			const toggled = toggleFrontPortent(raw, frontIndex, portentIndex);
			if (toggled === raw) return;

			await writeCampaignSection(this.view.app, campaign.path, FRONTS_HEADING, toggled);
			if (this.frontsBodyPath === campaign.path) {
				this.frontsBody = replaceSection(this.frontsBody, FRONTS_HEADING, toggled);
			}
			requestRerender();
		};
		this.frontsWriteQueue = this.frontsWriteQueue.then(task, task);
	}

	private renderNextSessionCard(container: HTMLElement, campaign: CampaignModel, latest: SessionModel | undefined): void {
		const card = container.createDiv({ cls: "strong-start-card" });
		card.createEl("h3", { text: campaign.name });

		const actions = card.createDiv({ cls: "strong-start-card-action" });

		if (!latest) {
			card.createEl("p", { text: "No sessions yet." });
			const button = actions.createEl("button", { cls: "mod-cta", text: "Prep session 1" });
			this.view.registerDomEvent(button, "click", () => this.view.setMode("prep"));
			return;
		}

		if (latest.status === "prep") {
			this.renderProgressDots(card, latest);
			const continueBtn = actions.createEl("button", { cls: "mod-cta", text: "Continue prep" });
			this.view.registerDomEvent(continueBtn, "click", () => {
				// Pin the shared selection to the session this card describes —
				// Prep otherwise keeps whatever its dropdown last had open,
				// which may be an older session the GM was revisiting.
				this.view.plugin.ui.lastSessionPath = latest.path;
				void this.view.plugin.persist();
				this.view.setMode("prep");
			});
		} else {
			card.createEl("p", { text: `Session ${latest.session} — Played` });
			const nextBtn = actions.createEl("button", { cls: "mod-cta", text: `Prep session ${latest.session + 1}` });
			this.view.registerDomEvent(nextBtn, "click", () => void this.prepNextSession(campaign));
		}

		const openBtn = actions.createEl("button", { text: "Open note" });
		this.view.registerDomEvent(openBtn, "click", () => void this.openSessionNote(latest.path));
	}

	/** A quiet secondary line under the next-session card, linking to the
	 * Home / Session zero sub-tab — only while a session-zero note exists and
	 * is incomplete (docs/plan.md M9). Skipped entirely once it's done or
	 * absent, and when the `session-zero` feature is switched off. */
	private renderSessionZeroNudge(container: HTMLElement, campaign: CampaignModel): void {
		if (!featureEnabled(this.view.plugin.settings, "session-zero")) return;

		const zero = this.view.plugin.store?.sessionZeroOf(campaign.path) ?? null;
		if (!zero) return;

		const total = SESSION_ZERO_CHECKLIST.length;
		const done = zero.done.filter((id) => SESSION_ZERO_CHECKLIST.some((item) => item.id === id)).length;
		if (done >= total) return;

		const line = container.createDiv({ cls: "strong-start-session-zero-nudge" });
		const link = line.createEl("a", { text: `Session zero: ${done} of ${total} →`, attr: { href: "#" } });
		this.view.registerDomEvent(link, "click", (evt) => {
			evt.preventDefault();
			this.view.setMode("home", "session-zero");
		});
	}

	private renderProgressDots(card: HTMLElement, session: SessionModel): void {
		const dots = card.createDiv({ cls: "strong-start-progress-dots" });
		for (const step of STEPS) {
			const done = session.stepsDone.includes(step.id);
			dots.createSpan({
				cls: `strong-start-progress-dot${done ? " is-done" : ""}`,
				attr: { "aria-label": step.shortLabel },
			});
		}
	}

	private renderRecentSessions(container: HTMLElement, sessions: SessionModel[]): void {
		const card = container.createDiv({ cls: "strong-start-card" });
		card.createEl("h3", { text: "Recent sessions" });

		if (sessions.length === 0) {
			renderEmptyState(card, "No sessions yet.");
			return;
		}

		const list = card.createEl("ul", { cls: "strong-start-session-list" });
		for (const session of sessions.slice(0, RECENT_SESSIONS_LIMIT)) {
			const item = list.createEl("li");
			const label = session.status === "played" ? "Played" : "In prep";
			const link = item.createEl("a", {
				cls: "strong-start-session-link",
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
