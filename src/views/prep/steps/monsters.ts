import { renderChipEditor } from "./chip-editor";
import {
	renderBenchmarkCard,
	renderBossMinionTable,
	renderLocationMonstersSection,
	renderMonsterStatsByCrTable,
} from "../../../dnd5e/dnd5e-cards";
import { openMonsterBuilder } from "../../../dnd5e/monster-builder-modal";
import { crLabel } from "../../../dnd5e/monster-build";
import { featureEnabled } from "../../../features";
import { renderCollapsibleSection, SectionState } from "../../panel-kit";
import type { StepContext } from "../step-context";

/** Collapse state for the step's 5e reference sections — module-level so it
 * survives the prep board's full rebuilds (same idea as the panels' own
 * `SectionState` fields; this step has no class instance to hang it on). */
const referenceSectionState = new SectionState();
let referenceSectionsInitialized = false;

export function renderMonstersStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Choose relevant monsters" });
	// Computed once per step render, not per keystroke — the suggester calls
	// `suggestions()` on every input event, and a full getMarkdownFiles() map
	// is an O(vault) allocation each time on large vaults.
	let basenames: string[] | null = null;
	renderChipEditor(container, ctx, {
		stepId: "monsters",
		fmKey: "monsters",
		placeholder: "Add a monster…",
		// Suggest from any vault note (monster notes included — they're notes
		// too), and no "Create note" affordance (createNote omitted): free-text
		// chips like "4 × goblin" stay first-class.
		suggestions: () => (basenames ??= ctx.app.vault.getMarkdownFiles().map((f) => f.basename)),
	});

	// 5e module (docs/plan.md M10, M18) — zero UI when the feature is off.
	if (!featureEnabled(ctx.plugin.settings, "dnd5e")) return;

	container.createEl("h4", { text: "Encounter benchmark" });
	const pcs = ctx.plugin.store?.pcsOf(ctx.campaign.path) ?? [];
	renderBenchmarkCard(container, { owner: ctx, pcs });

	const buildRow = container.createDiv({ cls: "lazy-campaign-monster-build-row" });
	const buildBtn = buildRow.createEl("button", { text: "Build a monster" });
	ctx.registerDomEvent(buildBtn, "click", () => {
		void openMonsterBuilder(ctx.app, {
			campaign: ctx.campaign,
			partyLevels: pcs.map((pc) => pc.level).filter((level): level is number => level !== undefined),
			onSaved: async (_file, name) => {
				// Link the fresh note into this session's monster chips — the
				// chip array already accepts wikilinks (SCHEMA.md).
				await ctx.patchFrontmatter((fm) => ({ ...fm, monsters: [...fm.monsters, `[[${name}]]`] }));
				ctx.requestRerender();
			},
		});
	});
	const monsters = ctx.plugin.store?.monstersOf(ctx.campaign.path) ?? [];
	if (monsters.length > 0) {
		buildRow.createEl("span", {
			cls: "lazy-campaign-hint",
			text: `${monsters.length} built: ${monsters.map((monster) => `${monster.name} (CR ${crLabel(monster.cr)})`).join(", ")}`,
		});
	}

	// Reference tables start collapsed — they're deep-dive material, and the
	// prep board should stay scannable.
	if (!referenceSectionsInitialized) {
		referenceSectionsInitialized = true;
		for (const key of ["stats", "boss-minions", "location-monsters"]) {
			if (!referenceSectionState.isCollapsed(key)) referenceSectionState.toggle(key);
		}
	}
	renderCollapsibleSection(container, ctx, referenceSectionState, "stats", "Monster stats by CR", (body) =>
		renderMonsterStatsByCrTable(body, ctx)
	);
	renderCollapsibleSection(container, ctx, referenceSectionState, "boss-minions", "Boss and minions", (body) =>
		renderBossMinionTable(body, ctx)
	);
	renderCollapsibleSection(container, ctx, referenceSectionState, "location-monsters", "Monsters by location", (body) =>
		renderLocationMonstersSection(body, ctx)
	);
}
