import { setIcon } from "obsidian";
import type { RollResult, RollTable } from "../tables/types";

/** Shared DOM-event registration shape — matches `StepContext.registerDomEvent`
 * and `LazyCampaignView.registerDomEvent` so both callers can pass their own
 * through without adapting it. */
export type RegisterDomEvent = <K extends keyof HTMLElementEventMap>(
	el: HTMLElement,
	type: K,
	cb: (evt: HTMLElementEventMap[K]) => void
) => void;

export interface RollChipOptions {
	/** Mount point — emptied and (re)populated; this component owns its full
	 * contents. Callers own the element's lifetime (it's plain DOM, torn down
	 * with the rest of the step/panel). */
	container: HTMLElement;
	/** Subtle source line, e.g. "From Strong starts — wilderness". */
	sourceLabel: string;
	/** Produces a fresh roll — called on mount and again on every "Reroll"
	 * click. `null` renders a quiet fallback instead of a broken chip (e.g. a
	 * shadowed table with no rows). */
	roll: () => RollResult | null;
	/** Called with the rolled text on "Insert" — never called automatically;
	 * the GM stays the author (AGENTS.md "Rolls never auto-insert"). */
	onInsert: (text: string) => void;
	registerDomEvent: RegisterDomEvent;
}

/**
 * The uniform suggestion-chip: result text + [Insert] [Reroll] [×] + a
 * subtle source line. One chip lives per mount point at a time — a reroll
 * replaces the chip's own content in place rather than stacking a new one
 * (docs/plan.md "Uniform inspiration-roll pattern").
 */
export function mountRollChip(options: RollChipOptions): void {
	draw();

	function draw(): void {
		const { container } = options;
		container.empty();

		const result = options.roll();
		const card = container.createDiv({ cls: "lazy-campaign-roll-chip" });

		if (!result) {
			card.createSpan({ cls: "lazy-campaign-empty-state", text: "Nothing to roll there yet." });
			return;
		}

		card.createDiv({ cls: "lazy-campaign-roll-chip-text", text: result.text });
		card.createDiv({ cls: "lazy-campaign-roll-chip-source", text: `From ${options.sourceLabel}` });

		const buttons = card.createDiv({ cls: "lazy-campaign-roll-chip-buttons" });

		const insertBtn = buttons.createEl("button", { cls: "mod-cta", text: "Insert" });
		options.registerDomEvent(insertBtn, "click", () => options.onInsert(result.text));

		const rerollBtn = buttons.createEl("button", { text: "Reroll" });
		options.registerDomEvent(rerollBtn, "click", () => draw());

		const dismissBtn = buttons.createEl("button", {
			cls: "lazy-campaign-icon-button",
			attr: { "aria-label": "Dismiss", type: "button" },
		});
		setIcon(dismissBtn, "x");
		options.registerDomEvent(dismissBtn, "click", () => container.empty());
	}
}

export interface InspireControlOptions {
	/** Mount point for the whole control (button/pills + chip). */
	container: HTMLElement;
	/** Source table ids this "inspire me" button can roll on. A single id
	 * renders a plain roll button; more than one adds a row of pills above it
	 * (docs/plan.md: strong start's 4 environments, secrets' 4 categories). */
	tableIds: readonly string[];
	/** Looks up a table's display metadata for pill labels/source lines —
	 * callers pass `plugin.tables?.get`, keeping table names single-sourced
	 * in `src/content/`. */
	getTable: (id: string) => RollTable | undefined;
	rollTable: (id: string) => RollResult | null;
	onInsert: (text: string) => void;
	registerDomEvent: RegisterDomEvent;
	/** Overrides the default icon-only "Roll for inspiration" button with a
	 * labeled one (the NPCs step's "Roll a name"). */
	buttonText?: string;
}

/** The "inspire me" control every step wires an inspiration roll through:
 * an icon (or labeled) roll button, an optional table picker, and a roll-chip
 * mount underneath. */
export function renderInspireControl(options: InspireControlOptions): void {
	const { container, tableIds } = options;
	if (tableIds.length === 0) return;

	const wrap = container.createDiv({ cls: "lazy-campaign-inspire" });
	const header = wrap.createDiv({ cls: "lazy-campaign-inspire-header" });
	const chipMount = wrap.createDiv({ cls: "lazy-campaign-roll-chip-mount" });

	let selectedId = tableIds[0];

	function labelFor(id: string): string {
		return options.getTable(id)?.name ?? id;
	}

	function showChipFor(id: string): void {
		selectedId = id;
		mountRollChip({
			container: chipMount,
			sourceLabel: labelFor(id),
			roll: () => options.rollTable(id),
			onInsert: options.onInsert,
			registerDomEvent: options.registerDomEvent,
		});
	}

	if (tableIds.length > 1) {
		const pillRow = header.createDiv({ cls: "lazy-campaign-inspire-pills" });
		for (const id of tableIds) {
			const pill = pillRow.createEl("button", {
				cls: `lazy-campaign-inspire-pill${id === selectedId ? " is-active" : ""}`,
				text: labelFor(id),
				attr: { type: "button" },
			});
			options.registerDomEvent(pill, "click", () => {
				pillRow.querySelectorAll<HTMLElement>(".lazy-campaign-inspire-pill").forEach((el) => {
					el.removeClass("is-active");
				});
				pill.addClass("is-active");
				showChipFor(id);
			});
		}
	}

	const rollBtn = header.createEl("button", {
		cls: options.buttonText ? "lazy-campaign-inspire-button" : "lazy-campaign-icon-button lazy-campaign-inspire-button",
		text: options.buttonText,
		attr: { "aria-label": options.buttonText ?? "Roll for inspiration", type: "button" },
	});
	if (!options.buttonText) setIcon(rollBtn, "dices");
	options.registerDomEvent(rollBtn, "click", () => showChipFor(selectedId));
}
