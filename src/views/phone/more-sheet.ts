// Obsidian glue — the phone "More" action sheet (docs/plan.md M12): an
// Obsidian `Menu`, which renders as a native bottom sheet on mobile. Rows
// derive from the nav model's `PHONE_MORE_SHEET` placement plus the one quick
// action the plan gives this sheet ("quick roll"); bar destinations are never
// repeated here.

import { Menu } from "obsidian";
import { destinationFor, PHONE_MORE_SHEET, type NavMode } from "../nav-model";

export function openMoreSheet(
	evt: MouseEvent,
	go: (mode: NavMode) => void,
	onQuickRoll: () => void
): void {
	const menu = new Menu();
	menu.addItem((item) => item.setTitle("Roll on a table").setIcon("dices").onClick(() => onQuickRoll()));
	menu.addSeparator();
	for (const mode of PHONE_MORE_SHEET) {
		const dest = destinationFor(mode);
		if (!dest) continue;
		menu.addItem((item) =>
			item
				.setTitle(dest.label)
				.setIcon(dest.icon)
				.onClick(() => go(dest.mode))
		);
	}
	menu.showAtMouseEvent(evt);
}
