import { debounce, setIcon } from "obsidian";
import { sectionContent } from "../../../lib/sections";
import {
	parseBulletSection,
	parseTaskBulletSection,
	renderBulletRows,
	renderTaskBulletRows,
	type TaskRow,
} from "../../../sessions/bullet-list";
import { mountRollChip, type RegisterDomEvent } from "../../roll-chip";
import type { RollResult } from "../../../tables/types";

/**
 * The plumbing this editor needs from its host — a narrower cut than the prep
 * board's `StepContext` so the Foundation sub-tab (campaign note, not a
 * session) can reuse it directly. `StepContext` satisfies this structurally;
 * prep step callers pass `{ ...ctx, notePath: ctx.session.path }`.
 */
export interface SectionEditorCtx {
	registerDomEvent: RegisterDomEvent;
	registerDebounce: (debouncer: { cancel(): void; run(): unknown }) => void;
	writeSection: (heading: string, content: string) => Promise<void>;
	openNote: (path: string) => Promise<void>;
	/** Vault path of the note being edited — only consulted by the malformed-
	 * section banner's "Open note" affordance. */
	notePath: string;
}

export interface ListSectionDiceOptions {
	tableId: string;
	sourceLabel: string;
	rollTable: (id: string) => RollResult | null;
}

export interface ListSectionOptions {
	/** Stable prefix for row `data-key`s, e.g. "scenes"/"rewards"/"truths". */
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
	/** Optional roll affordance shown beside any currently-empty row — the
	 * uniform suggestion chip (Insert/Reroll/×), never auto-filling
	 * (AGENTS.md "Rolls never auto-insert"). Foundation's Six truths editor
	 * uses this; Scenes/Rewards don't pass it. */
	dice?: ListSectionDiceOptions;
	/** Per-row detail editing (`TaskRow.detail` — the indented block run mode
	 * expands under a scene). Adds a toggle button per row opening an indented
	 * textarea. Requires `taskAware`; ignored otherwise. Scenes only —
	 * Rewards/Six truths have no detail concept. */
	withDetail?: boolean;
}

const ROW_INPUT_SELECTOR = ".strong-start-list-row-input";

/** Editing-surface row: `TaskRow` plus a transient open flag for the detail
 * textarea. The flag lives on the row (not an index set) so move/remove carry
 * it with the row; `renderTaskBulletRows` only reads text/done/detail, so it
 * never leaks into the note. */
interface EditorRow extends TaskRow {
	detailOpen?: boolean;
}

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
 * the Scenes and Rewards prep steps and the Foundation sub-tab's Six truths
 * editor (only heading/copy/`taskAware`/`dice` differ). Keeps its own local
 * `rows` array as the editing surface's source of truth; writes through
 * `ctx.writeSection` on idle debounce and on blur, and never reads back
 * through a fresh body snapshot after a local edit (that would replay the
 * same staleness problem the store's self-write soft path exists to avoid).
 */
export function renderListSectionEditor(
	container: HTMLElement,
	ctx: SectionEditorCtx,
	body: string,
	options: ListSectionOptions
): ListSectionEditorHandle {
	const taskAware = options.taskAware ?? false;
	const withDetail = (options.withDetail ?? false) && taskAware;
	const parsed = parse(sectionContent(body, options.heading), taskAware);

	if (parsed.malformed) {
		renderMalformedBanner(container, ctx, options.heading);
		// No rows to append to — the banner's "Open note" is the only affordance.
		return { addRow: () => {} };
	}

	let rows: EditorRow[] = parsed.rows.length > 0 ? parsed.rows : [{ text: "", done: false }];
	let focusIndex: number | null = null;

	const listEl = container.createDiv({ cls: "strong-start-list-rows" });
	if (options.hint.length > 0) container.createEl("p", { cls: "strong-start-hint", text: options.hint });

	const debouncedCommit = debounce(() => commit(), 800, true);
	ctx.registerDebounce(debouncedCommit);

	function commit(): void {
		void ctx.writeSection(options.heading, render(rows, taskAware));
	}

	function rebuildRows(): void {
		listEl.empty();

		rows.forEach((row, index) => {
			const rowEl = listEl.createDiv({ cls: "strong-start-list-row" });
			const input = rowEl.createEl("input", {
				type: "text",
				cls: "strong-start-list-row-input",
				attr: { "data-key": `${options.stepId}-row-${index}`, placeholder: options.placeholder },
			});
			input.value = row.text;

			ctx.registerDomEvent(input, "input", () => {
				rows[index] = { ...rows[index], text: input.value };
				debouncedCommit();
			});
			ctx.registerDomEvent(input, "blur", () => debouncedCommit.run());
			ctx.registerDomEvent(input, "keydown", (evt) => {
				if (evt.isComposing) return; // Enter confirming an IME candidate must not commit
			if (evt.key !== "Enter") return;
				evt.preventDefault();
				rows.splice(index + 1, 0, { text: "", done: false });
				focusIndex = index + 1;
				rebuildRows();
				commit();
			});

			const controls = rowEl.createDiv({ cls: "strong-start-list-row-controls" });
			if (withDetail) {
				const detailBtn = controls.createEl("button", {
					cls: `strong-start-icon-button strong-start-list-row-detail-toggle${
						(row.detail ?? "").trim().length > 0 ? " has-detail" : ""
					}`,
					attr: {
						"aria-label": row.detailOpen ? "Hide scene detail" : "Edit scene detail",
						"aria-expanded": row.detailOpen ? "true" : "false",
						type: "button",
					},
				});
				setIcon(detailBtn, "text");
				ctx.registerDomEvent(detailBtn, "click", () => {
					rows[index] = { ...rows[index], detailOpen: !rows[index].detailOpen };
					focusIndex = null;
					rebuildRows();
				});
			}
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

			if (options.dice && row.text.trim().length === 0) {
				renderRowDice(rowEl, options.dice, (text) => {
					rows[index] = { ...rows[index], text };
					focusIndex = null;
					rebuildRows();
					commit();
				});
			}

			if (withDetail && row.detailOpen) {
				const detailArea = listEl.createEl("textarea", {
					cls: "strong-start-list-row-detail",
					attr: {
						rows: "3",
						placeholder: "Detail shown in run mode — read-aloud, DCs, tactics…",
						"data-key": `${options.stepId}-detail-${index}`,
					},
				});
				detailArea.value = row.detail ?? "";
				ctx.registerDomEvent(detailArea, "input", () => {
					const value = detailArea.value;
					// "Cleared = deleted": whitespace-only detail drops the key.
					rows[index] = { ...rows[index], detail: value.trim().length > 0 ? value : undefined };
					debouncedCommit();
				});
				ctx.registerDomEvent(detailArea, "blur", () => debouncedCommit.run());
			}
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
			cls: "strong-start-icon-button",
			attr: { "aria-label": label, type: "button" },
		});
		setIcon(button, icon);
		button.disabled = disabled;
		ctx.registerDomEvent(button, "click", onClick);
	}

	function renderRowDice(rowEl: HTMLElement, dice: ListSectionDiceOptions, onInsert: (text: string) => void): void {
		const chipMount = rowEl.createDiv({ cls: "strong-start-list-row-dice" });
		const rollBtn = rowEl.createEl("button", {
			cls: "strong-start-icon-button",
			attr: { "aria-label": "Roll for inspiration", type: "button" },
		});
		setIcon(rollBtn, "dices");
		ctx.registerDomEvent(rollBtn, "click", () => {
			mountRollChip({
				container: chipMount,
				sourceLabel: dice.sourceLabel,
				roll: () => dice.rollTable(dice.tableId),
				onInsert,
				registerDomEvent: ctx.registerDomEvent,
			});
		});
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

function renderMalformedBanner(container: HTMLElement, ctx: SectionEditorCtx, heading: string): void {
	const banner = container.createDiv({ cls: "strong-start-malformed-banner" });
	banner.createSpan({
		text: `The ${heading} section was edited outside the board — open the note to fix it up by hand.`,
	});
	const openBtn = banner.createEl("button", { text: "Open note" });
	ctx.registerDomEvent(openBtn, "click", () => void ctx.openNote(ctx.notePath));
}
