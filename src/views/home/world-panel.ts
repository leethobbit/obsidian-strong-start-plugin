// Obsidian glue — the Home / World sub-tab (docs/plan.md M17): every entity
// of the active campaign in one place — Party (PCs), NPCs, Locations, Quests
// — each row opening the shared entity editor, so the whole cast can be
// created and managed without ever leaving the plugin. Read-mostly like the
// Sessions sub-tab beside it: a naive full rebuild per render is fine (the
// only writes here are the quest status toggle and jump-offs into the editor
// modal, which itself lives outside the render path).

import { setIcon, TFile } from "obsidian";
import { tryFileOp } from "../../lib/notify";
import { writeLazyFrontmatter } from "../../lib/frontmatter";
import { writeQuestFm } from "../../roster/entity-schema";
import { renderCollapsibleSection, renderEmptyState, renderEmptyStateAction, SectionState } from "../panel-kit";
import { openEntityEditor, type EntityKind } from "./entity-editor-modal";
import { openMonsterBuilder } from "../../dnd5e/monster-builder-modal";
import { crLabel } from "../../dnd5e/monster-build";
import { featureEnabled } from "../../features";
import type { CampaignModel } from "../../campaigns/types";
import type { QuestNoteModel } from "../../roster/types";
import type { LazyCampaignView } from "../lazy-view";

/** The World tab's group keys: the shared-editor entity kinds plus monsters,
 * whose editor is the 5e Monster Builder modal (M18) — deliberately NOT an
 * `EntityKind` (one editor per type; the twelve-field 5e form doesn't belong
 * in the shared editor's switch). */
type WorldKind = EntityKind | "monster";

interface WorldRow {
	path: string;
	name: string;
	/** Muted one-liner under the name (player · role · Lv N, etc). */
	meta: string;
}

export class WorldPanel {
	/** Collapsed/expanded per group, surviving re-renders (panel-kit). */
	private readonly sectionState = new SectionState();

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

		const store = plugin.store;
		if (!store) return;
		const shell = containerEl.createDiv({ cls: "lazy-campaign-world-shell" });

		const pcs = store.pcsOf(campaign.path);
		this.renderGroup(shell, campaign, "pc", `Party (${pcs.length})`, "New character",
			pcs.map((pc) => ({
				path: pc.path,
				name: pc.name,
				meta: joinMeta([pc.player, pc.role, pc.level !== undefined ? `Lv ${pc.level}` : undefined]),
			})),
			"No characters yet — every chair at the table gets a note."
		);

		const npcs = store.npcNotesOf(campaign.path);
		this.renderGroup(shell, campaign, "npc", `NPCs (${npcs.length})`, "New NPC",
			npcs.map((npc) => ({
				path: npc.path,
				name: npc.name,
				meta: joinMeta([npc.role, npc.location, npc.status === "dead" ? "Dead" : undefined]),
			})),
			"No NPCs yet — the prep board's step 6 and the generators both make them."
		);

		if (featureEnabled(plugin.settings, "dnd5e")) {
			const monsters = store.monstersOf(campaign.path);
			this.renderGroup(shell, campaign, "monster", `Monsters (${monsters.length})`, "Build a monster",
				monsters.map((monster) => ({
					path: monster.path,
					name: monster.name,
					meta: joinMeta([`CR ${crLabel(monster.cr)}`, monster.role, monster.flavor]),
				})),
				"No monsters yet — build one from the CR table or a general-use stat block."
			);
		}

		const locations = store.locationNotesOf(campaign.path);
		this.renderGroup(shell, campaign, "location", `Locations (${locations.length})`, "New location",
			locations.map((location) => ({ path: location.path, name: location.name, meta: "" })),
			"No locations yet — somewhere fantastic is waiting."
		);

		const quests = store.questsOf(campaign.path);
		this.renderGroup(shell, campaign, "quest", `Quests (${quests.length})`, "New quest",
			quests.map((quest) => ({
				path: quest.path,
				name: quest.name,
				meta: quest.status === "done" ? "Done" : "Open",
			})),
			"No quests yet — the quest generator saves them here.",
			quests
		);
	}

	private renderGroup(
		shell: HTMLElement,
		campaign: CampaignModel,
		kind: WorldKind,
		label: string,
		newLabel: string,
		rows: WorldRow[],
		emptyText: string,
		quests?: QuestNoteModel[]
	): void {
		renderCollapsibleSection(shell, this.view, this.sectionState, kind, label, (body) => {
			if (rows.length === 0) {
				renderEmptyState(body, emptyText);
			} else {
				const list = body.createDiv({ cls: "lazy-campaign-world-list" });
				for (const row of rows) {
					this.renderRow(list, campaign, kind, row, quests?.find((q) => q.path === row.path));
				}
			}

			const newBtn = body.createEl("button", { cls: "lazy-campaign-world-new", text: newLabel });
			this.view.registerDomEvent(newBtn, "click", () => this.openEditor(campaign, kind));
		});
	}

	/** Route to the right editor: monsters get the 5e builder modal, everything
	 * else the shared entity editor. */
	private openEditor(campaign: CampaignModel, kind: WorldKind, existingPath?: string): void {
		if (kind === "monster") {
			const pcs = this.view.plugin.store?.pcsOf(campaign.path) ?? [];
			void openMonsterBuilder(this.view.app, {
				campaign,
				existingPath,
				partyLevels: pcs.map((pc) => pc.level).filter((level): level is number => level !== undefined),
			});
			return;
		}
		void openEntityEditor(this.view.app, { kind, campaign, existingPath });
	}

	private renderRow(list: HTMLElement, campaign: CampaignModel, kind: WorldKind, row: WorldRow, quest?: QuestNoteModel): void {
		const rowEl = list.createDiv({ cls: "lazy-campaign-world-row" });

		// Quests get a one-tap done toggle where other kinds show nothing.
		if (quest) {
			const toggle = rowEl.createEl("button", {
				cls: `lazy-campaign-world-quest-toggle${quest.status === "done" ? " is-done" : ""}`,
				attr: { type: "button", "aria-label": quest.status === "done" ? "Reopen quest" : "Mark quest done" },
			});
			setIcon(toggle, quest.status === "done" ? "check-circle" : "circle");
			this.view.registerDomEvent(toggle, "click", (evt) => {
				evt.stopPropagation();
				void this.toggleQuest(quest);
			});
		}

		const title = rowEl.createDiv({ cls: "lazy-campaign-world-row-title" });
		title.createSpan({ cls: "lazy-campaign-world-row-name", text: row.name });
		if (row.meta.length > 0) title.createSpan({ cls: "lazy-campaign-world-row-meta", text: ` — ${row.meta}` });
		if (quest?.status === "done") rowEl.addClass("is-quest-done");

		const editBtn = rowEl.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": `Edit ${row.name}`, type: "button" },
		});
		setIcon(editBtn, "pencil");
		const openBtn = rowEl.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": `Open ${row.name} note`, type: "button" },
		});
		setIcon(openBtn, "file-text");

		const edit = (): void => {
			this.openEditor(campaign, kind, row.path);
		};
		this.view.registerDomEvent(editBtn, "click", (evt) => {
			evt.stopPropagation();
			edit();
		});
		this.view.registerDomEvent(openBtn, "click", (evt) => {
			evt.stopPropagation();
			void this.openNote(row.path);
		});
		this.view.registerDomEvent(rowEl, "click", () => edit());
	}

	private async toggleQuest(quest: QuestNoteModel): Promise<void> {
		const file = this.view.app.vault.getFileByPath(quest.path);
		if (!(file instanceof TFile)) return;
		const next = quest.status === "done" ? "open" : "done";
		await tryFileOp(
			() => writeLazyFrontmatter(this.view.app, file, writeQuestFm({ campaign: quest.campaign, status: next })),
			"Couldn't update the quest — check the console for details."
		);
		// The store notification from this write re-renders the list.
	}

	private async openNote(path: string): Promise<void> {
		const file = this.view.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return;
		await this.view.app.workspace.getLeaf(true).openFile(file);
	}
}

function joinMeta(parts: Array<string | undefined>): string {
	return parts.filter((p): p is string => p !== undefined && p.length > 0).join(" · ");
}
