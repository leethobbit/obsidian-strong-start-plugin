// Pure — no `obsidian` import. Verbatim transcription of the "Monster
// Statistics by Challenge Rating" table, the seven monster roles, and the
// "Ten Useful Monster Features" from the Lazy GM's 5e Monster Builder
// Resource Document (CC-BY 4.0, Teos Abadía / Scott Fitzgerald Gray /
// Michael E. Shea — see `attribution.ts`, MONSTER_BUILDER_ATTRIBUTION_TEXT).
// Source copy vendored at docs/lazy-gm-5e-monster-builder.md.
//
// This is a DIFFERENT document from the Lazy GM's Resource Document behind
// `src/dnd5e/improvise.ts`, and the two disagree on quick-stat math (that doc:
// attack 3 + ½CR, HP 20 × CR; this table: per-CR values). Both are kept
// verbatim to their own source; this table supersedes the old formula table
// as the reference surface (see dnd5e-cards.ts).

export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITY_IDS: readonly AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_NAMES: Readonly<Record<AbilityId, string>> = {
	str: "Strength",
	dex: "Dexterity",
	con: "Constitution",
	int: "Intelligence",
	wis: "Wisdom",
	cha: "Charisma",
};

export interface CrStatLine {
	/** Numeric CR; fractions as 0.125 / 0.25 / 0.5 (matches STANDARD_CHALLENGE_RATINGS). */
	cr: number;
	/** Display label — "1/8", "5". */
	label: string;
	/** "Equivalent Character Level" column, verbatim display string ("< 1", "3", "> 20"). */
	eqLevel: string;
	/** The table's single AC/DC column — typical Armor Class AND save DC. */
	acDc: number;
	hpAvg: number;
	hpMin: number;
	hpMax: number;
	/** "Proficient Ability Bonus" — attack bonus / proficient save & check bonus. */
	profBonus: number;
	/** Total expected damage per round (split across the attacks). */
	damagePerRound: number;
	attacks: number;
	/** Baseline damage per attack at the default attack count. */
	damagePerAttack: number;
	/** The table's dice equation for one attack, e.g. "3d6 + 2". */
	damageDice: string;
	examples: readonly string[];
}

export const MONSTER_STATS_BY_CR: readonly CrStatLine[] = [
	{ cr: 0, label: "0", eqLevel: "< 1", acDc: 10, hpAvg: 3, hpMin: 2, hpMax: 4, profBonus: 2, damagePerRound: 2, attacks: 1, damagePerAttack: 2, damageDice: "1d4", examples: ["Commoner", "rat", "spider"] },
	{ cr: 0.125, label: "1/8", eqLevel: "< 1", acDc: 11, hpAvg: 9, hpMin: 7, hpMax: 11, profBonus: 3, damagePerRound: 3, attacks: 1, damagePerAttack: 4, damageDice: "1d6 + 1", examples: ["Bandit", "cultist", "giant rat"] },
	{ cr: 0.25, label: "1/4", eqLevel: "1", acDc: 11, hpAvg: 13, hpMin: 10, hpMax: 16, profBonus: 3, damagePerRound: 5, attacks: 1, damagePerAttack: 5, damageDice: "1d6 + 2", examples: ["Acolyte", "skeleton", "wolf"] },
	{ cr: 0.5, label: "1/2", eqLevel: "2", acDc: 12, hpAvg: 22, hpMin: 17, hpMax: 28, profBonus: 4, damagePerRound: 8, attacks: 2, damagePerAttack: 4, damageDice: "1d4 + 2", examples: ["Black bear", "scout", "shadow"] },
	{ cr: 1, label: "1", eqLevel: "3", acDc: 12, hpAvg: 33, hpMin: 25, hpMax: 41, profBonus: 5, damagePerRound: 12, attacks: 2, damagePerAttack: 6, damageDice: "1d8 + 2", examples: ["Dire wolf", "specter", "spy"] },
	{ cr: 2, label: "2", eqLevel: "5", acDc: 13, hpAvg: 45, hpMin: 34, hpMax: 56, profBonus: 5, damagePerRound: 17, attacks: 2, damagePerAttack: 9, damageDice: "2d6 + 2", examples: ["Ghast", "ogre", "priest"] },
	{ cr: 3, label: "3", eqLevel: "7", acDc: 13, hpAvg: 65, hpMin: 49, hpMax: 81, profBonus: 5, damagePerRound: 23, attacks: 2, damagePerAttack: 12, damageDice: "2d8 + 3", examples: ["Knight", "mummy", "werewolf"] },
	{ cr: 4, label: "4", eqLevel: "9", acDc: 14, hpAvg: 84, hpMin: 64, hpMax: 106, profBonus: 6, damagePerRound: 28, attacks: 2, damagePerAttack: 14, damageDice: "3d8 + 1", examples: ["Ettin", "ghost"] },
	{ cr: 5, label: "5", eqLevel: "10", acDc: 15, hpAvg: 95, hpMin: 71, hpMax: 119, profBonus: 7, damagePerRound: 35, attacks: 3, damagePerAttack: 12, damageDice: "3d6 + 2", examples: ["Elemental", "gladiator", "vampire spawn"] },
	{ cr: 6, label: "6", eqLevel: "11", acDc: 15, hpAvg: 112, hpMin: 84, hpMax: 140, profBonus: 7, damagePerRound: 41, attacks: 3, damagePerAttack: 14, damageDice: "3d6 + 4", examples: ["Mage", "medusa", "wyvern"] },
	{ cr: 7, label: "7", eqLevel: "12", acDc: 15, hpAvg: 130, hpMin: 98, hpMax: 162, profBonus: 7, damagePerRound: 47, attacks: 3, damagePerAttack: 16, damageDice: "3d8 + 3", examples: ["Stone giant", "young black dragon"] },
	{ cr: 8, label: "8", eqLevel: "13", acDc: 15, hpAvg: 136, hpMin: 102, hpMax: 170, profBonus: 7, damagePerRound: 53, attacks: 3, damagePerAttack: 18, damageDice: "3d10 + 2", examples: ["Assassin", "frost giant"] },
	{ cr: 9, label: "9", eqLevel: "15", acDc: 16, hpAvg: 145, hpMin: 109, hpMax: 181, profBonus: 8, damagePerRound: 59, attacks: 3, damagePerAttack: 19, damageDice: "3d10 + 3", examples: ["Bone devil", "fire giant", "young blue dragon"] },
	{ cr: 10, label: "10", eqLevel: "16", acDc: 17, hpAvg: 155, hpMin: 116, hpMax: 194, profBonus: 9, damagePerRound: 65, attacks: 4, damagePerAttack: 16, damageDice: "3d8 + 3", examples: ["Stone golem", "young red dragon"] },
	{ cr: 11, label: "11", eqLevel: "17", acDc: 17, hpAvg: 165, hpMin: 124, hpMax: 206, profBonus: 9, damagePerRound: 71, attacks: 4, damagePerAttack: 18, damageDice: "3d10 + 2", examples: ["Djinni", "efreeti", "horned devil"] },
	{ cr: 12, label: "12", eqLevel: "18", acDc: 17, hpAvg: 175, hpMin: 131, hpMax: 219, profBonus: 9, damagePerRound: 77, attacks: 4, damagePerAttack: 19, damageDice: "3d10 + 3", examples: ["Archmage", "erinyes"] },
	{ cr: 13, label: "13", eqLevel: "19", acDc: 18, hpAvg: 184, hpMin: 138, hpMax: 230, profBonus: 10, damagePerRound: 83, attacks: 4, damagePerAttack: 21, damageDice: "4d8 + 3", examples: ["Adult white dragon", "storm giant", "vampire"] },
	{ cr: 14, label: "14", eqLevel: "20", acDc: 19, hpAvg: 196, hpMin: 147, hpMax: 245, profBonus: 11, damagePerRound: 89, attacks: 4, damagePerAttack: 22, damageDice: "4d10", examples: ["Adult black dragon", "ice devil"] },
	{ cr: 15, label: "15", eqLevel: "> 20", acDc: 19, hpAvg: 210, hpMin: 158, hpMax: 263, profBonus: 11, damagePerRound: 95, attacks: 5, damagePerAttack: 19, damageDice: "3d10 + 3", examples: ["Adult green dragon", "mummy lord", "purple worm"] },
	{ cr: 16, label: "16", eqLevel: "> 20", acDc: 19, hpAvg: 229, hpMin: 172, hpMax: 286, profBonus: 11, damagePerRound: 101, attacks: 5, damagePerAttack: 21, damageDice: "4d8 + 3", examples: ["Adult blue dragon", "iron golem", "marilith"] },
	{ cr: 17, label: "17", eqLevel: "> 20", acDc: 20, hpAvg: 246, hpMin: 185, hpMax: 308, profBonus: 12, damagePerRound: 107, attacks: 5, damagePerAttack: 22, damageDice: "3d12 + 3", examples: ["Adult red dragon"] },
	{ cr: 18, label: "18", eqLevel: "> 20", acDc: 21, hpAvg: 266, hpMin: 200, hpMax: 333, profBonus: 13, damagePerRound: 113, attacks: 5, damagePerAttack: 23, damageDice: "4d10 + 1", examples: ["Demilich"] },
	{ cr: 19, label: "19", eqLevel: "> 20", acDc: 21, hpAvg: 285, hpMin: 214, hpMax: 356, profBonus: 13, damagePerRound: 119, attacks: 5, damagePerAttack: 24, damageDice: "4d10 + 2", examples: ["Balor"] },
	{ cr: 20, label: "20", eqLevel: "> 20", acDc: 21, hpAvg: 300, hpMin: 225, hpMax: 375, profBonus: 13, damagePerRound: 132, attacks: 5, damagePerAttack: 26, damageDice: "4d12", examples: ["Ancient white dragon", "pit fiend"] },
	{ cr: 21, label: "21", eqLevel: "> 20", acDc: 22, hpAvg: 325, hpMin: 244, hpMax: 406, profBonus: 14, damagePerRound: 150, attacks: 5, damagePerAttack: 30, damageDice: "4d12 + 4", examples: ["Ancient black dragon", "lich", "solar"] },
	{ cr: 22, label: "22", eqLevel: "> 20", acDc: 23, hpAvg: 350, hpMin: 263, hpMax: 438, profBonus: 15, damagePerRound: 168, attacks: 5, damagePerAttack: 34, damageDice: "4d12 + 8", examples: ["Ancient green dragon"] },
	{ cr: 23, label: "23", eqLevel: "> 20", acDc: 23, hpAvg: 375, hpMin: 281, hpMax: 469, profBonus: 15, damagePerRound: 186, attacks: 5, damagePerAttack: 37, damageDice: "6d10 + 4", examples: ["Ancient blue dragon", "kraken"] },
	{ cr: 24, label: "24", eqLevel: "> 20", acDc: 23, hpAvg: 400, hpMin: 300, hpMax: 500, profBonus: 15, damagePerRound: 204, attacks: 5, damagePerAttack: 41, damageDice: "6d10 + 8", examples: ["Ancient red dragon"] },
	{ cr: 25, label: "25", eqLevel: "> 20", acDc: 24, hpAvg: 430, hpMin: 323, hpMax: 538, profBonus: 16, damagePerRound: 222, attacks: 5, damagePerAttack: 44, damageDice: "6d10 + 11", examples: [] },
	{ cr: 26, label: "26", eqLevel: "> 20", acDc: 25, hpAvg: 460, hpMin: 345, hpMax: 575, profBonus: 17, damagePerRound: 240, attacks: 5, damagePerAttack: 48, damageDice: "6d10 + 15", examples: [] },
	{ cr: 27, label: "27", eqLevel: "> 20", acDc: 25, hpAvg: 490, hpMin: 368, hpMax: 613, profBonus: 17, damagePerRound: 258, attacks: 5, damagePerAttack: 52, damageDice: "6d10 + 19", examples: [] },
	{ cr: 28, label: "28", eqLevel: "> 20", acDc: 25, hpAvg: 540, hpMin: 405, hpMax: 675, profBonus: 17, damagePerRound: 276, attacks: 5, damagePerAttack: 55, damageDice: "6d10 + 22", examples: [] },
	{ cr: 29, label: "29", eqLevel: "> 20", acDc: 26, hpAvg: 600, hpMin: 450, hpMax: 750, profBonus: 18, damagePerRound: 294, attacks: 5, damagePerAttack: 59, damageDice: "6d10 + 26", examples: [] },
	{ cr: 30, label: "30", eqLevel: "> 20", acDc: 27, hpAvg: 666, hpMin: 500, hpMax: 833, profBonus: 19, damagePerRound: 312, attacks: 5, damagePerAttack: 62, damageDice: "6d10 + 29", examples: ["Tarrasque"] },
];

/** "Monster Roles" (doc): the seven tactical roles. `summary` condenses the
 * doc's opening line for each role; `suggestedAbilities` is OUR editorial
 * reading of the doc's prose (Step 3 says proficiencies follow the monster's
 * story), used only to pre-suggest toggle chips in the builder — never
 * enforced. */
export type MonsterRoleId = "ambusher" | "artillery" | "bruiser" | "controller" | "defender" | "leader" | "skirmisher";

export interface MonsterRole {
	id: MonsterRoleId;
	name: string;
	summary: string;
	suggestedAbilities: readonly AbilityId[];
	examples: readonly string[];
}

export const MONSTER_ROLES: readonly MonsterRole[] = [
	{
		id: "ambusher",
		name: "Ambusher",
		summary: "Hides, attacks, and hides again — deals more damage from hiding, often has low hit points.",
		suggestedAbilities: ["dex"],
		examples: ["Dust mephit", "ghost", "mimic", "phase spider", "spy"],
	},
	{
		id: "artillery",
		name: "Artillery",
		summary: "High attack bonus and good damage at range, but low hit points or AC — hits hard and dies fast.",
		suggestedAbilities: ["dex", "int"],
		examples: ["Hill giant", "mage", "manticore", "scout", "solar"],
	},
	{
		id: "bruiser",
		name: "Bruiser",
		summary: "Higher-than-average melee damage up close, paid for with lower AC, accuracy, or hit points.",
		suggestedAbilities: ["str", "con"],
		examples: ["Ettin", "flesh golem", "owlbear", "shambling mound", "wolf"],
	},
	{
		id: "controller",
		name: "Controller",
		summary: "Imposes conditions — grapples, poisons, restrains, or spells — to keep characters from being effective.",
		suggestedAbilities: ["int", "cha"],
		examples: ["Black pudding", "cockatrice", "ettercap", "harpy"],
	},
	{
		id: "defender",
		name: "Defender",
		summary: "Soaks up hits with high AC, saves, and hit points; often \"sticky\", pinning characters in place.",
		suggestedAbilities: ["str", "con"],
		examples: ["Animated armor", "chuul", "gelatinous cube", "knight", "shambling mound"],
	},
	{
		id: "leader",
		name: "Leader",
		summary: "Helps other creatures — heals, boosts, or moves allies — with lower hit points, damage, or accuracy.",
		suggestedAbilities: ["wis", "cha"],
		examples: ["Couatl", "knight", "priest"],
	},
	{
		id: "skirmisher",
		name: "Skirmisher",
		summary: "Darts in for accurate attacks and away again — high mobility, lower AC or hit points.",
		suggestedAbilities: ["dex"],
		examples: ["Bulette", "copper dragon", "goblin", "spy", "wraith"],
	},
];

/** "Ten Useful Monster Features" (doc). `text` is the doc's description with
 * the damage amounts left generic — `deriveMonster` (monster-build.ts)
 * resolves concrete numbers from the build. The doc marks exactly two
 * features as costing one attack ("give them one less attack than normal"):
 * Damage Reflection and Damaging Aura. Damaging Burst deals half the
 * creature's total damage per round. Ids are stable forever. */
export interface MonsterFeature {
	id: string;
	name: string;
	text: string;
	/** "If you give a creature this feature, give them one less attack than normal." */
	costsOneAttack: boolean;
	/** Damage equals half the creature's total damage per round. */
	usesHalfDamagePerRound: boolean;
	/** Damage equals half the damage of one of the creature's attacks. */
	usesHalfAttackDamage: boolean;
}

export const MONSTER_FEATURES: readonly MonsterFeature[] = [
	{
		id: "damaging-blast",
		name: "Damaging Blast",
		text: "One or more single-target ranged attacks using the creature's attack bonus and damage, dealing damage of an appropriate type.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
	{
		id: "damage-reflection",
		name: "Damage Reflection",
		text: "Whenever a creature within 5 feet hits this creature with a melee attack, the attacker takes damage in return equal to half the damage of one of this creature's attacks.",
		costsOneAttack: true,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: true,
	},
	{
		id: "misty-step",
		name: "Misty Step",
		text: "As a bonus action, this creature can teleport up to 30 feet to an unoccupied space they can see.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
	{
		id: "knockdown",
		name: "Knockdown",
		text: "When this creature hits a target with a melee attack, the target must succeed on a Strength saving throw or be knocked prone.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
	{
		id: "restraining-grab",
		name: "Restraining Grab",
		text: "When this creature hits a target with a melee attack, the target is grappled (escape DC based on this creature's Strength or Dexterity modifier). While grappled, the target is restrained.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
	{
		id: "damaging-burst",
		name: "Damaging Burst",
		text: "As an action, a burst of energy in a 10-foot-radius sphere, around themself or at a point within 120 feet. Each creature in the area makes a Dexterity, Constitution, or Wisdom saving throw, taking damage equal to half this creature's total damage per round on a failure, or half as much on a success.",
		costsOneAttack: false,
		usesHalfDamagePerRound: true,
		usesHalfAttackDamage: false,
	},
	{
		id: "cunning-action",
		name: "Cunning Action",
		text: "On each of their turns, this creature can use a bonus action to take the Dash, Disengage, or Hide action.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
	{
		id: "damaging-aura",
		name: "Damaging Aura",
		text: "Each creature who starts their turn within 10 feet of this creature takes damage equal to half the damage of one of this creature's attacks.",
		costsOneAttack: true,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: true,
	},
	{
		id: "energy-weapons",
		name: "Energy Weapons",
		text: "The creature's weapon attacks deal extra damage of an appropriate type — added on top for a combat boost, or replacing some normal weapon damage.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
	{
		id: "damage-transference",
		name: "Damage Transference",
		text: "When this creature takes damage, they can transfer half or all of it to a willing creature within 30 or 60 feet. Particularly good for boss monsters.",
		costsOneAttack: false,
		usesHalfDamagePerRound: false,
		usesHalfAttackDamage: false,
	},
];
