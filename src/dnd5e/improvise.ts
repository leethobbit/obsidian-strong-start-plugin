// Pure — no `obsidian` import. "Tools for 5e Improvisation" verbatim
// (docs/lazy-gm-resource-document.md): improvised difficulty checks,
// improvised damage, quick monster statistics by challenge rating, plus
// "Monster Difficulty Dials". All of it is deliberately rough — monster stats
// as published are "the average of their type" (Monster Difficulty Dials) —
// never present any of this as more precise than the doc does.

/** "Difficulty Checks" (doc): "For any given task or challenge, ask yourself
 * how hard it is to accomplish. Then assign a DC from 10 (easy) to 20 (very
 * hard). If a task is trivial, don't bother asking for a roll... reserve DCs
 * above 20 for superhuman challenges." DC 12 recurs through the doc as its
 * own suggested default ("Improvise DCs for social interaction... A default
 * of DC 12 is usually a good choice", repeated verbatim for travel checks). */
export interface ImprovisedDcBand {
	name: string;
	/** Null for "Trivial" — the doc says don't even roll. */
	dc: number | null;
	description: string;
}

export const IMPROVISED_DC_BANDS: readonly ImprovisedDcBand[] = [
	{ name: "Trivial", dc: null, description: "Don't ask for a roll — the character automatically succeeds." },
	{ name: "Easy", dc: 10, description: "The low end of the doc's range." },
	{ name: "Moderate", dc: 12, description: "The doc's own default whenever you're not sure — most social and travel checks land here." },
	{ name: "Very hard", dc: 20, description: "The high end of the doc's range — reserve anything above this for superhuman challenges." },
];

export const SUPERHUMAN_DC_NOTE = "Reserve DCs above 20 for superhuman challenges.";

/** "Improvised Damage" (doc): "Decide on a challenge rating (CR) for the
 * source of the damage, from CR 1 (low challenge) to CR 20 (very high
 * challenge)." */
export interface ImprovisedDamage {
	cr: number;
	/** Single-Target Damage: 7 × CR (or 2d6 per CR). */
	singleTarget: number;
	/** Multiple-Target Damage: 3 × CR (or 1d6 per CR) — yes, 3 rather than the
	 * true 3.5 average of 1d6; that's the doc's own round figure, kept
	 * verbatim rather than "corrected". */
	multiTarget: number;
}

export function improviseDamage(cr: number): ImprovisedDamage {
	return { cr, singleTarget: 7 * cr, multiTarget: 3 * cr };
}

/** Dice notation only makes sense at whole-number CR — each point of CR adds
 * one more "2d6"/"1d6" group per the doc's "or ... per CR" phrasing. Returns
 * null below CR 1 (fractional CR has no clean per-CR dice grouping). */
export function improviseDamageDice(cr: number): { singleTarget: string; multiTarget: string } | null {
	if (!Number.isInteger(cr) || cr < 1) return null;
	return { singleTarget: `${cr * 2}d6`, multiTarget: `${cr}d6` };
}

// NOTE (M18): this module previously carried "Improvised Statistics"
// (`quickMonsterStats` — AC = 12 + ½CR, HP = 20 × CR, attack = 3 + ½CR).
// Those formulas were transcribed verbatim from THIS doc, but the newer Lazy
// GM's 5e Monster Builder Resource Document ships a full per-CR statistics
// table that disagrees with them (e.g. CR 5: table AC 15/HP 95/attack +7 vs
// formulas AC 14/HP 100/attack +5). The per-CR table
// (src/content/monster-builder.ts, MONSTER_STATS_BY_CR) deliberately
// superseded the formulas everywhere — don't "restore" quickMonsterStats.

/** The standard 5e challenge rating scale (0 to 30) — the full row set for a
 * monster-statistics-by-CR reference table; callers slice/filter for a more
 * compact display. */
export const STANDARD_CHALLENGE_RATINGS: readonly number[] = [
	0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
];

/** "Monster Difficulty Dials" (doc): the four named dials, condensed to one
 * line each. "Mix and Match" is the doc's guidance about combining dials, not
 * a fifth dial, so it isn't listed as an item here. */
export interface MonsterDifficultyDial {
	name: string;
	description: string;
}

export const MONSTER_DIFFICULTY_DIALS: readonly MonsterDifficultyDial[] = [
	{
		name: "Hit points",
		description:
			"Adjust within the monster's Hit Dice range — or just halve/double the average for a quick weaker or stronger version.",
	},
	{
		name: "Number of monsters",
		description:
			"Let monsters flee, arrive as reinforcements, or drop out mid-fight — the most dramatic dial, and the hardest to turn unseen.",
	},
	{
		name: "Damage",
		description: "Adjust damage within the attack's dice range, or add extra dice for a clear, in-fiction threat increase.",
	},
	{
		name: "Number of attacks",
		description: "More attacks per turn raises threat more than raising damage does — and vice versa to ease off.",
	},
];
