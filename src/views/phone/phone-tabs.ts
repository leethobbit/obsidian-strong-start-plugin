// Obsidian glue — bottom tab bar builder for the phone shell (docs/plan.md
// M12). The slots derive from the nav model's declared phone placements
// (`PHONE_BAR`); this file only renders. On phones this bar replaces the
// desktop icon rail, which CSS hides under `body.is-phone`.

import { setIcon } from "obsidian";
import { destinationFor, PHONE_BAR, type NavMode } from "../nav-model";

export interface BottomBarHandlers {
	onTab: (mode: NavMode) => void;
	onMore: (evt: MouseEvent) => void;
}

/** The bar tab that should light up for a given active mode — More-sheet
 * destinations (Tables/Secrets/Help) highlight the "More" slot. */
export function phoneTabForMode(mode: NavMode): string {
	return PHONE_BAR.includes(mode) ? mode : "more";
}

/** Build the bottom bar into `parent`; returns the bar element so the shell
 * can class-toggle the active tab without rebuilding. Plain `onclick` (not
 * `registerDomEvent`) is deliberate: the bar lives exactly as long as the
 * view's contentEl and is torn down with it — same lifetime either way. */
export function buildBottomBar(parent: HTMLElement, handlers: BottomBarHandlers): HTMLElement {
	const bar = parent.createDiv({ cls: "lazy-campaign-bottombar" });

	for (const mode of PHONE_BAR) {
		const dest = destinationFor(mode);
		if (!dest) continue;
		const btn = bar.createEl("button", {
			cls: "lazy-campaign-bottombar-tab",
			attr: { type: "button", "aria-label": dest.label, "data-tab": dest.mode },
		});
		setIcon(btn.createSpan({ cls: "lazy-campaign-bottombar-icon" }), dest.icon);
		btn.createSpan({ cls: "lazy-campaign-bottombar-label", text: dest.label });
		btn.onclick = () => handlers.onTab(dest.mode);
	}

	const more = bar.createEl("button", {
		cls: "lazy-campaign-bottombar-tab",
		attr: { type: "button", "aria-label": "More", "data-tab": "more" },
	});
	setIcon(more.createSpan({ cls: "lazy-campaign-bottombar-icon" }), "more-horizontal");
	more.createSpan({ cls: "lazy-campaign-bottombar-label", text: "More" });
	more.onclick = (evt) => handlers.onMore(evt);

	return bar;
}
