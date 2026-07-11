import { debounce } from "obsidian";
import { sectionContent } from "../../../lib/sections";
import type { StepContext } from "../step-context";

const HEADING = "Strong start";

export function renderStrongStartStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Create a strong start" });
	container.createEl("p", {
		cls: "lazy-campaign-hint",
		text: "Where does the action start? Drop them in the middle of it.",
	});

	const textarea = container.createEl("textarea", {
		cls: "lazy-campaign-strong-start-textarea",
		attr: { rows: "6", "data-key": "strong-start-textarea" },
	});
	textarea.value = sectionContent(ctx.body, HEADING);

	const debouncedWrite = debounce(() => void ctx.writeSection(HEADING, textarea.value), 800, true);
	ctx.registerDebounce(debouncedWrite);

	ctx.registerDomEvent(textarea, "input", () => debouncedWrite());
	ctx.registerDomEvent(textarea, "blur", () => debouncedWrite.run());
}
