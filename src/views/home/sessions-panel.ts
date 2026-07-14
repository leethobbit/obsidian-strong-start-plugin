// Obsidian glue — the Home / Sessions sub-tab (docs/plan.md M13): every
// session of the active campaign at a glance (number, title, date, status,
// recap presence), where the dashboard's "recent sessions" card only shows the
// latest five. Read-mostly: the only mutations here are the row menu's rename
// (title is free text per SCHEMA.md — the session number is the stable key)
// and jump-offs into Prep/Run.

import { Menu, Notice, setIcon, TFile, type App } from "obsidian";
import { FormModal } from "../../lib/form-modal";
import { textField } from "../../lib/form-fields";
import { tryFileOp } from "../../lib/notify";
import { isIsoDate } from "../../lib/date";
import { beginSelfWrite } from "../../lib/self-write";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { toSessionFm, writeSessionFm } from "../../sessions/session-schema";
import { renameSessionNote } from "../../sessions/session-files";
import { renderEmptyState, renderEmptyStateAction } from "../panel-kit";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

export class SessionsPanel {
	constructor(private readonly view: LazyCampaignView) {}

	render(containerEl: HTMLElement): void {
		containerEl.empty();
		const plugin = this.view.plugin;
		const campaign = plugin.activeCampaign();

		if (!campaign) {
			renderEmptyStateAction(containerEl, this.view, {
				title: "No campaign yet",
				body: "The lazy way: a pitch, six truths, a front or two — fifteen minutes and you're ready for session zero.",
				ctaText: "Create your campaign",
				onCta: () => this.view.openCampaignCreation(),
			});
			return;
		}

		const sessions = plugin.store?.sessionsOf(campaign.path) ?? [];
		const card = containerEl.createDiv({ cls: "strong-start-card" });
		card.createEl("h3", { text: "Sessions" });

		if (sessions.length === 0) {
			renderEmptyState(card, "No sessions yet — the prep board starts session 1.");
			return;
		}

		const list = card.createDiv({ cls: "strong-start-session-list" });
		for (const session of sessions) this.renderRow(list, session);
	}

	private renderRow(list: HTMLElement, session: SessionModel): void {
		const row = list.createDiv({ cls: "strong-start-session-row" });

		const title = row.createDiv({ cls: "strong-start-session-row-title" });
		title.createSpan({ cls: "strong-start-session-row-number", text: `Session ${session.session}` });
		// The filename is free text — show it only when the GM actually gave
		// the session a title beyond the default "Session N".
		const basename = baseNameOf(session.path);
		if (basename !== `Session ${session.session}`) {
			title.createSpan({ cls: "strong-start-session-row-name", text: ` — ${basename}` });
		}

		const meta = row.createDiv({ cls: "strong-start-session-row-meta" });
		if (session.date) meta.createSpan({ text: session.date });
		meta.createSpan({
			cls: `strong-start-session-status is-${session.status}`,
			text: session.status === "played" ? "Played" : "Prep",
		});
		if (session.status === "played") {
			meta.createSpan({
				cls: "strong-start-session-recap",
				text: this.hasRecap(session.path) ? "Recap ✓" : "No recap",
			});
		}

		const menuBtn = row.createEl("button", {
			cls: "strong-start-icon-button",
			attr: { "aria-label": "Session actions", type: "button" },
		});
		setIcon(menuBtn, "ellipsis");
		this.view.registerDomEvent(menuBtn, "click", (evt) => this.showRowMenu(evt, session));

		this.view.registerDomEvent(row, "click", (evt) => {
			if (evt.target instanceof Node && menuBtn.contains(evt.target)) return;
			this.jumpTo(session, "prep");
		});
	}

	/** Recap presence straight off the heading cache — never a body read; the
	 * scaffold doesn't include `## Recap`, the end-session flow appends it. */
	private hasRecap(path: string): boolean {
		const app: App = this.view.app;
		const file = app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return false;
		const headings = app.metadataCache.getFileCache(file)?.headings ?? [];
		return headings.some((h) => h.level === 2 && h.heading.toLowerCase() === "recap");
	}

	private showRowMenu(evt: MouseEvent, session: SessionModel): void {
		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle("Continue prep")
				.setIcon("list-checks")
				.onClick(() => this.jumpTo(session, "prep"))
		);
		menu.addItem((item) =>
			item
				.setTitle("Run this session")
				.setIcon("play")
				.onClick(() => this.jumpTo(session, "run"))
		);
		menu.addItem((item) =>
			item
				.setTitle("Edit date")
				.setIcon("calendar")
				.onClick(() => new EditSessionDateModal(this.view.app, session).open())
		);
		menu.addItem((item) =>
			item
				.setTitle("Rename session note")
				.setIcon("pencil")
				.onClick(() => new RenameSessionModal(this.view.app, session).open())
		);
		menu.addItem((item) =>
			item
				.setTitle("Open note")
				.setIcon("file-text")
				.onClick(() => {
					const file = this.view.app.vault.getFileByPath(session.path);
					if (file instanceof TFile) void this.view.app.workspace.getLeaf(true).openFile(file);
				})
		);
		menu.showAtMouseEvent(evt);
	}

	/** Same shared-selection funnel Prep/Run use (`ui.lastSessionPath`) — both
	 * panels follow it on their next render. */
	private jumpTo(session: SessionModel, mode: "prep" | "run"): void {
		this.view.plugin.ui.lastSessionPath = session.path;
		void this.view.plugin.persist();
		this.view.setMode(mode);
	}
}

function baseNameOf(path: string): string {
	const file = path.slice(path.lastIndexOf("/") + 1);
	return file.endsWith(".md") ? file.slice(0, -3) : file;
}

/** Edit the session's `date` (M17): the last session fm field without an
 * in-plugin editor. Empty clears the key ("cleared = deleted"); the session
 * NUMBER stays immutable — it's the ordering key carry-over depends on. */
class EditSessionDateModal extends FormModal {
	private date: string;

	constructor(
		app: App,
		private readonly session: SessionModel
	) {
		super(app);
		this.date = session.date ?? "";
	}

	protected render(): void {
		this.setTitle("Edit session date");
		this.contentEl.createEl("p", {
			cls: "strong-start-hint",
			text: `Session ${this.session.session} stays session ${this.session.session} — only the date changes.`,
		});

		const dateInput = textField(this.contentEl, {
			name: "Date",
			desc: "YYYY-MM-DD, or empty to clear.",
			placeholder: "2026-07-18",
			value: this.date,
			onChange: (value) => {
				this.date = value;
			},
		});
		this.registerFirstInput(dateInput);

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, {
			ctaText: "Save",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async handleSubmit(): Promise<void> {
		const value = this.date.trim();
		if (value.length > 0 && !isIsoDate(value)) {
			new Notice("Dates look like 2026-07-18 — or leave it empty to clear.");
			return;
		}

		const file = this.app.vault.getFileByPath(this.session.path);
		if (!(file instanceof TFile)) {
			new Notice("That session note couldn't be found — it may have been moved or deleted.");
			return;
		}

		// Self-write marked so an open prep panel on this session takes the
		// soft path instead of a hard rebuild (same shape as appendSessionLink).
		const next = { ...toSessionFm(this.session), date: value.length > 0 ? value : undefined };
		const done = beginSelfWrite(file.path);
		try {
			const saved = await tryFileOp(
				() => writeLazyFrontmatter(this.app, file, writeSessionFm(next)),
				"Couldn't save the date — check the console for details."
			);
			if (saved === null) return;
		} finally {
			done();
		}
		this.close();
	}
}

class RenameSessionModal extends FormModal {
	private name: string;

	constructor(
		app: App,
		private readonly session: SessionModel
	) {
		super(app);
		this.name = baseNameOf(session.path);
	}

	protected render(): void {
		this.setTitle("Rename session note");
		this.contentEl.createEl("p", {
			cls: "strong-start-hint",
			text: `The title is yours — session ${this.session.session} stays session ${this.session.session} either way.`,
		});

		const nameInput = textField(this.contentEl, {
			name: "Title",
			value: this.name,
			onChange: (value) => {
				this.name = value;
			},
		});
		this.registerFirstInput(nameInput);

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, {
			ctaText: "Rename",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async handleSubmit(): Promise<void> {
		const renamed = await tryFileOp(
			() => renameSessionNote(this.app, this.session.path, this.name.trim()),
			"Couldn't rename the session note — check the console for details."
		);
		if (renamed) this.close();
	}
}
