import { describe, expect, it } from "vitest";
import {
	ABILITY_IDS,
	MONSTER_FEATURES,
	MONSTER_ROLES,
	MONSTER_STATS_BY_CR,
} from "../src/content/monster-builder";
import { GENERAL_USE_MONSTERS } from "../src/content/monster-builder-presets";
import { BOSS_MINION_PAIRINGS, MONSTERS_BY_LOCATION } from "../src/content/monster-builder-pairings";
import { STANDARD_CHALLENGE_RATINGS } from "../src/dnd5e/improvise";

describe("MONSTER_STATS_BY_CR", () => {
	it("covers the full standard CR scale, in order", () => {
		expect(MONSTER_STATS_BY_CR.map((line) => line.cr)).toEqual([...STANDARD_CHALLENGE_RATINGS]);
	});

	it("labels fractions as fractions", () => {
		const labels = new Map(MONSTER_STATS_BY_CR.map((line) => [line.cr, line.label]));
		expect(labels.get(0.125)).toBe("1/8");
		expect(labels.get(0.25)).toBe("1/4");
		expect(labels.get(0.5)).toBe("1/2");
		expect(labels.get(20)).toBe("20");
	});

	it("keeps damage per attack consistent with damage per round (doc's own rounding)", () => {
		for (const line of MONSTER_STATS_BY_CR) {
			// The table's per-attack damage is its per-round total split across
			// attacks, rounded to the dice equation's average — allow the doc's
			// own slack of a couple points either way.
			const split = line.damagePerRound / line.attacks;
			expect(Math.abs(line.damagePerAttack - split), `CR ${line.label}`).toBeLessThanOrEqual(2.5);
		}
	});

	it("has monotonically non-decreasing HP, AC, and proficiency", () => {
		for (let i = 1; i < MONSTER_STATS_BY_CR.length; i++) {
			const prev = MONSTER_STATS_BY_CR[i - 1];
			const line = MONSTER_STATS_BY_CR[i];
			expect(line.hpAvg, `CR ${line.label} hp`).toBeGreaterThanOrEqual(prev.hpAvg);
			expect(line.acDc, `CR ${line.label} ac`).toBeGreaterThanOrEqual(prev.acDc);
			expect(line.profBonus, `CR ${line.label} prof`).toBeGreaterThanOrEqual(prev.profBonus);
			expect(line.hpMin, `CR ${line.label} range`).toBeLessThanOrEqual(line.hpAvg);
			expect(line.hpMax, `CR ${line.label} range`).toBeGreaterThanOrEqual(line.hpAvg);
		}
	});

	it("spot-checks verbatim rows against the source doc", () => {
		const cr5 = MONSTER_STATS_BY_CR.find((line) => line.cr === 5);
		expect(cr5).toMatchObject({ acDc: 15, hpAvg: 95, profBonus: 7, damagePerRound: 35, attacks: 3, damagePerAttack: 12, damageDice: "3d6 + 2" });
		const cr30 = MONSTER_STATS_BY_CR.find((line) => line.cr === 30);
		expect(cr30).toMatchObject({ acDc: 27, hpAvg: 666, profBonus: 19, damagePerRound: 312, examples: ["Tarrasque"] });
	});
});

describe("MONSTER_FEATURES", () => {
	it("has exactly the doc's ten features", () => {
		expect(MONSTER_FEATURES).toHaveLength(10);
		expect(new Set(MONSTER_FEATURES.map((feature) => feature.id)).size).toBe(10);
	});

	it("marks exactly Damage Reflection and Damaging Aura as costing one attack", () => {
		const costly = MONSTER_FEATURES.filter((feature) => feature.costsOneAttack).map((feature) => feature.id);
		expect(costly.sort()).toEqual(["damage-reflection", "damaging-aura"]);
	});

	it("marks exactly Damaging Burst as using half damage per round", () => {
		const burst = MONSTER_FEATURES.filter((feature) => feature.usesHalfDamagePerRound);
		expect(burst.map((feature) => feature.id)).toEqual(["damaging-burst"]);
	});
});

describe("MONSTER_ROLES", () => {
	it("has the doc's seven roles with valid suggested abilities", () => {
		expect(MONSTER_ROLES.map((role) => role.id)).toEqual([
			"ambusher",
			"artillery",
			"bruiser",
			"controller",
			"defender",
			"leader",
			"skirmisher",
		]);
		for (const role of MONSTER_ROLES) {
			for (const ability of role.suggestedAbilities) {
				expect(ABILITY_IDS).toContain(ability);
			}
		}
	});
});

describe("GENERAL_USE_MONSTERS", () => {
	it("has the seven stat blocks at their printed CRs", () => {
		expect(GENERAL_USE_MONSTERS.map((preset) => [preset.id, preset.cr])).toEqual([
			["minion", 0.125],
			["soldier", 0.5],
			["brute", 2],
			["specialist", 4],
			["myrmidon", 7],
			["sentinel", 11],
			["champion", 15],
		]);
	});

	it("keeps build fields consistent with each preset's own stat block body", () => {
		for (const preset of GENERAL_USE_MONSTERS) {
			expect(preset.build.cr).toBe(preset.cr);
			expect(preset.build.template).toBe(preset.id);
			expect(preset.body).toContain(`**Armor Class** ${preset.build.ac}`);
			expect(preset.body).toContain(`**Hit Points** ${preset.build.hp} `);
			expect(preset.body).toContain(`+${preset.build.profBonus} to hit`);
			expect(preset.body).toContain(`*Hit:* ${preset.build.damagePerAttack} (${preset.build.damageDice})`);
		}
	});
});

describe("pairing and location tables", () => {
	it("carries the doc's boss list with non-empty pairings", () => {
		expect(BOSS_MINION_PAIRINGS.length).toBe(48);
		for (const pairing of BOSS_MINION_PAIRINGS) {
			expect(pairing.boss.length).toBeGreaterThan(0);
			expect(pairing.environments.length).toBeGreaterThan(0);
			expect(pairing.minions.length).toBeGreaterThan(0);
			expect(pairing.bossCr).toBeGreaterThanOrEqual(1);
			expect(pairing.bossCr).toBeLessThanOrEqual(24);
		}
		const crs = BOSS_MINION_PAIRINGS.map((pairing) => pairing.bossCr);
		expect([...crs].sort((a, b) => a - b)).toEqual(crs);
	});

	it("carries all twelve adventure locations with non-empty encounter rows", () => {
		expect(MONSTERS_BY_LOCATION).toHaveLength(12);
		expect(new Set(MONSTERS_BY_LOCATION.map((table) => table.id)).size).toBe(12);
		for (const table of MONSTERS_BY_LOCATION) {
			expect(table.rows.length).toBeGreaterThan(0);
			for (const row of table.rows) {
				expect(row.levelBand.length).toBeGreaterThan(0);
				expect(row.encounter.length).toBeGreaterThan(0);
			}
		}
	});
});
