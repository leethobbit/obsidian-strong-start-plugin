// Pure — no `obsidian` import. Verbatim transcription of the "Random Town
// Events" section's four rollable lists from the Lazy GM's Resource Document
// (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). Table
// ids are stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const TOWN_EVENTS_SENTIMENT: RollTable = {
	id: "town-events-sentiment",
	name: "Town events — sentiment",
	category: "plots",
	source: "core",
	rows: [
		"Happy", "Elated", "Uncaring", "Joyful", "Optimistic", "Pessimistic", "Downtrodden", "Frightened",
		"Horrified", "Concerned", "Unconcerned", "Harried", "Sleep-deprived", "Dazed", "Hyperactive", "Purposeful",
		"Lazy", "Melancholy", "Busy", "Suspicious",
	].map((text) => ({ text })),
};

export const TOWN_EVENTS_MUNDANE: RollTable = {
	id: "town-events-mundane",
	name: "Town events — mundane event",
	category: "plots",
	source: "core",
	rows: [
		"Wedding", "Funeral", "Preparing for war", "Seasonal celebration", "Burning of an effigy",
		"Death of a noble lord", "Day of drunkenness", "Celebration of lovers", "Great feast", "Execution",
		"Market day", "Parade of vanquished foes", "Celebration of the dead", "Religious holiday",
		"Wild boar hat festival", "Robbery", "Brawl", "Visit by the circus", "Wrangling of rampaging beasts",
		"Festival of kites",
	].map((text) => ({ text })),
};

export const TOWN_EVENTS_WEATHER: RollTable = {
	id: "town-events-weather",
	name: "Town events — notable weather condition",
	category: "plots",
	source: "core",
	rows: [
		"Fog", "Heavy mist", "New moon", "Full moon", "Hot day", "Chilly day", "Light rain", "Moderate rain",
		"Heavy rain", "Windstorm", "Hailstorm", "Ice storm", "Cloudy day", "Sunny day", "Humid day", "Dry day",
		"Windy day", "Light snowfall", "Moderate snowfall", "Snowstorm",
	].map((text) => ({ text })),
};

export const TOWN_EVENTS_FANTASTIC: RollTable = {
	id: "town-events-fantastic",
	name: "Town events — fantastic event",
	category: "plots",
	source: "core",
	rows: [
		"The stars have disappeared from the sky", "An unexpected solar eclipse", "The blood moon rises",
		"Swarms of stinging insects descend", "Acidic fog rolls in", "A second sun appears in the sky",
		"A storm of arcane energy", "The arrival of a servant of a god", "Meteor shower",
		"A cyclopean behemoth rises", "Swarms of mischievous devils", "Tentacles appear in the sky",
		"The dancing dead come to life", "Volcanic eruption", "Collapsing sinkhole reveals ancient ruins below",
		"The sun does not rise", "A great floating tower appears", "The lord's castle disappears",
		"The border to the fey realm grows thin", "The world of shadow bleeds over into the material realm",
	].map((text) => ({ text })),
};

export const TOWN_EVENTS_TABLES: readonly RollTable[] = [
	TOWN_EVENTS_SENTIMENT,
	TOWN_EVENTS_MUNDANE,
	TOWN_EVENTS_WEATHER,
	TOWN_EVENTS_FANTASTIC,
];
