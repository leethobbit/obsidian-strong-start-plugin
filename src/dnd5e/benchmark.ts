// Pure — no `obsidian` import. The lazy encounter benchmark exactly as
// docs/lazy-gm-resource-document.md states it, cross-checked line-by-line
// against the doc's own "Lazy Encounter Benchmark for Potentially Deadly
// Encounters" summary table (in "Lazy Combat Encounter Building for 5e") —
// every branch below is validated against every row of that table in
// tests/dnd5e-benchmark.test.ts, not just spot-checked.
//
// Two passages state the same rule at different levels of detail:
//   - "Tools for 5e Improvisation" > "Deadly Encounter Benchmark" (quick form)
//   - "Lazy Combat Encounter Building for 5e" > "Potential Deadliness" /
//     "Scaling for Higher Levels" (the full derivation, including the
//     11th-level-and-up optional guideline)
//
// This is a GM's smell test, not CR math — the doc is explicit about that
// ("Character Capabilities Vary": "No chart, table, or equation works
// perfectly..."). Nothing here should be presented as more precise than that.

export interface DeadlyBenchmark {
	/** Sum of `partyLevels`. */
	totalLevels: number;
	/** Mean of `partyLevels`. The doc's table assumes one uniform level for
	 * the whole party — a mixed-level group is approximated here by its
	 * average. That averaging is an interpretation for this plugin's
	 * multi-level parties, not a rule the doc itself states. */
	averageLevel: number;
	/** `averageLevel` rounded to the nearest whole level — which row of the
	 * doc's per-level table this benchmark reduces to. */
	representativeLevel: number;
	/** Total monster CR above which an encounter "might be deadly" (doc,
	 * "Potential Deadliness"): `totalLevels / 4` for characters 1st–4th level,
	 * `totalLevels / 2` for 5th level and up. Rounded to the nearest whole CR
	 * (ties round up), matching the doc's own table exactly at every level. */
	crThreshold: number;
	/** Set only at 11th level and up: the doc's optional "Scaling for Higher
	 * Levels" guideline, which raises the benchmark for higher-level parties —
	 * `totalLevels × 3/4` through 16th level, `totalLevels` (equal to total
	 * levels) at 17th level and up. Undefined below 11th level, where the doc
	 * doesn't offer this adjustment. */
	higherCrThreshold?: number;
	/** CR at which a *single* monster alone "might be deadly" (doc: "equal to
	 * the average level of the characters or 1.5x the average level of the
	 * characters if they're above 5th level" —
	 * docs/lazy-gm-resource-document.md, "Lazy Combat Encounter Building for
	 * 5e"). Special-cased to CR 1/2 at 1st level to match the doc's own table
	 * exactly, rather than the plain formula's CR 1 — 1st-level characters
	 * have too little HP cushion for the general rule to hold ("5e Quick
	 * Encounter Building": "Be especially careful with potentially deadly
	 * encounters when the characters are 1st level"). Below 5th level,
	 * `averageLevel` itself is rounded to the nearest whole CR (ties up, same
	 * convention as `crThreshold`) — the doc's "equal to average level" line
	 * assumes a single uniform party level, but this plugin's averaging of a
	 * mixed-level party can land between two whole levels (e.g. 3.5), and
	 * every legal CR from 1 up is a whole number, so a fractional result here
	 * would render a CR that doesn't exist. */
	maxSingleMonsterCr: number;
	/** Ready-to-render sentence for the benchmark card/drawer. */
	description: string;
}

function formatCr(n: number): string {
	if (Number.isInteger(n)) return String(n);
	// Sub-1 CRs are conventionally written as fractions (1/8, 1/4, 1/2), never
	// as decimals — matches crLabel's denominator logic in monster-build.ts.
	if (n > 0 && n < 1) {
		const denominator = Math.round(1 / n);
		return `1/${denominator}`;
	}
	return n.toFixed(1);
}

function formatAverage(n: number): string {
	const rounded = Math.round(n * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * The lazy encounter benchmark for a party. Throws on an empty `partyLevels`
 * — every call site has a real roster or a manual-override stepper pair, so
 * an empty array is a caller bug, not a state this needs to render.
 */
export function deadlyBenchmark(partyLevels: readonly number[]): DeadlyBenchmark {
	if (partyLevels.length === 0) {
		throw new RangeError("deadlyBenchmark requires at least one character level.");
	}

	const totalLevels = partyLevels.reduce((sum, level) => sum + level, 0);
	const averageLevel = totalLevels / partyLevels.length;
	const representativeLevel = Math.max(1, Math.round(averageLevel));

	const crThreshold = Math.round(totalLevels / (representativeLevel >= 5 ? 2 : 4));

	let higherCrThreshold: number | undefined;
	if (representativeLevel >= 11) {
		higherCrThreshold = representativeLevel >= 17 ? totalLevels : Math.round(totalLevels * 0.75);
	}

	const maxSingleMonsterCr =
		representativeLevel <= 1 ? 0.5 : representativeLevel < 5 ? Math.round(averageLevel) : Math.round(averageLevel * 1.5);

	const partyPhrase =
		partyLevels.length === 1
			? `1 character at level ${representativeLevel}`
			: `${partyLevels.length} characters averaging level ${formatAverage(averageLevel)}`;

	let description = `With ${partyPhrase}, an encounter might be deadly if total monster CR is greater than ${formatCr(crThreshold)}`;
	if (higherCrThreshold !== undefined) {
		description += ` — or as high as ${formatCr(higherCrThreshold)} if you're using the optional high-level guideline (11th level and up)`;
	}
	description += `, or a single monster of CR ${formatCr(maxSingleMonsterCr)} or higher.`;
	if (representativeLevel <= 1) {
		description += " Be extra careful at 1st level — characters have very little room for error.";
	}

	return { totalLevels, averageLevel, representativeLevel, crThreshold, higherCrThreshold, maxSingleMonsterCr, description };
}

export type EncounterAssessment = "within-guidelines" | "potentially-deadly";

/**
 * Whether `totalMonsterCr` clears the deadly benchmark. `useHighLevelGuideline`
 * (default off) compares against `higherCrThreshold` instead of `crThreshold`
 * when the party is 11th level or up — the doc frames that guideline as
 * optional, not a replacement for the baseline rule, so callers opt in.
 */
export function assessEncounter(
	partyLevels: readonly number[],
	totalMonsterCr: number,
	options?: { useHighLevelGuideline?: boolean }
): EncounterAssessment {
	const bench = deadlyBenchmark(partyLevels);
	const threshold =
		options?.useHighLevelGuideline && bench.higherCrThreshold !== undefined ? bench.higherCrThreshold : bench.crThreshold;
	return totalMonsterCr > threshold ? "potentially-deadly" : "within-guidelines";
}

/** Whether a single monster of `monsterCr` alone clears the "a single monster
 * may be deadly" line (doc: "if it's challenge rating is equal to..."), so
 * equal-or-higher counts, not strictly-greater. */
export function isSingleMonsterDeadly(partyLevels: readonly number[], monsterCr: number): boolean {
	return monsterCr >= deadlyBenchmark(partyLevels).maxSingleMonsterCr;
}
