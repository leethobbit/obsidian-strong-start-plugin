import { renderChipEditor } from "./chip-editor";
import { renderBenchmarkCard } from "../../../dnd5e/dnd5e-cards";
import { featureEnabled } from "../../../features";
import type { StepContext } from "../step-context";

export function renderMonstersStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Choose relevant monsters" });
	renderChipEditor(container, ctx, {
		stepId: "monsters",
		fmKey: "monsters",
		placeholder: "Add a monster…",
		// No monster note type in v1 (SCHEMA.md) — suggest from any vault
		// note, and no "Create note" affordance (createNote omitted).
		suggestions: () => ctx.app.vault.getMarkdownFiles().map((f) => f.basename),
	});

	// 5e module (docs/plan.md M10) — zero UI when the feature is off.
	if (featureEnabled(ctx.plugin.settings, "dnd5e")) {
		container.createEl("h4", { text: "Encounter benchmark" });
		renderBenchmarkCard(container, { owner: ctx, pcs: ctx.plugin.store?.pcsOf(ctx.campaign.path) ?? [] });
	}
}
