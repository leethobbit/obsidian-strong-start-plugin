import { tryFileOp } from "../../../lib/notify";
import { createNpcNote } from "../../../roster/entity-files";
import { rollTable } from "../../../tables/roll";
import { renderInspireControl } from "../../roll-chip";
import { renderChipEditor } from "./chip-editor";
import type { StepContext } from "../step-context";

export function renderNpcsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Outline important NPCs" });

	const chip = renderChipEditor(container, ctx, {
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

	// "Roll a name" rolls the combined npc-names table into a chip; insert
	// only fills the add-input above (never creates a note) — the GM stays
	// the author of what actually becomes an NPC (docs/plan.md).
	renderInspireControl({
		container,
		tableIds: ["npc-names"],
		buttonText: "Roll a name",
		getTable: (id) => ctx.plugin.tables?.get(id),
		rollTable: (id) => (ctx.plugin.tables ? rollTable(id, ctx.plugin.tables, ctx.plugin.rng) : null),
		registerDomEvent: ctx.registerDomEvent,
		onInsert: (text) => chip.setInputValue(text),
	});
}
