import { describe, expect, it } from "vitest";
import {
	IMPROVISED_DC_BANDS,
	MONSTER_DIFFICULTY_DIALS,
	STANDARD_CHALLENGE_RATINGS,
	improviseDamage,
	improviseDamageDice,
	quickMonsterStats,
	quickMonsterStatsTable,
} from "../src/dnd5e/improvise";

describe("IMPROVISED_DC_BANDS", () => {
	it("spans the doc's stated range with no gaps or overlaps", () => {
		const dcs = IMPROVISED_DC_BANDS.map((b) => b.dc);
		expect(dcs[0]).toBeNull(); // Trivial — no roll
		const numeric = dcs.filter((dc): dc is number => dc !== null);
		expect(numeric[0]).toBe(10); // "Easy" — the doc's low end
		expect(numeric[numeric.length - 1]).toBe(20); // "Very hard" — the doc's high end
		for (let i = 1; i < numeric.length; i++) expect(numeric[i]).toBeGreaterThan(numeric[i - 1]);
	});

	it("includes the doc's own DC 12 default as the moderate band", () => {
		expect(IMPROVISED_DC_BANDS.find((b) => b.name === "Moderate")?.dc).toBe(12);
	});
});

describe("improviseDamage", () => {
	it("matches the doc's formula at CR 1 (7 x CR single-target, 3 x CR multi-target)", () => {
		expect(improviseDamage(1)).toEqual({ cr: 1, singleTarget: 7, multiTarget: 3 });
	});

	it("scales linearly with CR up to CR 20 (the doc's stated ceiling)", () => {
		expect(improviseDamage(20)).toEqual({ cr: 20, singleTarget: 140, multiTarget: 60 });
	});

	it("keeps the doc's own round multi-target figure (3), not the true 3.5 average of 1d6", () => {
		expect(improviseDamage(2).multiTarget).toBe(6);
	});
});

describe("improviseDamageDice", () => {
	it("expresses whole-CR damage as 2d6/1d6 groups per CR", () => {
		expect(improviseDamageDice(1)).toEqual({ singleTarget: "2d6", multiTarget: "1d6" });
		expect(improviseDamageDice(3)).toEqual({ singleTarget: "6d6", multiTarget: "3d6" });
	});

	it("returns null below CR 1 or for fractional CR (no clean per-CR dice grouping)", () => {
		expect(improviseDamageDice(0.5)).toBeNull();
		expect(improviseDamageDice(0)).toBeNull();
	});
});

describe("quickMonsterStats", () => {
	it("matches the doc's formulas at CR 0", () => {
		expect(quickMonsterStats(0)).toEqual({
			cr: 0,
			armorClass: 12,
			attackBonus: 3,
			saveDc: 12,
			savingThrowWithProficiency: 3,
			hitPoints: 0,
			damage: 0,
		});
	});

	it("matches the doc's formulas at an even CR", () => {
		expect(quickMonsterStats(4)).toEqual({
			cr: 4,
			armorClass: 14,
			attackBonus: 5,
			saveDc: 14,
			savingThrowWithProficiency: 5,
			hitPoints: 80,
			damage: 28,
		});
	});

	it("rounds the 1/2 CR term down at an odd CR (consistent with the doc's spell-infused-monster rounding rule)", () => {
		const stats = quickMonsterStats(5); // half CR = 2 (floor(2.5))
		expect(stats.armorClass).toBe(14);
		expect(stats.attackBonus).toBe(5);
		expect(stats.hitPoints).toBe(100);
		expect(stats.damage).toBe(35);
	});
});

describe("quickMonsterStatsTable", () => {
	it("covers the full standard CR scale with no gaps", () => {
		expect(quickMonsterStatsTable().map((row) => row.cr)).toEqual([...STANDARD_CHALLENGE_RATINGS]);
	});

	it("is monotonically non-decreasing across CR for every stat (no overlaps working backwards)", () => {
		const rows = quickMonsterStatsTable();
		for (let i = 1; i < rows.length; i++) {
			expect(rows[i].armorClass).toBeGreaterThanOrEqual(rows[i - 1].armorClass);
			expect(rows[i].attackBonus).toBeGreaterThanOrEqual(rows[i - 1].attackBonus);
			expect(rows[i].hitPoints).toBeGreaterThanOrEqual(rows[i - 1].hitPoints);
			expect(rows[i].damage).toBeGreaterThanOrEqual(rows[i - 1].damage);
		}
	});

	it("accepts a custom CR list for a compact display", () => {
		const rows = quickMonsterStatsTable([1, 5, 10]);
		expect(rows.map((r) => r.cr)).toEqual([1, 5, 10]);
	});
});

describe("MONSTER_DIFFICULTY_DIALS", () => {
	it("lists exactly the doc's four named dials, each with a description", () => {
		expect(MONSTER_DIFFICULTY_DIALS.map((d) => d.name)).toEqual([
			"Hit points",
			"Number of monsters",
			"Damage",
			"Number of attacks",
		]);
		for (const dial of MONSTER_DIFFICULTY_DIALS) expect(dial.description.length).toBeGreaterThan(0);
	});
});
