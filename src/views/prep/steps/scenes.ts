import { renderListSectionEditor } from "./list-section-editor";
import type { StepContext } from "../step-context";

export function renderScenesStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Outline potential scenes" });
	renderListSectionEditor(container, ctx, {
		stepId: "scenes",
		heading: "Scenes",
		placeholder: "A scene…",
		hint: "3–8 is plenty — they'll go off-script anyway.",
		// Run mode toggles scenes done one-tap (`- [ ]`/`- [x]`, M6) — this
		// editor preserves that flag round-trip even though it only edits text.
		taskAware: true,
	});
}
