import { debounce, setIcon } from "obsidian";
import { sectionContent } from "../../../lib/sections";
import { parseBulletSection, renderBulletRows } from "../../../sessions/bullet-list";
import type { StepContext } from "../step-context";

export interface ListSectionOptions {
	/** Stable prefix for row `data-key`s, e.g. "scenes"/"rewards". */
	stepId: string;
	/** Managed H2 heading this editor is bound to. */
	heading: string;
	placeholder: string;
	hint: string;
}

const ROW_INPUT_SELECTOR = ".lazy-campaign-list-row-input";

/**
 * Shared one-line-row list editor bound to a managed body section — used by
 * both the Scenes and Rewards steps (only heading/copy differ). Keeps its own
 * local `rows` array as the editing surface's source of truth; writes
 * through `ctx.writeSection` on idle debounce and on blur, and never reads
 * back through `ctx.body` after a local edit (that would replay the same
 * staleness problem the store's self-write soft path exists to avoid).
 */
export function renderListSectionEditor(container: HTMLElement, ctx: StepContext, options: ListSectionOptions): void {
	const parsed = parseBulletSection(sectionContent(ctx.body, options.heading));

	if (parsed.malformed) {
		renderMalformedBanner(container, ctx, options.heading);
		return;
	}

	let rows = parsed.rows.length > 0 ? parsed.rows : [""];
	let focusIndex: number | null = null;

	const listEl = container.createDiv({ cls: "lazy-campaign-list-rows" });
	container.createEl("p", { cls: "lazy-campaign-hint", text: options.hint });

	const debouncedCommit = debounce(() => commit(), 800, true);
	ctx.registerDebounce(debouncedCommit);

	function commit(): void {
		void ctx.writeSection(options.heading, renderBulletRows(rows));
	}

	function rebuildRows(): void {
		listEl.empty();

		rows.forEach((value, index) => {
			const rowEl = listEl.createDiv({ cls: "lazy-campaign-list-row" });
			const input = rowEl.createEl("input", {
				type: "text",
				cls: "lazy-campaign-list-row-input",
				attr: { "data-key": `${options.stepId}-row-${index}`, placeholder: options.placeholder },
			});
			input.value = value;

			ctx.registerDomEvent(input, "input", () => {
				rows[index] = input.value;
				debouncedCommit();
			});
			ctx.registerDomEvent(input, "blur", () => debouncedCommit.run());
			ctx.registerDomEvent(input, "keydown", (evt) => {
				if (evt.key !== "Enter") return;
				evt.preventDefault();
				rows.splice(index + 1, 0, "");
				focusIndex = index + 1;
				rebuildRows();
				commit();
			});

			const controls = rowEl.createDiv({ cls: "lazy-campaign-list-row-controls" });
			addIconButton(controls, "arrow-up", "Move up", index === 0, () => {
				[rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
				focusIndex = index - 1;
				rebuildRows();
				commit();
			});
			addIconButton(controls, "arrow-down", "Move down", index === rows.length - 1, () => {
				[rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
				focusIndex = index + 1;
				rebuildRows();
				commit();
			});
			addIconButton(controls, "x", "Remove row", false, () => {
				rows.splice(index, 1);
				if (rows.length === 0) rows = [""];
				focusIndex = null;
				rebuildRows();
				commit();
			});
		});

		if (focusIndex !== null) {
			const inputs = listEl.querySelectorAll<HTMLInputElement>(ROW_INPUT_SELECTOR);
			inputs.item(focusIndex)?.focus();
			focusIndex = null;
		}
	}

	function addIconButton(
		controlsEl: HTMLElement,
		icon: string,
		label: string,
		disabled: boolean,
		onClick: () => void
	): void {
		const button = controlsEl.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": label, type: "button" },
		});
		setIcon(button, icon);
		button.disabled = disabled;
		ctx.registerDomEvent(button, "click", onClick);
	}

	rebuildRows();
}

function renderMalformedBanner(container: HTMLElement, ctx: StepContext, heading: string): void {
	const banner = container.createDiv({ cls: "lazy-campaign-malformed-banner" });
	banner.createSpan({
		text: `The ${heading} section was edited outside the board — open the note to fix it up by hand.`,
	});
	const openBtn = banner.createEl("button", { text: "Open note" });
	ctx.registerDomEvent(openBtn, "click", () => void ctx.openNote(ctx.session.path));
}
