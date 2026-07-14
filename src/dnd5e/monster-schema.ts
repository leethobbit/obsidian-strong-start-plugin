// Pure — no `obsidian` import. Lenient reader + strict writer for the
// monster note type (SCHEMA.md: `type: monster`, M18). Mirrors
// roster/entity-schema.ts. Lives in src/dnd5e/ rather than src/roster/
// because the monster note is a 5e-module artifact (AGENTS.md boundary: the
// core stays system-agnostic) — everything about it gates on the `dnd5e`
// feature toggle.

import type { AbilityId, MonsterRoleId } from "../content/monster-builder";
import { ABILITY_IDS, MONSTER_ROLES, MONSTER_STATS_BY_CR } from "../content/monster-builder";

/** The lean build parameters — everything the stat-block derivation needs.
 * Damage per round is always derived (`attacks × damagePerAttack`), never
 * stored. Ability-score arrays and skill lists stay in the note body. */
export interface MonsterBuildFields {
	/** Numeric CR; fractions as 0.125 / 0.25 / 0.5. */
	cr: number;
	role?: MonsterRoleId;
	/** Free size/type line — "Large fiend". Display only. */
	flavor?: string;
	ac: number;
	/** Save DC for the monster's own abilities (the table's AC/DC column;
	 * builder defaults it equal to AC, tweakable apart). */
	dc: number;
	/** Baseline = table average; the doc treats HP-within-range as a primary
	 * difficulty dial, so it's stored, not derived. */
	hp: number;
	/** Proficient ability bonus — attack bonus AND proficient save/check bonus. */
	profBonus: number;
	/** Attacks per round, before feature costs (deriveMonster subtracts). */
	attacks: number;
	damagePerAttack: number;
	/** Optional dice equation ("3d6 + 2"); absent = averages only. */
	damageDice?: string;
	/** Free string — "slashing", "fire and cold". */
	damageTypes?: string;
	/** Proficient abilities; may be empty. */
	abilities: AbilityId[];
	/** Feature ids from MONSTER_FEATURES; unknown ids are preserved on read
	 * (forward compatibility with future doc features). */
	features: string[];
	/** Provenance: which general-use preset seeded this monster, if any. */
	template?: string;
}

export interface MonsterFm extends MonsterBuildFields {
	campaign: string;
}

/** A monster note as surfaced by the store (path + display name joined on). */
export interface MonsterNoteModel extends MonsterFm {
	path: string;
	name: string;
}

const ROLE_IDS = new Set<string>(MONSTER_ROLES.map((role) => role.id));
const ABILITY_SET = new Set<string>(ABILITY_IDS);

/** Lenient CR parse: a finite number, a numeric string, or a fraction string
 * ("1/8"). Returns null for anything else — CR is the one field a monster
 * note can't function without. */
export function readCr(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
	if (typeof value !== "string" || value.length === 0) return null;
	const fraction = value.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
	if (fraction) {
		const denominator = Number(fraction[2]);
		return denominator > 0 ? Number(fraction[1]) / denominator : null;
	}
	const num = Number(value);
	return Number.isFinite(num) && num >= 0 ? num : null;
}

function readNumberOr(value: unknown, fallback: number): number {
	const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return Number.isFinite(num) ? num : fallback;
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/** Nearest table line at or below the given CR (self-healing fallback source
 * for hand-edited notes missing a numeric field). */
function baselineLine(cr: number) {
	let line = MONSTER_STATS_BY_CR[0];
	for (const candidate of MONSTER_STATS_BY_CR) {
		if (candidate.cr <= cr) line = candidate;
	}
	return line;
}

export function readMonsterFm(fm: unknown): MonsterFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const campaign = typeof source.campaign === "string" && source.campaign.length > 0 ? source.campaign : null;
	if (!campaign) return null;
	const cr = readCr(source.cr);
	if (cr === null) return null;
	const baseline = baselineLine(cr);
	const role = typeof source.role === "string" && ROLE_IDS.has(source.role) ? (source.role as MonsterRoleId) : undefined;
	const abilities = readStringArray(source.abilities)
		.map((ability) => ability.toLowerCase())
		.filter((ability): ability is AbilityId => ABILITY_SET.has(ability));
	return {
		campaign,
		cr,
		role,
		flavor: readOptionalString(source.flavor),
		ac: readNumberOr(source.ac, baseline.acDc),
		dc: readNumberOr(source.dc, baseline.acDc),
		hp: readNumberOr(source.hp, baseline.hpAvg),
		profBonus: readNumberOr(source.profBonus, baseline.profBonus),
		attacks: readNumberOr(source.attacks, baseline.attacks),
		damagePerAttack: readNumberOr(source.damagePerAttack, baseline.damagePerAttack),
		damageDice: readOptionalString(source.damageDice),
		damageTypes: readOptionalString(source.damageTypes),
		abilities,
		features: readStringArray(source.features),
		template: readOptionalString(source.template),
	};
}

export function writeMonsterFm(model: MonsterFm): Record<string, unknown> {
	return {
		type: "monster",
		campaign: model.campaign,
		cr: model.cr,
		role: model.role ?? "",
		flavor: model.flavor ?? "",
		ac: model.ac,
		dc: model.dc,
		hp: model.hp,
		profBonus: model.profBonus,
		attacks: model.attacks,
		damagePerAttack: model.damagePerAttack,
		damageDice: model.damageDice ?? "",
		damageTypes: model.damageTypes ?? "",
		abilities: model.abilities,
		features: model.features,
		template: model.template ?? "",
	};
}
