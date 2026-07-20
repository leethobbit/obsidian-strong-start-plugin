import { describe, expect, it } from "vitest";
import { assessEncounter, deadlyBenchmark, isSingleMonsterDeadly } from "../src/dnd5e/benchmark";

/**
 * The doc's own "Lazy Encounter Benchmark for Potentially Deadly Encounters"
 * table (docs/lazy-gm-resource-document.md, "Lazy Combat Encounter Building
 * for 5e") for three, four, five, and six same-level characters, levels 1-20.
 * `cr` entries are `[lower]` or `[lower, higher]` (the 11th-level-and-up
 * optional-guideline range); `maxCr` is the "Max Single Monster CR" column.
 */
const TABLE: ReadonlyArray<{
	level: number;
	partySizes: readonly [number, number, number, number]; // 3, 4, 5, 6 characters
	cr: readonly [number, number, number, number] | readonly [[number, number], [number, number], [number, number], [number, number]];
	maxCr: number;
}> = [
	{ level: 1, partySizes: [3, 4, 5, 6], cr: [1, 1, 1, 2], maxCr: 0.5 },
	{ level: 2, partySizes: [3, 4, 5, 6], cr: [2, 2, 3, 3], maxCr: 2 },
	{ level: 3, partySizes: [3, 4, 5, 6], cr: [2, 3, 4, 5], maxCr: 3 },
	{ level: 4, partySizes: [3, 4, 5, 6], cr: [3, 4, 5, 6], maxCr: 4 },
	{ level: 5, partySizes: [3, 4, 5, 6], cr: [8, 10, 13, 15], maxCr: 8 },
	{ level: 6, partySizes: [3, 4, 5, 6], cr: [9, 12, 15, 18], maxCr: 9 },
	{ level: 7, partySizes: [3, 4, 5, 6], cr: [11, 14, 18, 21], maxCr: 11 },
	{ level: 8, partySizes: [3, 4, 5, 6], cr: [12, 16, 20, 24], maxCr: 12 },
	{ level: 9, partySizes: [3, 4, 5, 6], cr: [14, 18, 23, 27], maxCr: 14 },
	{ level: 10, partySizes: [3, 4, 5, 6], cr: [15, 20, 25, 30], maxCr: 15 },
	{
		level: 11,
		partySizes: [3, 4, 5, 6],
		cr: [
			[17, 25],
			[22, 33],
			[28, 41],
			[33, 50],
		],
		maxCr: 17,
	},
	{
		level: 12,
		partySizes: [3, 4, 5, 6],
		cr: [
			[18, 27],
			[24, 36],
			[30, 45],
			[36, 54],
		],
		maxCr: 18,
	},
	{
		level: 16,
		partySizes: [3, 4, 5, 6],
		cr: [
			[24, 36],
			[32, 48],
			[40, 60],
			[48, 72],
		],
		maxCr: 24,
	},
	{
		level: 17,
		partySizes: [3, 4, 5, 6],
		cr: [
			[26, 51],
			[34, 68],
			[43, 85],
			[51, 102],
		],
		maxCr: 26,
	},
	{
		level: 20,
		partySizes: [3, 4, 5, 6],
		cr: [
			[30, 60],
			[40, 80],
			[50, 100],
			[60, 120],
		],
		maxCr: 30,
	},
];

describe("deadlyBenchmark against the doc's own table", () => {
	for (const row of TABLE) {
		for (let i = 0; i < row.partySizes.length; i++) {
			const size = row.partySizes[i];
			const expected = row.cr[i];

			it(`level ${row.level}, ${size} characters`, () => {
				const partyLevels = Array.from({ length: size }, () => row.level);
				const bench = deadlyBenchmark(partyLevels);

				if (Array.isArray(expected)) {
					expect(bench.crThreshold).toBe(expected[0]);
					expect(bench.higherCrThreshold).toBe(expected[1]);
				} else {
					expect(bench.crThreshold).toBe(expected);
					expect(bench.higherCrThreshold).toBeUndefined();
				}
				expect(bench.maxSingleMonsterCr).toBe(row.maxCr);
			});
		}
	}
});

describe("deadlyBenchmark edge behavior", () => {
	it("throws on an empty party", () => {
		expect(() => deadlyBenchmark([])).toThrow(RangeError);
	});

	it("uses /4 exactly through 4th level and switches to /2 exactly at 5th (the doc's stated cutover)", () => {
		expect(deadlyBenchmark([4, 4, 4, 4]).crThreshold).toBe(4); // 16/4
		expect(deadlyBenchmark([5, 5, 5, 5]).crThreshold).toBe(10); // 20/2
	});

	it("switches on the optional high-level guideline exactly at 11th level", () => {
		expect(deadlyBenchmark([10, 10, 10, 10]).higherCrThreshold).toBeUndefined();
		expect(deadlyBenchmark([11, 11, 11, 11]).higherCrThreshold).toBe(33);
	});

	it("switches the higher guideline from 3/4 to \"equal to total levels\" exactly at 17th level", () => {
		expect(deadlyBenchmark([16, 16, 16, 16]).higherCrThreshold).toBe(48); // 64 * 0.75
		expect(deadlyBenchmark([17, 17, 17, 17]).higherCrThreshold).toBe(68); // == totalLevels
	});

	it("approximates a mixed-level party by its average", () => {
		const bench = deadlyBenchmark([2, 4]); // average 3, below the 5th-level cutover
		expect(bench.averageLevel).toBe(3);
		expect(bench.representativeLevel).toBe(3);
		expect(bench.crThreshold).toBe(2); // 6/4 rounds to 2 (half rounds up)
	});

	it("rounds a fractional average level to a legal whole CR below 5th level (no CR 3.5)", () => {
		const bench = deadlyBenchmark([3, 4]); // average 3.5, representativeLevel rounds to 4
		expect(bench.averageLevel).toBe(3.5);
		expect(bench.maxSingleMonsterCr).toBe(4); // Math.round(3.5), ties up — not the raw 3.5
	});

	it("renders sub-1 CRs in the description as conventional fractions, not decimals", () => {
		const description = deadlyBenchmark([1, 1, 1, 1]).description;
		expect(description).toContain("CR 1/2");
		expect(description).not.toContain("CR 0.5");
	});

	it("includes a readable description with the 1st-level caution line only at 1st level", () => {
		expect(deadlyBenchmark([1, 1, 1]).description).toContain("Be extra careful at 1st level");
		expect(deadlyBenchmark([4, 4, 4]).description).not.toContain("Be extra careful");
	});
});

describe("assessEncounter", () => {
	it("flags an encounter over the baseline threshold as potentially deadly", () => {
		expect(assessEncounter([4, 4, 4, 4], 5)).toBe("potentially-deadly"); // threshold 4
		expect(assessEncounter([4, 4, 4, 4], 4)).toBe("within-guidelines");
	});

	it("only applies the high-level guideline threshold when asked to", () => {
		const partyLevels = [11, 11, 11, 11]; // baseline 22 (44/2), higher 33 (44*0.75)
		expect(assessEncounter(partyLevels, 25)).toBe("potentially-deadly");
		expect(assessEncounter(partyLevels, 25, { useHighLevelGuideline: true })).toBe("within-guidelines");
	});
});

describe("isSingleMonsterDeadly", () => {
	it("treats CR equal to the max single-monster CR as deadly (the doc's own wording is \"equal to\")", () => {
		expect(isSingleMonsterDeadly([4, 4, 4], 4)).toBe(true);
		expect(isSingleMonsterDeadly([4, 4, 4], 3)).toBe(false);
	});

	it("uses the 1st-level special case (CR 1/2), not the plain average-level formula", () => {
		expect(isSingleMonsterDeadly([1, 1, 1, 1], 0.5)).toBe(true);
		expect(isSingleMonsterDeadly([1, 1, 1, 1], 1)).toBe(true); // still deadly, just not the benchmark value
	});
});
