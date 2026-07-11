// Pure — no `obsidian` import. Full `NdM(+|-)K` dice parser/roller, plus bare
// `dM` (implied N=1) and constant expressions (`5`, `-2`). Invalid input
// returns `null` and this module never throws — `roll.ts` relies on that to
// fail soft on malformed `{{...}}` template tokens instead of surfacing an
// error to the GM.

const DICE_RE = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i;
const CONSTANT_RE = /^\s*([+-]?\d+)\s*$/;

// Sanity bounds — reject absurd expressions rather than hang the UI on a
// malformed hand-authored user table row.
const MAX_COUNT = 100;
const MAX_SIDES = 1000;

export interface DiceExpr {
	/** Number of dice; 0 for a bare constant expression. */
	count: number;
	/** Die sides; 0 for a bare constant expression. */
	sides: number;
	modifier: number;
}

export interface DiceRollResult {
	total: number;
	/** Individual die results, in roll order; empty for a bare constant. */
	rolls: number[];
	modifier: number;
}

/** Parse (never throws) — `null` for anything that isn't a valid dice or
 * constant expression, including out-of-bounds counts/sides. */
export function parseDice(expr: string): DiceExpr | null {
	const diceMatch = DICE_RE.exec(expr);
	if (diceMatch) {
		const count = diceMatch[1].length > 0 ? Number(diceMatch[1]) : 1;
		const sides = Number(diceMatch[2]);
		const modifier = diceMatch[3] ? Number(diceMatch[3].replace(/\s+/g, "")) : 0;
		if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) return null;
		if (!Number.isInteger(sides) || sides < 1 || sides > MAX_SIDES) return null;
		return { count, sides, modifier };
	}

	const constantMatch = CONSTANT_RE.exec(expr);
	if (constantMatch) {
		return { count: 0, sides: 0, modifier: Number(constantMatch[1]) };
	}

	return null;
}

/** Roll a parsed (or parseable) expression against `rng`. `null` on anything
 * `parseDice` rejects. */
export function rollDice(expr: string, rng: () => number): DiceRollResult | null {
	const parsed = parseDice(expr);
	if (!parsed) return null;

	const rolls: number[] = [];
	for (let i = 0; i < parsed.count; i++) {
		rolls.push(1 + Math.floor(rng() * parsed.sides));
	}
	const total = rolls.reduce((sum, roll) => sum + roll, parsed.modifier);
	return { total, rolls, modifier: parsed.modifier };
}
