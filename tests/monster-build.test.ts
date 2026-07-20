import { describe, expect, it } from "vitest";
import { MONSTER_STATS_BY_CR } from "../src/content/monster-builder";
import {
	baselineBuildFor,
	crLabel,
	deriveMonster,
	diceForAverage,
	statsForCr,
	suggestedCrForParty,
	withAttackCount,
} from "../src/dnd5e/monster-build";

describe("statsForCr / crLabel", () => {
	it("finds exact table lines, including fractions", () => {
		expect(statsForCr(0.125)?.label).toBe("1/8");
		expect(statsForCr(17)?.acDc).toBe(20);
		expect(statsForCr(3.5)).toBeNull();
	});

	it("labels CRs", () => {
		expect(crLabel(0.25)).toBe("1/4");
		expect(crLabel(12)).toBe("12");
	});
});

describe("suggestedCrForParty", () => {
	it("uses the equivalent-character-level column, averaged and floored", () => {
		// Eqv level 10 → CR 5; level 11 → CR 6.
		expect(suggestedCrForParty([10, 10, 10, 10])).toBe(5);
		expect(suggestedCrForParty([11, 11, 11, 11])).toBe(6);
		// Average 10.75 floors to 10 → still CR 5.
		expect(suggestedCrForParty([10, 11, 11, 11])).toBe(5);
	});

	it("clamps the extremes", () => {
		expect(suggestedCrForParty([1])).toBe(0.25); // eq level "1"
		expect(suggestedCrForParty([20])).toBe(14); // eq level "20"; "> 20" rows excluded
		expect(suggestedCrForParty([])).toBeNull();
	});
});

describe("baselineBuildFor", () => {
	it("copies the table row and defaults DC to the AC/DC column", () => {
		const build = baselineBuildFor(5);
		expect(build).toMatchObject({ cr: 5, ac: 15, dc: 15, hp: 95, profBonus: 7, attacks: 3, damagePerAttack: 12, damageDice: "3d6 + 2" });
		expect(build?.abilities).toEqual([]);
	});

	it("pre-suggests abilities from the role", () => {
		expect(baselineBuildFor(2, "bruiser")?.abilities).toEqual(["str", "con"]);
		expect(baselineBuildFor(99)).toBeNull();
	});
});

describe("diceForAverage", () => {
	it("matches the doc's averages table", () => {
		// Doc: 2d6 → 7, 4d8 → 18, 12d12 → 78, 1d4 → 2.
		expect(diceForAverage(7, 6)).toBe("2d6");
		expect(diceForAverage(18, 8)).toBe("4d8");
		expect(diceForAverage(78, 12)).toBe("12d12");
		expect(diceForAverage(2, 4)).toBe("1d4");
	});

	it("hits off-average targets with a modifier", () => {
		expect(diceForAverage(9, 6)).toBe("2d6 + 2");
		expect(diceForAverage(4, 6)).toBe("1d6 + 1");
		expect(diceForAverage(1, 6)).toBe("1d6 − 2");
	});
});

describe("withAttackCount", () => {
	it("re-splits the table's damage per round", () => {
		const base = baselineBuildFor(5);
		if (!base) throw new Error("missing CR 5");
		// CR 5: 35 damage/round over 3 attacks → over 2 attacks = 18 each.
		const two = withAttackCount(base, 2);
		expect(two.attacks).toBe(2);
		expect(two.damagePerAttack).toBe(18);
		expect(two.damageDice).toBe(diceForAverage(18));
	});

	it("restores the table dice string at the default count", () => {
		const base = baselineBuildFor(5);
		if (!base) throw new Error("missing CR 5");
		const roundTrip = withAttackCount(withAttackCount(base, 1), 3);
		expect(roundTrip.damageDice).toBe("3d6 + 2");
		expect(roundTrip.damagePerAttack).toBe(12);
	});

	// Regression: these CRs' damagePerRound isn't exactly attacks ×
	// damagePerAttack (the vendored table's own rounding), so restoring must
	// use the table's damagePerAttack verbatim, not recompute it from
	// damagePerRound — otherwise the round trip silently contradicts both the
	// table and the restored dice string.
	it("restores the table's damagePerAttack verbatim at the default count, even where the table's own rounding means attacks x damagePerAttack != damagePerRound", () => {
		const cases: ReadonlyArray<{ cr: number; damagePerAttack: number; damageDice: string }> = [
			{ cr: 0.125, damagePerAttack: 4, damageDice: "1d6 + 1" },
			{ cr: 9, damagePerAttack: 19, damageDice: "3d10 + 3" },
			{ cr: 16, damagePerAttack: 21, damageDice: "4d8 + 3" },
			{ cr: 17, damagePerAttack: 22, damageDice: "3d12 + 3" },
		];
		for (const { cr, damagePerAttack, damageDice } of cases) {
			const base = baselineBuildFor(cr);
			if (!base) throw new Error(`missing CR ${cr}`);
			const roundTrip = withAttackCount(withAttackCount(base, base.attacks + 1), base.attacks);
			expect(roundTrip.damagePerAttack, `CR ${cr}`).toBe(damagePerAttack);
			expect(roundTrip.damageDice, `CR ${cr}`).toBe(damageDice);
		}
	});
});

describe("deriveMonster", () => {
	const base = baselineBuildFor(5);
	if (!base) throw new Error("missing CR 5");

	it("passes through a featureless build", () => {
		const derived = deriveMonster(base);
		expect(derived.effectiveAttacks).toBe(3);
		expect(derived.damagePerRound).toBe(36);
		expect(derived.featureLines).toEqual([]);
	});

	it("subtracts one attack per attack-costing feature, stacking, floored at zero", () => {
		const aura = deriveMonster({ ...base, features: ["damaging-aura"] });
		expect(aura.effectiveAttacks).toBe(2);
		const both = deriveMonster({ ...base, features: ["damaging-aura", "damage-reflection"] });
		expect(both.effectiveAttacks).toBe(1);
		const minion = deriveMonster({ ...base, attacks: 1, features: ["damaging-aura", "damage-reflection"] });
		expect(minion.effectiveAttacks).toBe(0);
		expect(minion.damagePerRound).toBe(0);
	});

	it("resolves burst damage from the unreduced damage per round", () => {
		const derived = deriveMonster({ ...base, features: ["damaging-burst", "damaging-aura"] });
		const burst = derived.featureLines.find((line) => line.name === "Damaging Burst");
		// Half of the UNREDUCED 3 × 12 = 36 → 18, not half of the aura-reduced 24.
		expect(burst?.damage).toBe(18);
		const aura = derived.featureLines.find((line) => line.name === "Damaging Aura");
		expect(aura?.damage).toBe(6); // half of one attack's 12
	});

	it("keeps unknown feature ids visible without deriving them", () => {
		const derived = deriveMonster({ ...base, features: ["future-feature"] });
		expect(derived.unknownFeatures).toEqual(["future-feature"]);
		expect(derived.featureLines).toEqual([]);
	});
});

describe("table sanity used by the builder", () => {
	it("every table row derives cleanly", () => {
		for (const line of MONSTER_STATS_BY_CR) {
			const build = baselineBuildFor(line.cr);
			expect(build, `CR ${line.label}`).not.toBeNull();
			if (!build) continue;
			const derived = deriveMonster(build);
			expect(derived.effectiveAttacks).toBe(line.attacks);
		}
	});
});
