import { debounce } from "obsidian";
import { sectionContent } from "../../../lib/sections";
import { rollTable } from "../../../tables/roll";
import { renderInspireControl } from "../../roll-chip";
import type { StepContext } from "../step-context";

const HEADING = "Strong start";

// The four "Example Strong Starts" environments (src/content/strong-starts.ts)
// — a compact pill picker above the roll chip, per docs/plan.md.
const STRONG_START_TABLE_IDS = [
	"strong-starts-city",
	"strong-starts-sewers",
	"strong-starts-wilderness",
	"strong-starts-dungeon",
] as const;

export function renderStrongStartStep(container: HTMLElement, ctx: StepContext): void {
	// "strong start" here is the prep-step concept (Lazy GM's Resource
	// Document, step 2), not the plugin brand — sentence case is correct.
	// eslint-disable-next-line obsidianmd/ui/sentence-case
	container.createEl("h3", { text: "Create a strong start" });
	container.createEl("p", {
		cls: "strong-start-hint",
		text: "Where does the action start? Drop them in the middle of it.",
	});

	const textarea = container.createEl("textarea", {
		cls: "strong-start-strong-start-textarea",
		attr: { rows: "6", "data-key": "strong-start-textarea" },
	});
	textarea.value = sectionContent(ctx.body, HEADING);

	const debouncedWrite = debounce(() => void ctx.writeSection(HEADING, textarea.value), 800, true);
	ctx.registerDebounce(debouncedWrite);

	ctx.registerDomEvent(textarea, "input", () => debouncedWrite());
	ctx.registerDomEvent(textarea, "blur", () => debouncedWrite.run());

	renderInspireControl({
		container,
		tableIds: STRONG_START_TABLE_IDS,
		getTable: (id) => ctx.plugin.tables?.get(id),
		rollTable: (id) => (ctx.plugin.tables ? rollTable(id, ctx.plugin.tables, ctx.plugin.rng) : null),
		registerDomEvent: ctx.registerDomEvent,
		onInsert: (text) => {
			const existing = textarea.value.trim();
			textarea.value = existing.length > 0 ? `${existing}\n\n${text}` : text;
			debouncedWrite.run();
		},
	});
}
