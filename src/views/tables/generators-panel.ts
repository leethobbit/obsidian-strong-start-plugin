import { Menu, Notice, setIcon } from "obsidian";
import { GENERATORS, type GeneratorDef } from "../../generators";
import { renderMarkdown, oneLiner, type GeneratedResult } from "../../generators/types";
import { rollTable } from "../../tables/roll";
import {
	appendSessionBullet,
	appendSessionLink,
	saveGeneratorNote,
	saveLocationGeneratorNote,
	saveNpcGeneratorNote,
	saveQuestGeneratorNote,
} from "../../generators/insert";
import { tryFileOp } from "../../lib/notify";
import { renderHint } from "../../help/hint";
import { renderEmptyState } from "../panel-kit";
import type { TableRegistry } from "../../tables/registry";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { LazyCampaignView } from "../lazy-view";

interface CardState {
	result: GeneratedResult | null;
}

/**
 * Tables panel's Generators sub-tab (docs/plan.md M7): one card per
 * `GENERATORS` entry with a Generate button; once rolled, a composed result
 * card offers a per-line reroll die, Copy, Save as note, and a "Send to
 * prep ▾" menu targeting whichever session Prep currently has selected.
 * Keeps one `GeneratedResult | null` per generator id across re-renders
 * (mirrors `TablesPanel`'s own `stack` field) — session-only, never persisted.
 */
export class GeneratorsPanel {
	private readonly state = new Map<string, CardState>();
	private mountEl: HTMLElement | null = null;

	constructor(private readonly view: LazyCampaignView) {}

	/** `containerEl` is a fresh mount every call (the parent `TablesPanel`
	 * rebuilds its whole DOM on every `render()`) — only `this.state` persists
	 * across calls, exactly like `TablesPanel`'s own `stack` field. */
	render(containerEl: HTMLElement): void {
		this.mountEl = containerEl;
		const registry = this.view.plugin.tables;
		const shell = containerEl.createDiv({ cls: "strong-start-generators-shell" });

		if (!registry) {
			renderEmptyState(shell, "Tables aren't ready yet.");
			return;
		}

		renderHint(
			shell,
			this.view,
			this.view.plugin,
			"generators",
			"Every line of a result rerolls on its own — keep the good parts, reroll the rest."
		);

		const grid = shell.createDiv({ cls: "strong-start-generators-grid" });
		for (const generator of GENERATORS) {
			this.renderCard(grid, registry, generator);
		}
	}

	private rerender(): void {
		if (!this.mountEl) return;
		this.mountEl.empty();
		this.render(this.mountEl);
	}

	private renderCard(grid: HTMLElement, registry: TableRegistry, generator: GeneratorDef): void {
		const card = grid.createDiv({ cls: "strong-start-generator-card" });
		const header = card.createDiv({ cls: "strong-start-generator-card-header" });
		const iconEl = header.createSpan({ cls: "strong-start-generator-card-icon" });
		setIcon(iconEl, generator.icon);
		header.createSpan({ cls: "strong-start-generator-card-label", text: generator.label });

		const generateBtn = header.createEl("button", { cls: "mod-cta", text: "Generate" });
		this.view.registerDomEvent(generateBtn, "click", () => {
			this.state.set(generator.id, { result: generator.run(registry, this.view.plugin.rng) });
			this.rerender();
		});

		const resultEl = card.createDiv({ cls: "strong-start-generator-card-result" });
		const state = this.state.get(generator.id);
		if (!state?.result) {
			renderEmptyState(resultEl, "Nothing generated yet.");
			return;
		}
		this.renderResult(resultEl, registry, generator, state.result);
	}

	private renderResult(
		resultEl: HTMLElement,
		registry: TableRegistry,
		generator: GeneratorDef,
		result: GeneratedResult
	): void {
		resultEl.createEl("h4", { text: result.title });
		const list = resultEl.createDiv({ cls: "strong-start-generator-lines" });

		result.lines.forEach((line, index) => {
			const row = list.createDiv({ cls: "strong-start-generator-line" });
			row.createSpan({ cls: "strong-start-generator-line-label", text: `${line.label}:` });
			row.createSpan({ cls: "strong-start-generator-line-text", text: line.text });

			const tableId = line.tableId;
			if (!tableId) return;
			const rerollBtn = row.createEl("button", {
				cls: "strong-start-icon-button",
				attr: { "aria-label": `Reroll ${line.label}`, type: "button" },
			});
			setIcon(rerollBtn, "dices");
			this.view.registerDomEvent(rerollBtn, "click", () => {
				const rolled = rollTable(tableId, registry, this.view.plugin.rng);
				if (!rolled) return;
				result.lines[index] = { ...line, text: rolled.text };
				this.rerender();
			});
		});

		const actions = resultEl.createDiv({ cls: "strong-start-generator-actions" });

		const copyBtn = actions.createEl("button", { text: "Copy" });
		this.view.registerDomEvent(copyBtn, "click", () =>
			void tryFileOp(() => navigator.clipboard.writeText(renderMarkdown(result)), "Couldn't copy that to the clipboard.")
		);

		const saveBtn = actions.createEl("button", { text: "Save as note" });
		this.view.registerDomEvent(saveBtn, "click", () => void this.handleSave(generator, result));

		const sendBtn = actions.createEl("button", { text: "Send to prep ▾" });
		this.view.registerDomEvent(sendBtn, "click", (evt) => this.showSendMenu(evt, generator, result));
	}

	private async handleSave(generator: GeneratorDef, result: GeneratedResult): Promise<void> {
		const campaign = this.view.plugin.activeCampaign();
		if (!campaign) {
			new Notice("Pick a campaign first.");
			return;
		}
		const app = this.view.app;
		const saved = await tryFileOp(() => {
			if (generator.id === "npc") return saveNpcGeneratorNote(app, campaign, result);
			if (generator.id === "trap") return saveLocationGeneratorNote(app, campaign, result.title, result.lines);
			if (generator.id === "monument") {
				// Drop the headline "Monument" line itself — the note's own name
				// already carries it; the aspects are everything after it.
				return saveLocationGeneratorNote(app, campaign, result.title, result.lines.slice(1));
			}
			// Quests become managed `type: quest` entities (M15) — linkable
			// from scenes and chips, not just a loose file.
			if (generator.id === "quest") return saveQuestGeneratorNote(app, campaign, result);
			return saveGeneratorNote(app, campaign, result);
		}, "Couldn't save that note — check the console for details.");
		if (!saved) return;
		new Notice(`Saved ${saved.basename}.`);
	}

	private showSendMenu(evt: MouseEvent, generator: GeneratorDef, result: GeneratedResult): void {
		const campaign = this.view.plugin.activeCampaign();
		const session = campaign ? this.currentSessionOf(campaign) : null;
		const app = this.view.app;

		const menu = new Menu();
		const addItem = (title: string, run: (target: SessionModel) => Promise<boolean>): void => {
			menu.addItem((item) =>
				item.setTitle(title).onClick(() => {
					if (!session) {
						new Notice("Prep a session first.");
						return;
					}
					void tryFileOp(() => run(session), "Couldn't send that to prep — check the console for details.").then(
						(sent) => {
							if (sent) new Notice("Sent to prep.");
						}
					);
				})
			);
		};

		if (generator.id === "npc") {
			const name = result.lines.find((line) => line.label === "Name")?.text ?? result.title;
			addItem("NPCs step", async (target) => {
				await appendSessionLink(app, target, "npcs", name);
				return true;
			});
		} else if (generator.id === "treasure") {
			addItem("Rewards step", async (target) => {
				const sent = await appendSessionBullet(app, target, "Rewards", oneLiner(result));
				if (!sent) new Notice("Rewards was edited by hand — open the note to add it there.");
				return sent;
			});
		} else if (generator.id === "quest") {
			addItem("Scenes step", async (target) => {
				const sent = await appendSessionBullet(app, target, "Scenes", oneLiner(result));
				if (!sent) new Notice("Scenes was edited by hand — open the note to add it there.");
				return sent;
			});
		} else {
			addItem("Locations step", async (target) => {
				await appendSessionLink(app, target, "locations", oneLiner(result));
				return true;
			});
		}

		menu.showAtMouseEvent(evt);
	}

	/** The session Prep currently has selected, falling back to the latest —
	 * same resolution `plugin.ui.lastSessionPath` already drives for Run mode. */
	private currentSessionOf(campaign: CampaignModel): SessionModel | null {
		const store = this.view.plugin.store;
		if (!store) return null;
		const sessions = store.sessionsOf(campaign.path);
		if (sessions.length === 0) return null;
		const rememberedPath = this.view.plugin.ui.lastSessionPath;
		const remembered = rememberedPath ? sessions.find((s) => s.path === rememberedPath) : undefined;
		return remembered ?? sessions[0];
	}
}
