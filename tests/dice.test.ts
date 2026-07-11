import { describe, expect, it } from "vitest";
import { createRng } from "../src/lib/rng";
import { parseDice, rollDice } from "../src/tables/dice";

describe("parseDice", () => {
	it("parses a full NdM+K expression", () => {
		expect(parseDice("2d6+1")).toEqual({ count: 2, sides: 6, modifier: 1 });
	});

	it("parses NdM-K", () => {
		expect(parseDice("3d8-2")).toEqual({ count: 3, sides: 8, modifier: -2 });
	});

	it("defaults the count to 1 for bare dM", () => {
		expect(parseDice("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
	});

	it("parses a bare positive constant", () => {
		expect(parseDice("5")).toEqual({ count: 0, sides: 0, modifier: 5 });
	});

	it("parses a bare negative constant", () => {
		expect(parseDice("-3")).toEqual({ count: 0, sides: 0, modifier: -3 });
	});

	it("tolerates internal whitespace", () => {
		expect(parseDice(" 2d6 + 1 ")).toEqual({ count: 2, sides: 6, modifier: 1 });
	});

	it("is case-insensitive on the d", () => {
		expect(parseDice("2D6")).toEqual({ count: 2, sides: 6, modifier: 0 });
	});

	it("rejects a zero count", () => {
		expect(parseDice("0d6")).toBeNull();
	});

	it("rejects zero sides", () => {
		expect(parseDice("2d0")).toBeNull();
	});

	it("rejects a count over the sanity bound", () => {
		expect(parseDice("101d6")).toBeNull();
	});

	it("rejects sides over the sanity bound", () => {
		expect(parseDice("2d1001")).toBeNull();
	});

	it("rejects garbage", () => {
		expect(parseDice("not a dice expression")).toBeNull();
	});

	it("rejects an empty string", () => {
		expect(parseDice("")).toBeNull();
	});

	it("rejects a table-id-shaped token", () => {
		expect(parseDice("npc-first-names")).toBeNull();
	});
});

describe("rollDice", () => {
	it("returns null for an invalid expression, never throws", () => {
		expect(() => rollDice("garbage", createRng(1))).not.toThrow();
		expect(rollDice("garbage", createRng(1))).toBeNull();
	});

	it("sums individual die rolls plus the modifier", () => {
		const rng = createRng(42);
		const result = rollDice("3d6+2", rng);
		expect(result).not.toBeNull();
		expect(result?.rolls).toHaveLength(3);
		expect(result?.rolls.every((r) => r >= 1 && r <= 6)).toBe(true);
		expect(result?.total).toBe(result!.rolls.reduce((sum, r) => sum + r, 0) + 2);
	});

	it("is deterministic for a given seed", () => {
		expect(rollDice("2d20", createRng(7))).toEqual(rollDice("2d20", createRng(7)));
	});

	it("rolls no dice for a bare constant", () => {
		const result = rollDice("5", createRng(1));
		expect(result).toEqual({ total: 5, rolls: [], modifier: 5 });
	});
});
