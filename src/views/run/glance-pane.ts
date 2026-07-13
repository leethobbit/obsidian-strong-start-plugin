// Obsidian glue — run mode's glance sidebar (run-screen redesign): the
// NPCs/Locations/Monsters/Rewards lists, now master-detail. Tapping a linked
// entity swaps the sidebar to a focus pane — key frontmatter fields plus the
// note body rendered as markdown — instead of yanking the GM out of run mode
// into a new leaf. Opening the raw note is still one explicit tap away in the
// detail header; plain-text entries ("6 × bandit") have no note and stay
// inert, as before.
//
// The detail survives full rebuilds (external edits re-read it fresh — the
// entity editor modal is deliberately not self-write-marked, so a pencil save
// echoes back through the store and re-renders this pane) and resets to the
// lists on session switch. Single-level: links inside the rendered body are
// ordinary Obsidian links.

import { Component, MarkdownRenderer, setIcon, TFile, type App } from "obsidian";
import { renderCollapsibleSection, renderEmptyState, type SectionState } from "../panel-kit";
import { parseBulletSection } from "../../sessions/bullet-list";
import { removeSection, sectionContent } from "../../lib/sections";
import { stripFrontmatter } from "../../lib/body-split";
import { displayText, isWikilink, tokenizeWikilinks } from "../../sessions/link-list";
import { asLazy } from "../../lib/frontmatter";
import { readNpcFm } from "../../roster/entity-schema";
import { openEntityEditor, type EntityKind } from "../home/entity-editor-modal";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

const EDITABLE_KINDS: ReadonlySet<string> = new Set<EntityKind>(["pc", "npc", "location", "quest"]);

export class GlancePane {
	private mode: { kind: "list" } | { kind: "detail"; path: string } = { kind: "list" };
	/** Bumped per detail render; async body reads bail if superseded. */
	private detailSeq = 0;
	private containerEl: HTMLElement | null = null;
	private session: SessionModel | null = null;
	private campaign: CampaignModel | null = null;
	private sessionBody = "";
	private sectionState: SectionState | null = null;
	private readonly mdBucket: Component[] = [];

	constructor(
		private readonly view: LazyCampaignView,
		private readonly openInNewLeaf: (path: string) => Promise<void>
	) {}

	/** A session switch drops the detail — it belonged to the previous list. */
	resetForSession(): void {
		this.mode = { kind: "list" };
	}

	dispose(): void {
		this.disposeMd();
		this.containerEl = null;
	}

	/** Full (re)render into the run board's glance column. Mode survives —
	 * an external-change rebuild re-reads whatever detail was open. */
	render(
		container: HTMLElement,
		session: SessionModel,
		campaign: CampaignModel,
		sessionBody: string,
		sectionState: SectionState
	): void {
		this.containerEl = container;
		this.session = session;
		this.campaign = campaign;
		this.sessionBody = sessionBody;
		this.sectionState = sectionState;
		this.rerender();
	}

	private disposeMd(): void {
		for (const component of this.mdBucket) this.view.removeChild(component);
		this.mdBucket.length = 0;
	}

	private rerender(): void {
		const container = this.containerEl;
		if (!container) return;
		this.disposeMd();
		container.empty();
		container.toggleClass("is-detail", this.mode.kind === "detail");
		if (this.mode.kind === "detail") void this.renderDetail(container, this.mode.path);
		else this.renderLists(container);
	}

	private openDetail(path: string): void {
		this.mode = { kind: "detail", path };
		this.rerender();
		// In the single-column narrow layout the glance sits below the fold —
		// bring the freshly opened detail into view.
		this.containerEl?.scrollIntoView({ block: "nearest" });
	}

	private backToLists(): void {
		this.mode = { kind: "list" };
		this.rerender();
	}

	// ---- Lists ------------------------------------------------------------

	private renderLists(container: HTMLElement): void {
		const session = this.session;
		const state = this.sectionState;
		if (!session || !state) return;

		renderCollapsibleSection(container, this.view, state, "npcs", "NPCs", (body) =>
			this.renderLinkList(body, session.npcs, session.path)
		);
		renderCollapsibleSection(container, this.view, state, "locations", "Locations", (body) =>
			this.renderLinkList(body, session.locations, session.path)
		);
		renderCollapsibleSection(container, this.view, state, "monsters", "Monsters", (body) =>
			this.renderLinkList(body, session.monsters, session.path)
		);
		renderCollapsibleSection(container, this.view, state, "rewards", "Rewards", (body) =>
			this.renderRewards(body, session.path)
		);
	}

	private renderLinkList(body: HTMLElement, items: readonly string[], sourcePath: string): void {
		if (items.length === 0) {
			renderEmptyState(body, "None yet.");
			return;
		}

		const list = body.createEl("ul", { cls: "lazy-campaign-run-glance-list" });
		for (const raw of items) {
			const item = list.createEl("li", { cls: "lazy-campaign-run-glance-item" });

			if (isWikilink(raw)) {
				const name = displayText(raw);
				const dest = this.view.app.metadataCache.getFirstLinkpathDest(name, sourcePath);
				if (dest) {
					this.renderGlanceLink(item, name, dest.path);
					const role = roleForFile(this.view.app, dest);
					if (role) item.createSpan({ cls: "lazy-campaign-run-glance-role", text: ` — ${role}` });
				} else {
					item.createSpan({ text: name });
				}
			} else {
				item.createSpan({ text: raw });
			}
		}
	}

	/** Rewards rows are prose, but inline `[[links]]` in them ("Nightculler —
	 * stashed in [[The Lost Throne]]") deserve the same focus-pane tap. */
	private renderRewards(body: HTMLElement, sourcePath: string): void {
		const rows = parseBulletSection(sectionContent(this.sessionBody, "Rewards")).rows;
		if (rows.length === 0) {
			renderEmptyState(body, "None yet.");
			return;
		}
		const list = body.createEl("ul", { cls: "lazy-campaign-run-glance-list" });
		for (const row of rows) {
			const item = list.createEl("li", { cls: "lazy-campaign-run-glance-item" });
			for (const token of tokenizeWikilinks(row)) {
				const dest =
					token.kind === "link" && token.target
						? this.view.app.metadataCache.getFirstLinkpathDest(token.target, sourcePath)
						: null;
				if (dest) this.renderGlanceLink(item, token.display, dest.path);
				else item.createSpan({ text: token.display });
			}
		}
	}

	private renderGlanceLink(item: HTMLElement, name: string, path: string): void {
		const link = item.createEl("a", { cls: "lazy-campaign-run-glance-link", text: name, attr: { href: "#" } });
		this.view.registerDomEvent(link, "click", (evt) => {
			evt.preventDefault();
			this.openDetail(path);
		});
	}

	// ---- Detail (the focus pane) -------------------------------------------

	private async renderDetail(container: HTMLElement, path: string): Promise<void> {
		const seq = ++this.detailSeq;
		const app = this.view.app;
		const file = app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) {
			// Renamed through the editor or deleted — the honest fallback.
			this.backToLists();
			return;
		}

		const lazy = asLazy(app.metadataCache.getFileCache(file)?.frontmatter);
		const type = typeof lazy?.type === "string" ? lazy.type : null;

		const header = container.createDiv({ cls: "lazy-campaign-run-entity-header" });
		const backBtn = header.createEl("button", {
			cls: "lazy-campaign-run-icon-button",
			attr: { "aria-label": "Back to session lists", type: "button" },
		});
		setIcon(backBtn, "arrow-left");
		this.view.registerDomEvent(backBtn, "click", () => this.backToLists());

		header.createDiv({ cls: "lazy-campaign-run-entity-title", text: file.basename });

		const campaign = this.campaign;
		if (campaign && type && EDITABLE_KINDS.has(type)) {
			const editBtn = header.createEl("button", {
				cls: "lazy-campaign-run-icon-button",
				attr: { "aria-label": `Edit ${file.basename}`, type: "button" },
			});
			setIcon(editBtn, "pencil");
			this.view.registerDomEvent(editBtn, "click", () =>
				void openEntityEditor(app, { kind: type as EntityKind, campaign, existingPath: path })
			);
		}

		const openBtn = header.createEl("button", {
			cls: "lazy-campaign-run-icon-button",
			attr: { "aria-label": "Open note", type: "button" },
		});
		setIcon(openBtn, "file-text");
		this.view.registerDomEvent(openBtn, "click", () => void this.openInNewLeaf(path));

		// Key fields, label muted / value not (run-mode typography rule).
		const fields: Array<{ label: string; value: string }> = [];
		if (type === "npc" && lazy) {
			const npc = readNpcFm(lazy);
			if (npc?.role) fields.push({ label: "Role", value: npc.role });
			if (npc?.location) fields.push({ label: "Location", value: displayText(npc.location) });
			if (npc?.status === "dead") fields.push({ label: "Status", value: "dead" });
		}

		const raw = await app.vault.cachedRead(file);
		if (seq !== this.detailSeq || this.containerEl !== container) return; // superseded mid-await
		let noteBody = stripFrontmatter(raw);

		if (type === "location") {
			const aspects = parseBulletSection(sectionContent(noteBody, "Aspects")).rows;
			for (const aspect of aspects) fields.push({ label: "Aspect", value: aspect });
			if (aspects.length > 0) noteBody = removeSection(noteBody, "Aspects");
		}

		if (fields.length > 0) {
			const grid = container.createDiv({ cls: "lazy-campaign-run-entity-fields" });
			for (const field of fields) {
				grid.createDiv({ cls: "lazy-campaign-run-entity-field-label", text: field.label });
				grid.createDiv({ cls: "lazy-campaign-run-entity-field-value", text: field.value });
			}
		}

		const trimmed = noteBody.trim();
		if (trimmed.length === 0 && fields.length === 0) {
			renderEmptyState(container, "Nothing on this note yet.");
			return;
		}
		if (trimmed.length > 0) {
			const bodyEl = container.createDiv({ cls: "lazy-campaign-run-entity-body" });
			const component = this.view.addChild(new Component());
			this.mdBucket.push(component);
			await MarkdownRenderer.render(app, trimmed, bodyEl, path, component);
		}
	}
}

function roleForFile(app: App, file: TFile): string | undefined {
	const cache = app.metadataCache.getFileCache(file);
	const lazy = asLazy(cache?.frontmatter);
	if (!lazy || lazy.type !== "npc") return undefined;
	return readNpcFm(lazy)?.role;
}
