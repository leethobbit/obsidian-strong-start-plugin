import { renderListSectionEditor } from "./list-section-editor";
import type { StepContext } from "../step-context";

export function renderRewardsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Select magic item rewards" });
	renderListSectionEditor(container, ctx, {
		stepId: "rewards",
		heading: "Rewards",
		placeholder: "A reward…",
		hint: "What will they be excited to find?",
	});
}
