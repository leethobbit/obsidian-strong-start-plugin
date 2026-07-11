import { describe, expect, it } from "vitest";
import { createRng } from "../src/lib/rng";

describe("createRng", () => {
	it("produces the same sequence for the same seed", () => {
		const a = createRng(42);
		const b = createRng(42);
		const sequenceA = Array.from({ length: 10 }, () => a());
		const sequenceB = Array.from({ length: 10 }, () => b());
		expect(sequenceA).toEqual(sequenceB);
	});

	it("produces different sequences for different seeds", () => {
		const a = createRng(1);
		const b = createRng(2);
		expect(a()).not.toBe(b());
	});

	it("always returns a value in [0, 1)", () => {
		const rng = createRng(9);
		for (let i = 0; i < 1000; i++) {
			const value = rng();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});
