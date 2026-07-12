import { generateTreasure } from "../../../generators/treasure";
import { oneLiner } from "../../../generators/types";
import { mountRollChip } from "../../roll-chip";
import { renderListSectionEditor } from "./list-section-editor";
import { sectionEditorCtxFrom } from "./section-editor-ctx";
import type { StepContext } from "../step-context";

export function renderRewardsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Select magic item rewards" });
	const handle = renderListSectionEditor(container, sectionEditorCtxFrom(ctx), ctx.body, {
		stepId: "rewards",
		heading: "Rewards",
		placeholder: "A reward…",
		hint: "What will they be excited to find?",
	});

	// "Roll treasure" composes the treasure generator's lines into one
	// one-liner chip (docs/plan.md M7) — reuses the uniform roll-chip
	// component directly (not `renderInspireControl`, which is keyed to a
	// single core-table id and doesn't fit a multi-table generator).
	const chipMount = container.createDiv({ cls: "lazy-campaign-roll-chip-mount" });
	const rollBtn = container.createEl("button", {
		cls: "lazy-campaign-inspire-button",
		attr: { type: "button" },
		text: "Roll treasure",
	});
	ctx.registerDomEvent(rollBtn, "click", () => {
		mountRollChip({
			container: chipMount,
			sourceLabel: "Treasure generator",
			roll: () => {
				const registry = ctx.plugin.tables;
				if (!registry) return null;
				return { text: oneLiner(generateTreasure(registry, ctx.plugin.rng)), trace: [] };
			},
			onInsert: (text) => handle.addRow(text),
			registerDomEvent: ctx.registerDomEvent,
		});
	});
}
