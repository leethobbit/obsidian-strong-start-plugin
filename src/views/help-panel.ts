// The Help destination (docs/plan.md M11): replaces the placeholder — a
// compact guide, not a full manual. Nothing here reads campaign/session
// state, so a plain rebuild on every `render()` is fine (no store
// subscription, no focus-preserve machinery needed).

import { Notice } from "obsidian";
import { STEPS } from "../sessions/steps";
import { ATTRIBUTION_TEXT, ATTRIBUTION_URL } from "../content/attribution";
import { featureEnabled } from "../features";
import { WelcomeModal } from "../help/welcome-modal";
import type { LazyCampaignView } from "./lazy-view";

/** One-liner per step, keyed by the frozen step id (SCHEMA.md) — presentational
 * copy for this panel only, not part of the `STEPS` registry itself. */
const STEP_ONE_LINERS: Record<string, string> = {
	characters: "A spotlight moment for each player — what's on their mind lately?",
	"strong-start": "Open with a scene, not a recap — skip the last-time-on montage.",
	scenes: "Outline 3–8 possible scenes — they'll go off-script anyway.",
	secrets: "About ten secrets and clues, ready to reveal when the moment's right.",
	locations: "A couple of fantastic locations worth describing in detail.",
	npcs: "The NPCs you expect to matter this session.",
	monsters: "Relevant monsters for the fights you can see coming.",
	rewards: "Magic items or other rewards worth finding.",
};

const WEEKLY_LOOP: readonly string[] = [
	"Create a campaign — a pitch, six truths, a front or two.",
	"Prep a session — the eight steps, about thirty minutes.",
	"Run it — read-optimized, tap to reveal, log as you go.",
	"End the session — tallies and a recap.",
	"Unrevealed secrets carry forward to the next session.",
];

const KEYBOARD_SHORTCUTS: ReadonlyArray<{ keys: string; text: string }> = [
	{ keys: "Ctrl/Cmd+1–8", text: "Jump to a prep step." },
	{ keys: "Alt+R", text: "Roll inspiration for the step you're working on — even mid-type." },
	{ keys: "Enter", text: "Add a new row in scenes, rewards, and other list editors." },
	{ keys: "Space", text: "Toggle the focused scene in run mode." },
];

export class HelpPanel {
	constructor(
		private readonly view: LazyCampaignView,
		private readonly containerEl: HTMLElement
	) {}

	render(): void {
		this.containerEl.empty();
		const shell = this.containerEl.createDiv({ cls: "lazy-campaign-help-shell" });

		this.renderLoopCard(shell);
		this.renderStepsCard(shell);
		this.renderShortcutsCard(shell);
		if (featureEnabled(this.view.plugin.settings, "solo5e")) this.renderSoloCard(shell);
		this.renderLinksCard(shell);
	}

	/** The Lazy Solo 5e procedure (M15) — the prose half of the solo module;
	 * its three oracle tables live in the tables panel under the same
	 * `solo5e` toggle. Condensed from the resource document (CC-BY 4.0). */
	private renderSoloCard(shell: HTMLElement): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "Solo play" });
		card.createEl("p", {
			// "Lazy Solo 5e" is the source document's own section title — keep
			// its capitalization (same policy as the attribution link in
			// settings-tab.ts).
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			text: "The Lazy Solo 5e rules: one character, a dungeon map of your choice, quests from the generators, oracles from the built-in tables.",
		});
		const list = card.createEl("ol", { cls: "lazy-campaign-help-loop-list" });
		const steps = [
			"Build the quest: roll an NPC quest-giver, a quest, and a location from the generators. Pick a map with fifteen or more rooms and a sensible starting room. Start at 1st level.",
			"Each chamber you enter, roll on “Solo — chamber events”. Every “quest progress” result advances the quest one step — your fourth is the final challenge; beat it and gain a level.",
			"Traps and hazards: DC 12 to spot, DC 12 to avoid; failure deals 1d6 damage per character level. Roll the trap itself on the traps table.",
			"Monsters come from the dungeon monsters table at a level equal to yours; they start 25 feet away with initiative 10 + their Dexterity bonus.",
			"Monuments: roll “Solo — monument effects”. Helpful ones buff you, harmful ones buff the monster; for neutral ones a DC 12 Intelligence (Arcana or Religion) check decides who benefits.",
			"After a kill or an unguarded-treasure result, roll “Solo — treasures”; consumables and permanents come from the treasure generator.",
		];
		for (const step of steps) list.createEl("li", { text: step });
	}

	private renderLoopCard(shell: HTMLElement): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "The weekly loop" });
		const list = card.createEl("ol", { cls: "lazy-campaign-help-loop-list" });
		for (const line of WEEKLY_LOOP) list.createEl("li", { text: line });
	}

	private renderStepsCard(shell: HTMLElement): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "The eight steps" });
		const list = card.createDiv({ cls: "lazy-campaign-help-steps-list" });
		for (const step of STEPS) {
			const row = list.createDiv({ cls: "lazy-campaign-help-step-row" });
			row.createSpan({ cls: "lazy-campaign-step-number", text: String(step.number) });
			row.createSpan({ cls: "lazy-campaign-help-step-label", text: step.label });
			row.createSpan({ cls: "lazy-campaign-hint", text: STEP_ONE_LINERS[step.id] ?? "" });
		}
	}

	private renderShortcutsCard(shell: HTMLElement): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "Keyboard shortcuts" });
		const list = card.createDiv({ cls: "lazy-campaign-help-shortcuts-list" });
		for (const shortcut of KEYBOARD_SHORTCUTS) {
			const row = list.createDiv({ cls: "lazy-campaign-help-shortcut-row" });
			row.createEl("kbd", { text: shortcut.keys });
			row.createSpan({ text: shortcut.text });
		}
	}

	private renderLinksCard(shell: HTMLElement): void {
		const card = shell.createDiv({ cls: "lazy-campaign-card" });
		card.createEl("h3", { text: "About" });
		card.createEl("p", { text: ATTRIBUTION_TEXT });
		card.createEl("a", {
			text: "Read the source document",
			href: ATTRIBUTION_URL,
			attr: { target: "_blank", rel: "noopener" },
		});

		const linksRow = card.createDiv({ cls: "lazy-campaign-help-links-row" });

		const replayLink = linksRow.createEl("a", { text: "Replay welcome", attr: { href: "#" } });
		this.view.registerDomEvent(replayLink, "click", (evt) => {
			evt.preventDefault();
			new WelcomeModal(this.view.app, this.view.plugin).open();
		});

		const resetLink = linksRow.createEl("a", { text: "Reset tips", attr: { href: "#" } });
		this.view.registerDomEvent(resetLink, "click", (evt) => {
			evt.preventDefault();
			this.view.plugin.hints.dismissed = [];
			void this.view.plugin.persist();
			new Notice("Tips reset — they'll show again as you use the plugin.");
		});
	}
}
