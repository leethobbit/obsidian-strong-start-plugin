// Pure — no `obsidian` import. Condensed transcription of the "Wilderness
// Travel and Exploration" section of the Lazy GM's Resource Document
// (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`).
//
// Deliberately NOT rollable tables: the section is procedure prose (travel
// roles, group stealth, a journey-building framework), so it ships as
// reference-card data for the run-mode 5e drawer instead — the same shape as
// the improvised-DC guidance. It sits under the `dnd5e` toggle because the
// roles are keyed to 5e skills and DCs.

export interface TravelRole {
	name: string;
	skills: string;
	summary: string;
}

export const TRAVEL_DEFAULT_DC =
	"Pick DCs for travel activities between 10 (easy) and 20 (very hard) — DC 12 is usually right.";

export const TRAVEL_ROLES: readonly TravelRole[] = [
	{
		name: "Trailhand",
		skills: "Nature, Survival",
		summary:
			"Keeps the party on the right path. Success: they stay on course. Failure: lost — hostile ground, lost resources, possible exhaustion, and rests may be hard to come by until they recover the trail.",
	},
	{
		name: "Scout",
		skills: "Insight, Investigation, Nature, Perception, Survival",
		summary:
			"Watches for hostile creatures — stalkers, crossings, or groups overtaking the party. Success: threats spotted in time to plan. Failure: the party walks into an encounter or an ambush.",
	},
	{
		name: "Quartermaster",
		skills: "Medicine, Survival",
		summary:
			"Keeps food and water plentiful and unspoiled; forages along the way. Success: provisions hold. Failure: lost supplies (risking exhaustion) or time spent scavenging. Short trips may not need one.",
	},
];

export const TRAVEL_EXTRA_RULES: readonly { name: string; text: string }[] = [
	{
		name: "Two to a role",
		text: "If two characters suit one role, one can use the Help action to grant the other advantage.",
	},
	{
		name: "Group stealth",
		text: "Moving stealthily doubles travel time (and can impose disadvantage on other checks). Group Dexterity (Stealth) vs the passive Perception of anything that might notice.",
	},
];

export const TRAVEL_FRAMEWORK: readonly { name: string; text: string }[] = [
	{
		name: "Determine the weather",
		text: "Choose or roll it. Mostly atmosphere — harsh weather can shift travel DCs.",
	},
	{
		name: "Determine potential encounters",
		text: "Not all hostile: friendly travelers, fearful monsters, weak foes, old battlefields, fresh tracks.",
	},
	{
		name: "Place notable landmarks",
		text: "Key points along the route — backdrops for encounters, rest stops, or sources of secrets and clues.",
	},
];
