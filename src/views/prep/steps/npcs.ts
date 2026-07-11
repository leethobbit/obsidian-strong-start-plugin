import { tryFileOp } from "../../../lib/notify";
import { createNpcNote } from "../../../roster/entity-files";
import { renderChipEditor } from "./chip-editor";
import type { StepContext } from "../step-context";

export function renderNpcsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Outline important NPCs" });
	renderChipEditor(container, ctx, {
		stepId: "npcs",
		fmKey: "npcs",
		placeholder: "Add an NPC…",
		suggestions: () => ctx.plugin.store?.npcNotesOf(ctx.campaign.path).map((n) => n.name) ?? [],
		createNote: async (name) => {
			const file = await tryFileOp(
				() => createNpcNote(ctx.app, ctx.campaign, name),
				"Couldn't create the NPC note — check the console for details."
			);
			return file ? { file } : null;
		},
	});
}
