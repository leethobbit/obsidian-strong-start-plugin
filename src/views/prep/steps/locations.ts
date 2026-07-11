import { tryFileOp } from "../../../lib/notify";
import { createLocationNote } from "../../../roster/entity-files";
import { renderChipEditor } from "./chip-editor";
import type { StepContext } from "../step-context";

export function renderLocationsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Develop fantastic locations" });
	renderChipEditor(container, ctx, {
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
	});
}
