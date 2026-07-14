// Pure — no `obsidian` import. Derivation logic for the Monster Builder
// (Lazy GM's 5e Monster Builder Resource Document, "Building a Quick
// Monster"): CR table lookups, party-level → CR suggestion, attack re-splits,
// the doc's "Using Averages" dice math, and feature effects on the derived
// stat block. Data lives in src/content/monster-builder.ts.

import type { CrStatLine, MonsterFeature, MonsterRoleId } from "../content/monster-builder";
import { MONSTER_FEATURES, MONSTER_ROLES, MONSTER_STATS_BY_CR } from "../content/monster-builder";
import type { MonsterBuildFields } from "./monster-schema";

export function statsForCr(cr: number): CrStatLine | null {
	return MONSTER_STATS_BY_CR.find((line) => line.cr === cr) ?? null;
}

export function crLabel(cr: number): string {
	const line = statsForCr(cr);
	if (line) return line.label;
	if (cr > 0 && cr < 1) {
		const denominator = Math.round(1 / cr);
		return denominator > 1 ? `1/${denominator}` : String(cr);
	}
	return String(cr);
}

/** The table's "Equivalent Character Level" column as a comparable number:
 * "< 1" → 0, "> 20" → 21, else the printed level. */
function eqLevelValue(line: CrStatLine): number {
	if (line.eqLevel.startsWith("<")) return 0;
	if (line.eqLevel.startsWith(">")) return 21;
	return Number(line.eqLevel);
}

/**
 * Suggest a CR for a party using the table's own Equivalent Character Level
 * column ("a single monster of this challenge rating [against] a single
 * character ... in a hard encounter"): average the levels (rounded down, the
 * doc's averaging rule), then take the highest CR whose equivalent level
 * doesn't exceed it. Null when no levels are known.
 */
export function suggestedCrForParty(levels: readonly number[]): number | null {
	if (levels.length === 0) return null;
	const average = Math.floor(levels.reduce((sum, level) => sum + level, 0) / levels.length);
	let best: CrStatLine | null = null;
	for (const line of MONSTER_STATS_BY_CR) {
		if (eqLevelValue(line) <= average) best = line;
	}
	return best ? best.cr : MONSTER_STATS_BY_CR[0].cr;
}

/** Baseline build straight off the CR table row. A role only pre-suggests
 * proficient abilities (the doc's Step 3 ties proficiencies to the monster's
 * story) — it never changes the numbers. */
export function baselineBuildFor(cr: number, role?: MonsterRoleId): MonsterBuildFields | null {
	const line = statsForCr(cr);
	if (!line) return null;
	const roleDef = role ? MONSTER_ROLES.find((candidate) => candidate.id === role) : undefined;
	return {
		cr,
		role,
		ac: line.acDc,
		dc: line.acDc,
		hp: line.hpAvg,
		profBonus: line.profBonus,
		attacks: line.attacks,
		damagePerAttack: line.damagePerAttack,
		damageDice: line.damageDice,
		abilities: roleDef ? [...roleDef.suggestedAbilities] : [],
		features: [],
	};
}

/**
 * The doc's "Using Averages" math: the average of one die is half its size
 * (dropping the .5, as the doc's own table does — 1d6 → 3, 3d4 → 7). Builds
 * "NdX + M" hitting the requested average exactly via the modifier.
 */
export function diceForAverage(average: number, die: 4 | 6 | 8 | 10 | 12 = 6): string {
	const target = Math.max(1, Math.round(average));
	const perDie = (die + 1) / 2;
	let count = Math.max(1, Math.floor(target / perDie));
	let modifier = target - Math.floor(count * perDie);
	if (modifier < 0) {
		count = Math.max(1, count - 1);
		modifier = target - Math.floor(count * perDie);
	}
	if (modifier === 0) return `${count}d${die}`;
	return modifier > 0 ? `${count}d${die} + ${modifier}` : `${count}d${die} − ${-modifier}`;
}

/**
 * Re-split the CR line's total damage per round across a different number of
 * attacks ("you can divide up their total damage per round into a different
 * number of attacks"). Keeps the table's dice string only at the table's own
 * attack count; otherwise derives one via `diceForAverage`.
 */
export function withAttackCount(build: MonsterBuildFields, attacks: number): MonsterBuildFields {
	const line = statsForCr(build.cr);
	const count = Math.max(1, Math.round(attacks));
	if (!line) return { ...build, attacks: count };
	const perAttack = Math.max(1, Math.round(line.damagePerRound / count));
	return {
		...build,
		attacks: count,
		damagePerAttack: perAttack,
		damageDice: count === line.attacks ? line.damageDice : diceForAverage(perAttack),
	};
}

export interface DerivedFeatureLine {
	name: string;
	text: string;
	/** Resolved damage number for features whose text leaves it generic
	 * (reflection/aura: half of one attack; burst: half damage per round). */
	damage?: number;
	costsOneAttack: boolean;
}

export interface DerivedMonster {
	build: MonsterBuildFields;
	/** Attack count after feature costs (Damage Reflection / Damaging Aura
	 * each remove one; floored at 0 — the UI hints when nothing is left). */
	effectiveAttacks: number;
	/** effectiveAttacks × damagePerAttack. */
	damagePerRound: number;
	featureLines: readonly DerivedFeatureLine[];
	/** Feature ids on the build with no MONSTER_FEATURES definition (kept in
	 * frontmatter, surfaced so the UI can show them untyped). */
	unknownFeatures: readonly string[];
}

export function deriveMonster(build: MonsterBuildFields): DerivedMonster {
	const known: MonsterFeature[] = [];
	const unknown: string[] = [];
	for (const id of build.features) {
		const feature = MONSTER_FEATURES.find((candidate) => candidate.id === id);
		if (feature) known.push(feature);
		else unknown.push(id);
	}
	const attackCost = known.filter((feature) => feature.costsOneAttack).length;
	const effectiveAttacks = Math.max(0, build.attacks - attackCost);
	// Burst uses the UNREDUCED total (the doc prices attack-costing features
	// against the baseline attack count, not against each other).
	const unreducedPerRound = build.attacks * build.damagePerAttack;
	const featureLines = known.map((feature) => ({
		name: feature.name,
		text: feature.text,
		damage: feature.usesHalfDamagePerRound
			? Math.floor(unreducedPerRound / 2)
			: feature.usesHalfAttackDamage
				? Math.floor(build.damagePerAttack / 2)
				: undefined,
		costsOneAttack: feature.costsOneAttack,
	}));
	return {
		build,
		effectiveAttacks,
		damagePerRound: effectiveAttacks * build.damagePerAttack,
		featureLines,
		unknownFeatures: unknown,
	};
}
