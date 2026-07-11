import { renderChipEditor } from "./chip-editor";
import type { StepContext } from "../step-context";

// M10: encounter benchmark card mounts here (5e module, feature-gated on
// `dnd5e`, src/features.ts).
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
}
