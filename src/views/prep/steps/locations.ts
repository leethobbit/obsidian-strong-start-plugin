import { generateMonument } from "../../../generators/monument";
import { oneLiner } from "../../../generators/types";
import { tryFileOp } from "../../../lib/notify";
import { createLocationNote } from "../../../roster/entity-files";
import { mountRollChip } from "../../roll-chip";
import { openEntityEditor } from "../../home/entity-editor-modal";
import { renderChipEditor } from "./chip-editor";
import type { StepContext } from "../step-context";

export function renderLocationsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Develop fantastic locations" });
	const chip = renderChipEditor(container, ctx, {
		stepId: "locations",
		fmKey: "locations",
		placeholder: "Add a location…",
		suggestions: () => ctx.plugin.store?.locationNotesOf(ctx.campaign.path).map((n) => n.name) ?? [],
		createNote: async (name) => {
			const file = await tryFileOp(
				() => createLocationNote(ctx.app, ctx.campaign, name),
				"Couldn't create the location note — check the console for details."
			);
			return file ? { file } : null;
		},
		onEdit: (path) => void openEntityEditor(ctx.app, { kind: "location", campaign: ctx.campaign, existingPath: path }),
	});

	// "Roll a monument" rolls the monument generator into a chip; insert only
	// fills the add-input above (never creates a note) — same pattern as the
	// NPCs step's "Roll a name" (docs/plan.md M7).
	const chipMount = container.createDiv({ cls: "strong-start-roll-chip-mount" });
	const rollBtn = container.createEl("button", {
		cls: "strong-start-inspire-button",
		attr: { type: "button" },
		text: "Roll a monument",
	});
	ctx.registerDomEvent(rollBtn, "click", () => {
		mountRollChip({
			container: chipMount,
			sourceLabel: "Monument generator",
			roll: () => {
				const registry = ctx.plugin.tables;
				if (!registry) return null;
				return { text: oneLiner(generateMonument(registry, ctx.plugin.rng)), trace: [] };
			},
			onInsert: (text) => chip.setInputValue(text),
			registerDomEvent: ctx.registerDomEvent,
		});
	});
}
