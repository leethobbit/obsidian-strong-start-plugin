import { Notice, setIcon } from "obsidian";
import { openSecrets, type DerivedSecret, type SecretState } from "../../sessions/carryover";
import { archiveSecret, restoreSecret, revealSecret } from "../../sessions/secrets-ops";
import { patchSessionSecrets } from "../../sessions/session-files";
import { tryFileOp } from "../../lib/notify";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import { renderHint } from "../../help/hint";
import { RevealSecretModal } from "./reveal-secret-modal";
import type { LazyCampaignView } from "../lazy-view";

type FilterState = SecretState | "all";

const FILTER_CHIPS: ReadonlyArray<{ value: FilterState; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "in-play", label: "In play" },
	{ value: "revealed", label: "Revealed" },
	{ value: "retired", label: "Retired" },
];

const GROUP_ORDER: ReadonlyArray<{ state: SecretState; heading: string }> = [
	{ state: "in-play", heading: "In play" },
	{ state: "revealed", heading: "Revealed" },
	{ state: "retired", heading: "Retired" },
];

/**
 * The secrets ledger: the campaign-wide fold's UI home
 * (`sessions/carryover.ts` `openSecrets`). Read-mostly — a plain re-render on
 * every store notification is fine (AGENTS.md/plan.md); the only bit of state
 * worth preserving across that re-render is the text filter's current value.
 */
export class SecretsPanel {
	private filterState: FilterState = "all";
	private filterText = "";

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
				onCta: () => this.view.openCampaignCreation(),
			});
			return;
		}

		const sessions = plugin.store?.sessionsOf(campaign.path) ?? [];
		const derived = openSecrets(sessions);

		const shell = this.containerEl.createDiv({ cls: "strong-start-secrets-shell" });
		renderHint(
			shell,
			this.view,
			this.view.plugin,
			"secrets-ledger",
			"Secrets are born in prep and revealed in run mode — this is where you audit what's still floating."
		);
		this.renderStatLine(shell, derived);
		// Created in DOM order (filters row, then list) before either is
		// populated, so `renderFilters` can close over `listEl` to refresh just
		// the list on every keystroke without touching the filter input itself.
		const filtersRow = shell.createDiv({ cls: "strong-start-secrets-filters" });
		const listEl = shell.createDiv({ cls: "strong-start-secrets-list" });
		this.renderFilters(filtersRow, derived, listEl);
		this.renderList(listEl, derived);
	}

	private renderStatLine(shell: HTMLElement, derived: DerivedSecret[]): void {
		const inPlay = derived.filter((d) => d.state === "in-play").length;
		const revealed = derived.filter((d) => d.state === "revealed").length;
		const retired = derived.filter((d) => d.state === "retired").length;
		shell.createDiv({
			cls: "strong-start-secrets-stat-line",
			text: `${derived.length} secret${derived.length === 1 ? "" : "s"} · ${inPlay} in play · ${revealed} revealed · ${retired} retired`,
		});
	}

	private renderFilters(row: HTMLElement, derived: DerivedSecret[], listEl: HTMLElement): void {
		const chipsEl = row.createDiv({ cls: "strong-start-secrets-chips" });
		for (const chip of FILTER_CHIPS) {
			const btn = chipsEl.createEl("button", {
				cls: `strong-start-secrets-chip${this.filterState === chip.value ? " is-active" : ""}`,
				text: chip.label,
				attr: { type: "button" },
			});
			this.view.registerDomEvent(btn, "click", () => {
				this.filterState = chip.value;
				this.render();
			});
		}

		const textInput = row.createEl("input", {
			type: "text",
			cls: "strong-start-secrets-filter-text",
			attr: { placeholder: "Filter…", "data-key": "secrets-filter-text" },
		});
		textInput.value = this.filterText;
		this.view.registerDomEvent(textInput, "input", () => {
			this.filterText = textInput.value;
			this.renderList(listEl, derived);
		});
	}

	private renderList(listEl: HTMLElement, derived: DerivedSecret[]): void {
		listEl.empty();
		const needle = this.filterText.trim().toLowerCase();
		const filtered = derived.filter((d) => {
			if (this.filterState !== "all" && d.state !== this.filterState) return false;
			if (needle.length > 0 && !d.text.toLowerCase().includes(needle)) return false;
			return true;
		});

		if (filtered.length === 0) {
			renderEmptyState(listEl, "No secrets. Your world is suspiciously honest.");
			return;
		}

		for (const group of GROUP_ORDER) {
			const rows = filtered.filter((d) => d.state === group.state);
			if (rows.length === 0) continue;
			this.renderGroup(listEl, group.heading, rows);
		}
	}

	private renderGroup(listEl: HTMLElement, heading: string, rows: DerivedSecret[]): void {
		const groupEl = listEl.createDiv({ cls: "strong-start-secrets-group" });
		groupEl.createEl("h4", { cls: "strong-start-secrets-group-heading", text: `${heading} (${rows.length})` });

		const sorted = [...rows].sort((a, b) => b.sessionsCarried - a.sessionsCarried || a.originSession - b.originSession);
		for (const secret of sorted) {
			this.renderRow(groupEl, secret);
		}
	}

	private renderRow(groupEl: HTMLElement, secret: DerivedSecret): void {
		const row = groupEl.createDiv({
			cls: `strong-start-secrets-row${secret.state === "in-play" ? ` ${agedClass(secret)}` : ""}${
				secret.state === "retired" ? " is-retired" : ""
			}`,
		});

		const main = row.createDiv({ cls: "strong-start-secrets-row-main" });
		main.createDiv({ cls: "strong-start-secrets-row-text", text: secret.text });

		const meta = main.createDiv({ cls: "strong-start-secrets-row-meta" });
		meta.createSpan({ text: `Session ${secret.originSession}` });
		if (secret.sessionsCarried > 1) {
			meta.createSpan({ cls: "strong-start-secrets-badge", text: `carried × ${secret.sessionsCarried}` });
		}

		if (secret.state === "revealed" && secret.note) {
			main.createDiv({ cls: "strong-start-secrets-row-note", text: secret.note });
		}

		const actions = row.createDiv({ cls: "strong-start-secrets-row-actions" });

		if (secret.state === "in-play") {
			const revealBtn = actions.createEl("button", { text: "Reveal" });
			this.view.registerDomEvent(revealBtn, "click", () => this.handleReveal(secret));

			const retireBtn = actions.createEl("button", { text: "Retire" });
			this.view.registerDomEvent(retireBtn, "click", () => void this.handleRetire(secret));
		}

		if (secret.state === "retired") {
			const restoreBtn = actions.createEl("button", { text: "Restore" });
			this.view.registerDomEvent(restoreBtn, "click", () => void this.handleRestore(secret));
		}

		const openBtn = actions.createEl("button", {
			cls: "strong-start-icon-button",
			attr: { "aria-label": "Open session", type: "button" },
		});
		setIcon(openBtn, "external-link");
		this.view.registerDomEvent(openBtn, "click", () => void this.openSession(secret.authoritativeSessionPath));
	}

	private handleReveal(secret: DerivedSecret): void {
		new RevealSecretModal(this.view.app, secret.text, async (note) => {
			await tryFileOp(
				() =>
					patchSessionSecrets(this.view.app, secret.authoritativeSessionPath, (secrets) =>
						revealSecret(secrets, secret.id, note)
					),
				"Couldn't save that reveal — check the console for details."
			);
			this.render();
		}).open();
	}

	private async handleRetire(secret: DerivedSecret): Promise<void> {
		await tryFileOp(
			() => patchSessionSecrets(this.view.app, secret.authoritativeSessionPath, (secrets) => archiveSecret(secrets, secret.id)),
			"Couldn't retire that secret — check the console for details."
		);
		this.render();
	}

	private async handleRestore(secret: DerivedSecret): Promise<void> {
		await tryFileOp(
			() => patchSessionSecrets(this.view.app, secret.authoritativeSessionPath, (secrets) => restoreSecret(secrets, secret.id)),
			"Couldn't restore that secret — check the console for details."
		);
		this.render();
	}

	private async openSession(path: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
		if (!file) {
			new Notice("That session note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const leaf = this.view.app.workspace.getLeaf(true);
		await leaf.openFile(file);
	}
}

function agedClass(secret: DerivedSecret): string {
	const carriedTimes = secret.sessionsCarried - 1;
	if (carriedTimes >= 3) return "is-carried-3-plus";
	if (carriedTimes === 2) return "is-carried-2";
	if (carriedTimes === 1) return "is-carried-1";
	return "";
}
