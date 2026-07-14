import { describe, expect, it } from "vitest";
import {
	IMPROVISED_DC_BANDS,
	MONSTER_DIFFICULTY_DIALS,
	improviseDamage,
	improviseDamageDice,
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
