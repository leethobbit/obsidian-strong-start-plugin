// Obsidian glue — the dismissible-hints framework (docs/plan.md M11). Persists
// dismissal through the plugin's one `persist()` seam (AGENTS.md: "data.json:
// { settings, ui, hints } through one loadPersisted/persist pair only"), never
// a bespoke write.

import { setIcon } from "obsidian";
import type { DomEventOwner } from "../views/panel-kit";
import type LazyCampaignPlugin from "../../main";

/**
 * A subtle, dismissible callout row. No-op (renders nothing) once `id` is in
 * `plugin.hints.dismissed` — callers can call this unconditionally on every
 * render without checking themselves first. `owner` only needs
 * `registerDomEvent` (the same narrow cut `panel-kit.ts`'s stepper takes), so
 * callers can pass either a real view/panel `Component` or a
 * `StepContext`-shaped object.
 */
export function renderHint(
	container: HTMLElement,
	owner: DomEventOwner,
	plugin: LazyCampaignPlugin,
	id: string,
	text: string
): void {
	if (plugin.hints.dismissed.includes(id)) return;

	const row = container.createDiv({ cls: "strong-start-hint-row" });
	const icon = row.createSpan({ cls: "strong-start-hint-row-icon" });
	setIcon(icon, "lightbulb");
	row.createSpan({ cls: "strong-start-hint-row-text", text });

	const closeBtn = row.createEl("button", {
		cls: "strong-start-hint-row-close",
		attr: { "aria-label": "Dismiss this tip", type: "button" },
	});
	setIcon(closeBtn, "x");
	owner.registerDomEvent(closeBtn, "click", () => {
		plugin.hints.dismissed = [...plugin.hints.dismissed, id];
		void plugin.persist();
		row.remove();
	});
}
