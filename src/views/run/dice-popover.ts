// Obsidian glue — the run top bar's dice popover: dice-count stepper ·
// die-type buttons · modifier stepper · Roll, replacing the old fixed-preset
// grid. Pure expression composition: `src/tables/dice.ts` already parses
// `NdM+K`, so the engine is untouched. The popover stays open after a roll —
// rerolling the same pool is the common case at the table; outside-click
// still closes it through the panel's existing handler.

import { renderStepper, type DomEventOwner, type StepperOptions } from "../panel-kit";
import { rollDice, type DiceRollResult } from "../../tables/dice";

/** The composed pool, owned by the run panel so it survives popover
 * open/close (in-memory only — resets with the panel like other run UI
 * state). */
export interface DiceConfig {
	count: number;
	sides: number;
	modifier: number;
}

export interface DicePopoverHost extends DomEventOwner {
	rng: () => number;
	onRoll(result: DiceRollResult, config: DiceConfig): void;
	onAdvantage(keepHigh: boolean): void;
}

const DIE_SIDES: readonly number[] = [4, 6, 8, 10, 12, 20, 100];
const COUNT_MAX = 20;
const MODIFIER_RANGE = 20;

function signed(value: number): string {
	return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}

function expression(config: DiceConfig): string {
	const mod = config.modifier === 0 ? "" : config.modifier > 0 ? `+${config.modifier}` : String(config.modifier);
	return `${config.count}d${config.sides}${mod}`;
}

export function mountDicePopover(el: HTMLElement, host: DicePopoverHost, config: DiceConfig): void {
	el.empty();
	el.addClass("strong-start-run-dice-popover");

	let rollBtn: HTMLButtonElement | null = null;
	const updateRollLabel = (): void => rollBtn?.setText(`Roll ${expression(config)}`);

	const countRow = el.createDiv({ cls: "strong-start-run-dice-config-row" });
	countRow.createSpan({ cls: "strong-start-run-dice-config-label", text: "Dice" });
	// `renderStepper` reads `options.value` at click time and hands back the
	// value span — mutate the shared options object and repaint the span
	// ourselves (the documented local-redraw pattern).
	const countOptions: StepperOptions = {
		value: config.count,
		min: 1,
		max: COUNT_MAX,
		label: "dice count",
		onChange: (next) => {
			config.count = next;
			countOptions.value = next;
			countValueEl.setText(String(next));
			updateRollLabel();
		},
	};
	const countValueEl = renderStepper(countRow, host, countOptions);

	const dieGrid = el.createDiv({ cls: "strong-start-run-dice-die-grid" });
	const dieButtons = new Map<number, HTMLButtonElement>();
	for (const sides of DIE_SIDES) {
		const btn = dieGrid.createEl("button", {
			cls: `strong-start-run-dice-die${config.sides === sides ? " is-selected" : ""}`,
			text: `d${sides}`,
			attr: { type: "button", "aria-label": `${sides}-sided die` },
		});
		dieButtons.set(sides, btn);
		host.registerDomEvent(btn, "click", () => {
			config.sides = sides;
			for (const [value, dieBtn] of dieButtons) dieBtn.toggleClass("is-selected", value === sides);
			updateRollLabel();
		});
	}

	const modRow = el.createDiv({ cls: "strong-start-run-dice-config-row" });
	modRow.createSpan({ cls: "strong-start-run-dice-config-label", text: "Modifier" });
	const modOptions: StepperOptions = {
		value: config.modifier,
		min: -MODIFIER_RANGE,
		max: MODIFIER_RANGE,
		label: "roll modifier",
		onChange: (next) => {
			config.modifier = next;
			modOptions.value = next;
			modValueEl.setText(signed(next));
			updateRollLabel();
		},
	};
	const modValueEl = renderStepper(modRow, host, modOptions);
	modValueEl.setText(signed(config.modifier));

	rollBtn = el.createEl("button", { cls: "mod-cta strong-start-run-dice-roll", attr: { type: "button" } });
	updateRollLabel();
	host.registerDomEvent(rollBtn, "click", () => {
		const result = rollDice(expression(config), host.rng);
		if (result) host.onRoll(result, { ...config });
	});

	const advRow = el.createDiv({ cls: "strong-start-run-dice-advrow" });
	const advBtn = advRow.createEl("button", { text: "Advantage", attr: { type: "button" } });
	host.registerDomEvent(advBtn, "click", () => host.onAdvantage(true));
	const disBtn = advRow.createEl("button", { text: "Disadvantage", attr: { type: "button" } });
	host.registerDomEvent(disBtn, "click", () => host.onAdvantage(false));
}

/** The toast's per-die breakdown line: `6 + 5 + 3 − 2`. Empty (no line worth
 * showing) for a single die with no modifier — the total already says it. */
export function rollDetail(result: DiceRollResult): string {
	if (result.rolls.length <= 1 && result.modifier === 0) return "";
	const dice = result.rolls.join(" + ");
	if (result.modifier === 0) return dice;
	return `${dice} ${result.modifier > 0 ? "+" : "−"} ${Math.abs(result.modifier)}`;
}
