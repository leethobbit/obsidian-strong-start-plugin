import { describe, expect, it } from "vitest";
import { pruneEmpty } from "../src/lib/frontmatter";
import { readCr, readMonsterFm, writeMonsterFm, type MonsterFm } from "../src/dnd5e/monster-schema";

const FULL: MonsterFm = {
	campaign: "[[Greenhollow]]",
	cr: 5,
	role: "bruiser",
	flavor: "Large fiend",
	ac: 16,
	dc: 15,
	hp: 95,
	profBonus: 7,
	attacks: 3,
	damagePerAttack: 12,
	damageDice: "3d6 + 2",
	damageTypes: "slashing",
	abilities: ["str", "con"],
	features: ["knockdown", "damaging-aura"],
	template: "brute",
};

const MINIMAL: MonsterFm = {
	campaign: "[[Greenhollow]]",
	cr: 0,
	ac: 10,
	dc: 10,
	hp: 3,
	profBonus: 2,
	attacks: 1,
	damagePerAttack: 2,
	abilities: [],
	features: [],
};

describe("monster codec round-trip", () => {
	it("round-trips a fully-populated model", () => {
		const written = writeMonsterFm(FULL);
		expect(written.type).toBe("monster");
		expect(readMonsterFm(written)).toEqual(FULL);
	});

	it("round-trips a minimal model through pruning (CR 0 survives)", () => {
		const pruned = pruneEmpty(writeMonsterFm(MINIMAL));
		expect(pruned.cr).toBe(0);
		expect(pruned.role).toBeUndefined();
		expect(pruned.abilities).toBeUndefined();
		expect(readMonsterFm(pruned)).toEqual(MINIMAL);
	});

	it("prunes cleared optionals from the written shape", () => {
		const pruned = pruneEmpty(writeMonsterFm(MINIMAL));
		expect(Object.keys(pruned).sort()).toEqual(["ac", "attacks", "campaign", "cr", "damagePerAttack", "dc", "hp", "profBonus", "type"]);
	});
});

describe("lenient reading", () => {
	it("accepts fraction and numeric-string CRs", () => {
		expect(readCr("1/8")).toBe(0.125);
		expect(readCr("1/2")).toBe(0.5);
		expect(readCr("5")).toBe(5);
		expect(readCr(0.25)).toBe(0.25);
		expect(readCr("goblin")).toBeNull();
		expect(readCr(-1)).toBeNull();
	});

	it("requires campaign and cr", () => {
		expect(readMonsterFm({ ...writeMonsterFm(FULL), campaign: "" })).toBeNull();
		expect(readMonsterFm({ ...writeMonsterFm(FULL), cr: "??" })).toBeNull();
		expect(readMonsterFm("nope")).toBeNull();
	});

	it("falls back to the CR table baseline for missing numeric fields", () => {
		const model = readMonsterFm({ campaign: "[[G]]", cr: 5 });
		expect(model).toMatchObject({ ac: 15, dc: 15, hp: 95, profBonus: 7, attacks: 3, damagePerAttack: 12 });
	});

	it("tolerates numeric strings from hand-edited frontmatter", () => {
		const model = readMonsterFm({ campaign: "[[G]]", cr: "5", ac: "16", hp: "100" });
		expect(model).toMatchObject({ cr: 5, ac: 16, hp: 100 });
	});

	it("drops unknown roles and invalid abilities but preserves unknown feature ids", () => {
		const model = readMonsterFm({
			campaign: "[[G]]",
			cr: 2,
			role: "linebacker",
			abilities: ["STR", "luck", "dex"],
			features: ["knockdown", "future-feature"],
		});
		expect(model?.role).toBeUndefined();
		expect(model?.abilities).toEqual(["str", "dex"]);
		expect(model?.features).toEqual(["knockdown", "future-feature"]);
	});
});
