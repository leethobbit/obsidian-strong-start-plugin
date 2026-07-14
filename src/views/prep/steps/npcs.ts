import { setIcon } from "obsidian";
import { tryFileOp } from "../../../lib/notify";
import { createNpcNote } from "../../../roster/entity-files";
import { rollTable } from "../../../tables/roll";
import { generateNpc } from "../../../generators/npc";
import type { GeneratedResult } from "../../../generators/types";
import { renderInspireControl } from "../../roll-chip";
import { openEntityEditor } from "../../home/entity-editor-modal";
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
		onEdit: (path) => void openEntityEditor(ctx.app, { kind: "npc", campaign: ctx.campaign, existingPath: path }),
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

	// "Generate NPC" runs the full generator (ancestry/profession/appearance/
	// worldview/connection) and previews it — "Use this name" reuses the same
	// chip-input insert affordance as "Roll a name" above (docs/plan.md M7:
	// full details live on the note via the Tables > Generators subtab's
	// "Save as note", not duplicated into this step's chip storage).
	const generateBtn = container.createEl("button", {
		cls: "strong-start-inspire-button",
		text: "Generate NPC",
		attr: { type: "button" },
	});
	const previewMount = container.createDiv({ cls: "strong-start-npc-preview-mount" });
	ctx.registerDomEvent(generateBtn, "click", () => {
		const registry = ctx.plugin.tables;
		if (!registry) return;
		renderPreview(previewMount, ctx, generateNpc(registry, ctx.plugin.rng), chip);
	});
}

function renderPreview(
	mount: HTMLElement,
	ctx: StepContext,
	result: GeneratedResult,
	chip: { setInputValue: (value: string) => void }
): void {
	mount.empty();
	const card = mount.createDiv({ cls: "strong-start-npc-preview" });
	const list = card.createDiv({ cls: "strong-start-npc-preview-lines" });
	for (const line of result.lines) {
		const row = list.createDiv({ cls: "strong-start-npc-preview-line" });
		row.createSpan({ cls: "strong-start-npc-preview-label", text: `${line.label}: ` });
		row.createSpan({ text: line.text });
	}

	const buttons = card.createDiv({ cls: "strong-start-roll-chip-buttons" });
	const name = result.lines.find((line) => line.label === "Name")?.text ?? "";

	const useBtn = buttons.createEl("button", { cls: "mod-cta", text: "Use this name" });
	ctx.registerDomEvent(useBtn, "click", () => chip.setInputValue(name));

	const rerollBtn = buttons.createEl("button", { text: "Reroll" });
	ctx.registerDomEvent(rerollBtn, "click", () => {
		const registry = ctx.plugin.tables;
		if (!registry) return;
		renderPreview(mount, ctx, generateNpc(registry, ctx.plugin.rng), chip);
	});

	const dismissBtn = buttons.createEl("button", {
		cls: "strong-start-icon-button",
		attr: { "aria-label": "Dismiss", type: "button" },
	});
	setIcon(dismissBtn, "x");
	ctx.registerDomEvent(dismissBtn, "click", () => mount.empty());
}
