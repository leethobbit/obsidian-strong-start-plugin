// Obsidian glue for the pure `src/dnd5e/{benchmark,improvise}.ts` modules —
// mounted behind `featureEnabled(settings, "dnd5e")` in two places (docs/plan.md
// M10): the prep board's Monsters step (`views/prep/steps/monsters.ts`) and the
// run-mode 5e drawer (`views/run/run-panel.ts`). Every render function here is
// read-mostly reference material; only the benchmark card's manual override
// steppers are interactive, and that state is in-memory only (never persisted
// — AGENTS.md: data.json is for settings/UI state, not scratch state like this).

import { deadlyBenchmark, type DeadlyBenchmark } from "./benchmark";
import { IMPROVISED_DC_BANDS, MONSTER_DIFFICULTY_DIALS, improviseDamage } from "./improvise";
import { MONSTER_STATS_BY_CR } from "../content/monster-builder";
import { BOSS_MINION_PAIRINGS, MONSTERS_BY_LOCATION } from "../content/monster-builder-pairings";
import { TRAVEL_DEFAULT_DC, TRAVEL_EXTRA_RULES, TRAVEL_FRAMEWORK, TRAVEL_ROLES } from "../content/wilderness";
import { STRESS_PROCEDURE } from "../content/stress";
import { renderEmptyState, renderStepper, type DomEventOwner } from "../views/panel-kit";
import type { PcModel } from "../roster/types";

const MIN_PARTY_SIZE = 1;
const MAX_PARTY_SIZE = 8;
const MIN_LEVEL = 1;
const MAX_LEVEL = 20;

/** A compact CR slice for the drawer/card's "quick monster stats" table — the
 * full `STANDARD_CHALLENGE_RATINGS` scale (0 to 30) is more rows than a
 * reference table needs at a glance. */
const COMPACT_CRS: readonly number[] = [0, 0.5, 1, 2, 3, 5, 8, 10, 13, 16, 20, 24, 30];

function levelOf(pc: PcModel): number | undefined {
	return pc.level;
}

export interface BenchmarkCardOptions {
	owner: DomEventOwner;
	/** The active campaign's PC roster — the card uses whichever of these
	 * carry a `level` (SCHEMA.md), and falls back to a manual override when
	 * none do. */
	pcs: readonly PcModel[];
}

/**
 * The "lazy encounter benchmark" card (docs/plan.md M10): party summary, the
 * deadly-benchmark readout, and a manual party-size/level override for GMs
 * without leveled PC notes. Self-contained and self-rerendering (mirrors
 * `chip-editor.ts`'s local-redraw pattern) so it can be dropped into the
 * Monsters step and the run-mode drawer without either caller managing its
 * state.
 */
export function renderBenchmarkCard(container: HTMLElement, options: BenchmarkCardOptions): void {
	const leveledPcs = options.pcs.filter((pc) => levelOf(pc) !== undefined);

	// Manual override starts from the roster when there is one, purely as a
	// sensible starting point — switching to "manual" only happens once the
	// GM actually touches a stepper (see `usingManual` below).
	let manualSize = leveledPcs.length > 0 ? leveledPcs.length : 4;
	let manualLevel =
		leveledPcs.length > 0 ? Math.round(leveledPcs.reduce((sum, pc) => sum + (levelOf(pc) ?? 0), 0) / leveledPcs.length) : 3;
	let usingManual = leveledPcs.length === 0;

	const card = container.createDiv({ cls: "lazy-campaign-dnd5e-benchmark-card" });
	const summaryEl = card.createDiv({ cls: "lazy-campaign-dnd5e-benchmark-summary" });
	const readoutEl = card.createDiv({ cls: "lazy-campaign-dnd5e-benchmark-readout" });
	const manualRow = card.createDiv({ cls: "lazy-campaign-dnd5e-benchmark-manual" });

	function effectivePartyLevels(): number[] {
		if (!usingManual && leveledPcs.length > 0) {
			return leveledPcs.map((pc) => levelOf(pc) ?? MIN_LEVEL);
		}
		return Array.from({ length: manualSize }, () => manualLevel);
	}

	function renderSummary(): void {
		summaryEl.empty();
		if (!usingManual && leveledPcs.length > 0) {
			const levels = leveledPcs.map((pc) => levelOf(pc) ?? MIN_LEVEL);
			const min = Math.min(...levels);
			const max = Math.max(...levels);
			const levelText = min === max ? `level ${min}` : `levels ${min}-${max}`;
			const noun = leveledPcs.length === 1 ? "character" : "characters";
			summaryEl.setText(`${leveledPcs.length} ${noun}, ${levelText}`);
		} else {
			renderEmptyState(summaryEl, "Set character levels to size the benchmark — using the manual party below for now.");
		}
	}

	function renderReadout(): void {
		readoutEl.empty();
		let bench: DeadlyBenchmark;
		try {
			bench = deadlyBenchmark(effectivePartyLevels());
		} catch {
			renderEmptyState(readoutEl, "Add a character to size the benchmark.");
			return;
		}
		readoutEl.setText(bench.description);
	}

	function renderManualRow(): void {
		manualRow.empty();

		if (leveledPcs.length > 0) {
			manualRow.createEl("h4", { text: "Manual override" });
			const hint = manualRow.createEl("p", {
				cls: "lazy-campaign-hint",
				text: "For a quick what-if — switches away from the party's own levels as soon as you touch a stepper.",
			});
			if (usingManual) {
				const resetLink = hint.createEl("a", { text: " Use the party's levels instead.", attr: { href: "#" } });
				options.owner.registerDomEvent(resetLink, "click", (evt) => {
					evt.preventDefault();
					usingManual = false;
					rerender();
				});
			}
		} else {
			manualRow.createEl("h4", { text: "Manual party" });
		}

		const sizeRow = manualRow.createDiv({ cls: "lazy-campaign-dnd5e-benchmark-manual-row" });
		sizeRow.createSpan({ text: "Party size" });
		renderStepper(sizeRow, options.owner, {
			value: manualSize,
			min: MIN_PARTY_SIZE,
			max: MAX_PARTY_SIZE,
			label: "manual party size",
			onChange: (next) => {
				manualSize = next;
				usingManual = true;
				rerender();
			},
		});

		const levelRow = manualRow.createDiv({ cls: "lazy-campaign-dnd5e-benchmark-manual-row" });
		levelRow.createSpan({ text: "Level" });
		renderStepper(levelRow, options.owner, {
			value: manualLevel,
			min: MIN_LEVEL,
			max: MAX_LEVEL,
			label: "manual party level",
			onChange: (next) => {
				manualLevel = next;
				usingManual = true;
				rerender();
			},
		});
	}

	function rerender(): void {
		renderSummary();
		renderReadout();
		renderManualRow();
	}

	rerender();
}

/** Improvised DCs (doc: "Difficulty Checks") — a compact three-column row
 * (Easy/Moderate/Very hard); "Trivial" and the superhuman note render as
 * bookend hints either side, since neither is a DC number to compare against. */
export function renderImprovisedDcSection(container: HTMLElement): void {
	const trivial = IMPROVISED_DC_BANDS.find((b) => b.dc === null);
	if (trivial) container.createEl("p", { cls: "lazy-campaign-hint", text: trivial.description });

	const row = container.createDiv({ cls: "lazy-campaign-dnd5e-dc-row" });
	for (const band of IMPROVISED_DC_BANDS) {
		if (band.dc === null) continue;
		const cell = row.createDiv({ cls: "lazy-campaign-dnd5e-dc-band" });
		cell.createDiv({ cls: "lazy-campaign-dnd5e-dc-value", text: `DC ${band.dc}` });
		cell.createDiv({ cls: "lazy-campaign-dnd5e-dc-name", text: band.name });
	}

	container.createEl("p", {
		cls: "lazy-campaign-hint",
		text: "Reserve DCs above 20 for superhuman challenges.",
	});
}

/** Improvised damage (doc: "Improvised Damage") — single-target and
 * multi-target average damage across the CR 1-20 range, as a small table. */
export function renderImprovisedDamageTable(container: HTMLElement): void {
	const table = container.createEl("table", { cls: "lazy-campaign-dnd5e-table" });
	const head = table.createEl("thead").createEl("tr");
	head.createEl("th", { text: "CR" });
	head.createEl("th", { text: "Single-target" });
	head.createEl("th", { text: "Multiple-target" });

	const body = table.createEl("tbody");
	for (const cr of COMPACT_CRS.filter((cr) => cr >= 1)) {
		const damage = improviseDamage(cr);
		const row = body.createEl("tr");
		row.createEl("td", { text: String(cr) });
		row.createEl("td", { text: String(damage.singleTarget) });
		row.createEl("td", { text: String(damage.multiTarget) });
	}
}

/**
 * Monster statistics by CR (Lazy GM's 5e Monster Builder RD) — supersedes the
 * old formula-derived quick-stats table (M18; the two source docs disagree on
 * quick-stat math, and this per-CR table is the newer, fuller one). Compact
 * slice by default with an "All CRs" toggle.
 */
export function renderMonsterStatsByCrTable(container: HTMLElement, owner: DomEventOwner): void {
	const wrap = container.createDiv({ cls: "lazy-campaign-dnd5e-table-scroll" });
	let expanded = false;

	const renderTable = (): void => {
		wrap.empty();
		const table = wrap.createEl("table", { cls: "lazy-campaign-dnd5e-table" });
		const head = table.createEl("thead").createEl("tr");
		for (const label of ["CR", "AC/DC", "HP", "Attack", "Attacks", "Damage"]) head.createEl("th", { text: label });

		const lines = expanded ? MONSTER_STATS_BY_CR : MONSTER_STATS_BY_CR.filter((line) => COMPACT_CRS.includes(line.cr));
		const body = table.createEl("tbody");
		for (const line of lines) {
			const row = body.createEl("tr");
			row.createEl("td", { text: line.label });
			row.createEl("td", { text: String(line.acDc) });
			row.createEl("td", { text: `${line.hpAvg} (${line.hpMin}–${line.hpMax})` });
			row.createEl("td", { text: `+${line.profBonus}` });
			row.createEl("td", { text: String(line.attacks) });
			row.createEl("td", { text: `${line.damagePerAttack} (${line.damageDice})` });
		}

		const toggle = wrap.createEl("a", {
			cls: "lazy-campaign-dnd5e-table-toggle",
			text: expanded ? "Fewer CRs" : "All CRs",
			attr: { href: "#" },
		});
		owner.registerDomEvent(toggle, "click", (evt) => {
			evt.preventDefault();
			expanded = !expanded;
			renderTable();
		});
	};

	renderTable();
}

/** Bosses and minions (Monster Builder RD) — the pairing table with a small
 * text filter over boss names and environments. */
export function renderBossMinionTable(container: HTMLElement, owner: DomEventOwner): void {
	const filterInput = container.createEl("input", {
		cls: "lazy-campaign-dnd5e-table-filter",
		attr: { type: "search", placeholder: "Filter by boss or environment…" },
	});
	const wrap = container.createDiv({ cls: "lazy-campaign-dnd5e-table-scroll" });

	const renderRows = (): void => {
		wrap.empty();
		const query = filterInput.value.trim().toLowerCase();
		const rows = BOSS_MINION_PAIRINGS.filter(
			(pairing) =>
				query.length === 0 ||
				pairing.boss.toLowerCase().includes(query) ||
				pairing.environments.toLowerCase().includes(query)
		);
		if (rows.length === 0) {
			renderEmptyState(wrap, "No bosses match that filter.");
			return;
		}
		const table = wrap.createEl("table", { cls: "lazy-campaign-dnd5e-table" });
		const head = table.createEl("thead").createEl("tr");
		for (const label of ["CR", "Boss", "Environments", "Minions"]) head.createEl("th", { text: label });
		const body = table.createEl("tbody");
		for (const pairing of rows) {
			const row = body.createEl("tr");
			row.createEl("td", { text: String(pairing.bossCr) });
			row.createEl("td", { text: pairing.boss });
			row.createEl("td", { text: pairing.environments });
			row.createEl("td", { text: pairing.minions });
		}
	};

	owner.registerDomEvent(filterInput, "input", renderRows);
	renderRows();
}

/** Monsters by adventure location (Monster Builder RD) — one location at a
 * time behind a select, each row a level band + example encounter. */
export function renderLocationMonstersSection(container: HTMLElement, owner: DomEventOwner): void {
	const select = container.createEl("select", { cls: "dropdown lazy-campaign-dnd5e-location-select" });
	for (const table of MONSTERS_BY_LOCATION) {
		select.createEl("option", { text: table.name, attr: { value: table.id } });
	}
	const wrap = container.createDiv({ cls: "lazy-campaign-dnd5e-table-scroll" });

	const renderRows = (): void => {
		wrap.empty();
		const location = MONSTERS_BY_LOCATION.find((table) => table.id === select.value) ?? MONSTERS_BY_LOCATION[0];
		const table = wrap.createEl("table", { cls: "lazy-campaign-dnd5e-table" });
		const head = table.createEl("thead").createEl("tr");
		for (const label of ["Levels", "Example encounter"]) head.createEl("th", { text: label });
		const body = table.createEl("tbody");
		for (const row of location.rows) {
			const tr = body.createEl("tr");
			tr.createEl("td", { text: row.levelBand });
			tr.createEl("td", { text: row.encounter });
		}
	};

	owner.registerDomEvent(select, "change", renderRows);
	renderRows();
}

/** Monster difficulty dials (doc: "Monster Difficulty Dials") — a plain
 * name + one-line description list. */
export function renderDifficultyDialsList(container: HTMLElement): void {
	const list = container.createDiv({ cls: "lazy-campaign-dnd5e-dials-list" });
	for (const dial of MONSTER_DIFFICULTY_DIALS) {
		const item = list.createDiv({ cls: "lazy-campaign-dnd5e-dial" });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-name", text: dial.name });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-desc", text: dial.description });
	}
}

/** Wilderness travel & exploration (doc: "Wilderness Travel and Exploration",
 * M15) — travel roles, group stealth, and the journey-building framework.
 * Reference prose, not tables (the doc section is procedure-shaped), reusing
 * the dials' name+description list styling. */
export function renderWildernessTravelSection(container: HTMLElement): void {
	container.createEl("p", { cls: "lazy-campaign-hint", text: TRAVEL_DEFAULT_DC });

	const roles = container.createDiv({ cls: "lazy-campaign-dnd5e-dials-list" });
	for (const role of TRAVEL_ROLES) {
		const item = roles.createDiv({ cls: "lazy-campaign-dnd5e-dial" });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-name", text: `${role.name} — ${role.skills}` });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-desc", text: role.summary });
	}

	const extras = container.createDiv({ cls: "lazy-campaign-dnd5e-dials-list" });
	for (const rule of [...TRAVEL_EXTRA_RULES, ...TRAVEL_FRAMEWORK]) {
		const item = extras.createDiv({ cls: "lazy-campaign-dnd5e-dial" });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-name", text: rule.name });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-desc", text: rule.text });
	}
}

/** Stress effects (doc: "Stress Effects", M16) — the procedure around the
 * `stress-triggers`/`stress-results` tables. The consent caveat leads on
 * purpose: the source conditions these rules on player permission and
 * session-zero review. */
export function renderStressEffectsSection(container: HTMLElement): void {
	const list = container.createDiv({ cls: "lazy-campaign-dnd5e-dials-list" });
	for (const rule of STRESS_PROCEDURE) {
		const item = list.createDiv({ cls: "lazy-campaign-dnd5e-dial" });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-name", text: rule.name });
		item.createDiv({ cls: "lazy-campaign-dnd5e-dial-desc", text: rule.text });
	}
	container.createEl("p", {
		cls: "lazy-campaign-hint",
		text: "Roll triggering situations and effects from the stress tables in the tables panel.",
	});
}
