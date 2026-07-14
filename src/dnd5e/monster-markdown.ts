// Pure — no `obsidian` import. Renders a built monster to readable markdown:
// the note's `## Stat block` section content and the freshly-seeded body.
// The note stays useful without the plugin installed — the stat block is
// plain markdown, no plugin-side rendering required.

import { ABILITY_NAMES } from "../content/monster-builder";
import type { DerivedMonster } from "./monster-build";
import { crLabel, statsForCr } from "./monster-build";

const STAT_BLOCK_HEADING = "Stat block";
const NOTES_HEADING = "Notes";

export function monsterStatBlockMarkdown(derived: DerivedMonster): string {
	const { build } = derived;
	const lines: string[] = [];
	if (build.flavor) lines.push(`*${build.flavor}*`, "");
	const table = statsForCr(build.cr);
	const hpRange = table ? ` (range ${table.hpMin}–${table.hpMax})` : "";
	lines.push(`**Armor Class** ${build.ac} · **Hit Points** ${build.hp}${hpRange} · **CR** ${crLabel(build.cr)}`);
	const attackNoun = derived.effectiveAttacks === 1 ? "attack" : "attacks";
	const dice = build.damageDice ? ` (${build.damageDice})` : "";
	const types = build.damageTypes ? ` ${build.damageTypes}` : "";
	if (derived.effectiveAttacks > 0) {
		lines.push(
			`**Attacks** ${derived.effectiveAttacks} ${attackNoun}, +${build.profBonus} to hit, ${build.damagePerAttack}${dice}${types} damage each — ${derived.damagePerRound} damage per round`
		);
	} else {
		lines.push(`**Attacks** none — this creature's features carry its whole damage budget`);
	}
	lines.push(`**Save DC** ${build.dc}`);
	if (build.abilities.length > 0) {
		const names = build.abilities.map((ability) => ABILITY_NAMES[ability]).join(", ");
		lines.push(`**Proficient** ${names} +${build.profBonus}`);
	}
	for (const feature of derived.featureLines) {
		const damage = feature.damage !== undefined ? ` About ${feature.damage} damage.` : "";
		lines.push("", `***${feature.name}.*** ${feature.text}${damage}`);
	}
	for (const id of derived.unknownFeatures) {
		lines.push("", `***${id}.***`);
	}
	return lines.join("\n");
}

/** Fresh note body: a rendered stat block plus an empty freeform notes
 * section. `statBlockOverride` carries a preset's verbatim block instead of
 * the derived rendering. */
export function seededMonsterBody(derived: DerivedMonster, statBlockOverride?: string): string {
	const statBlock = statBlockOverride ?? monsterStatBlockMarkdown(derived);
	return `## ${STAT_BLOCK_HEADING}\n\n${statBlock}\n\n## ${NOTES_HEADING}\n\n`;
}

export { STAT_BLOCK_HEADING as MONSTER_STAT_BLOCK_HEADING, NOTES_HEADING as MONSTER_NOTES_HEADING };
