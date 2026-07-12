import { debounce, setIcon } from "obsidian";
import { sectionContent } from "../../../lib/sections";
import {
	parseBulletSection,
	parseTaskBulletSection,
	renderBulletRows,
	renderTaskBulletRows,
	type TaskRow,
} from "../../../sessions/bullet-list";
import type { StepContext } from "../step-context";

export interface ListSectionOptions {
	/** Stable prefix for row `data-key`s, e.g. "scenes"/"rewards". */
	stepId: string;
	/** Managed H2 heading this editor is bound to. */
	heading: string;
	placeholder: string;
	hint: string;
	/** Round-trip `- [ ]`/`- [x]` done flags without ever exposing a done
	 * checkbox in this editor — it only ever edits row text; run mode owns
	 * toggling done. Defaults to false: Rewards has no done concept and stays
	 * on plain `-` bullets (docs/plan.md M6). */
	taskAware?: boolean;
}

const ROW_INPUT_SELECTOR = ".lazy-campaign-list-row-input";

export interface ListSectionEditorHandle {
	/** Append a new row with `text` and commit — used by the Rewards step's
	 * "Roll treasure" chip (docs/plan.md M7), which inserts a generated
	 * one-liner directly rather than routing through a text input. Replaces a
	 * lone empty placeholder row instead of leaving a blank row above it. */
	addRow(text: string): void;
}

function parse(content: string, taskAware: boolean): { rows: TaskRow[]; malformed: boolean } {
	if (taskAware) return parseTaskBulletSection(content);
	const plain = parseBulletSection(content);
	return { rows: plain.rows.map((text) => ({ text, done: false })), malformed: plain.malformed };
}

function render(rows: readonly TaskRow[], taskAware: boolean): string {
	return taskAware ? renderTaskBulletRows(rows) : renderBulletRows(rows.map((row) => row.text));
}

/**
 * Shared one-line-row list editor bound to a managed body section — used by
 * both the Scenes and Rewards steps (only heading/copy/`taskAware` differ).
 * Keeps its own local `rows` array as the editing surface's source of truth;
 * writes through `ctx.writeSection` on idle debounce and on blur, and never
 * reads back through `ctx.body` after a local edit (that would replay the
 * same staleness problem the store's self-write soft path exists to avoid).
 */
export function renderListSectionEditor(
	container: HTMLElement,
	ctx: StepContext,
	options: ListSectionOptions
): ListSectionEditorHandle {
	const taskAware = options.taskAware ?? false;
	const parsed = parse(sectionContent(ctx.body, options.heading), taskAware);

	if (parsed.malformed) {
		renderMalformedBanner(container, ctx, options.heading);
		// No rows to append to — the banner's "Open note" is the only affordance.
		return { addRow: () => {} };
	}

	let rows = parsed.rows.length > 0 ? parsed.rows : [{ text: "", done: false }];
	let focusIndex: number | null = null;

	const listEl = container.createDiv({ cls: "lazy-campaign-list-rows" });
	container.createEl("p", { cls: "lazy-campaign-hint", text: options.hint });

	const debouncedCommit = debounce(() => commit(), 800, true);
	ctx.registerDebounce(debouncedCommit);

	function commit(): void {
		void ctx.writeSection(options.heading, render(rows, taskAware));
	}

	function rebuildRows(): void {
		listEl.empty();

		rows.forEach((row, index) => {
			const rowEl = listEl.createDiv({ cls: "lazy-campaign-list-row" });
			const input = rowEl.createEl("input", {
				type: "text",
				cls: "lazy-campaign-list-row-input",
				attr: { "data-key": `${options.stepId}-row-${index}`, placeholder: options.placeholder },
			});
			input.value = row.text;

			ctx.registerDomEvent(input, "input", () => {
				rows[index] = { ...rows[index], text: input.value };
				debouncedCommit();
			});
			ctx.registerDomEvent(input, "blur", () => debouncedCommit.run());
			ctx.registerDomEvent(input, "keydown", (evt) => {
				if (evt.key !== "Enter") return;
				evt.preventDefault();
				rows.splice(index + 1, 0, { text: "", done: false });
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
				if (rows.length === 0) rows = [{ text: "", done: false }];
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

	return {
		addRow(text: string): void {
			const trimmed = text.trim();
			if (trimmed.length === 0) return;
			if (rows.length === 1 && rows[0].text.trim().length === 0) {
				rows = [{ text: trimmed, done: false }];
			} else {
				rows = [...rows, { text: trimmed, done: false }];
			}
			focusIndex = null;
			rebuildRows();
			commit();
		},
	};
}

function renderMalformedBanner(container: HTMLElement, ctx: StepContext, heading: string): void {
	const banner = container.createDiv({ cls: "lazy-campaign-malformed-banner" });
	banner.createSpan({
		text: `The ${heading} section was edited outside the board — open the note to fix it up by hand.`,
	});
	const openBtn = banner.createEl("button", { text: "Open note" });
	ctx.registerDomEvent(openBtn, "click", () => void ctx.openNote(ctx.session.path));
}
