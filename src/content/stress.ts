// Pure — no `obsidian` import. Verbatim transcription of the "Stress Effects"
// section's two rollable lists from the Lazy GM's Resource Document
// (CC-BY 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). Table
// ids are stable forever (AGENTS.md "Built-in content").
//
// These tables are gated behind the `dnd5e` feature toggle (main.ts filters
// them out of the registry when it's off) — the mechanics are 5e (Charisma
// save, psychic damage) and the horror framing belongs with the module a GM
// opted into. The source ties their use at the table to session-zero consent
// and safety tools; that caveat renders wherever the procedure does
// (`dnd5e-cards.ts`), and the table names carry the "stress" framing so a
// roll chip is never contextless.

import type { RollTable } from "../tables/types";

export const STRESS_TRIGGERS: RollTable = {
	id: "stress-triggers",
	name: "Stress — triggering events",
	category: "plots",
	source: "core",
	rows: [
		"Witnessing a ghoul devouring a body",
		"Beholding a bloody sacrificial altar",
		"Watching the raising of the dead",
		"Witnessing a ritual sacrifice",
		"Hearing the sermon of a dark priest",
		"Reading words from a forbidden tome",
		"Reading glyphs describing an elder evil",
		"Seeing a parasite burst free from its host",
		"Beholding unholy primordial cave paintings",
		"Touching an unholy artifact",
		"Peering through a portal into the Nine Hells",
		"Staring into a scrying pool showing the Abyss",
		"Discovering the ruins of a sentient alien vessel",
		"Watching depraved acts of cannibalism",
		"Seeing the true form of an abomination",
		"Falling into the depths of the Astral Plane",
		"Staring into the tumultuous extents of Limbo",
		"Standing in the presence of a demon prince",
		"Beholding an alien city of elder evils",
		"Witnessing the death of a god",
	].map((text) => ({ text })),
};

export const STRESS_RESULTS: RollTable = {
	id: "stress-results",
	name: "Stress — results",
	category: "plots",
	source: "core",
	rows: [
		"You slip into a mental vision of a restful place.",
		"You whisper in a tongue no mortal understands.",
		"Blood flows from your eyes.",
		"You collapse as you lose all strength.",
		"A screaming whine fills your hearing.",
		"Your heart seems to stop in your chest.",
		"The faces of your friends hideously contort.",
		"Your heartbeat hammers in your ears.",
		"You hear strange, discordant music.",
		"You fall asleep and dream of darkness.",
		"A terrible memory of your past comes to mind.",
		"Physical pain and burning wracks your body.",
		"You find yourself unable to move or speak.",
		"Unbound shadows seem to crawl toward you.",
		"You hear the echoing sound of children crying.",
		"You lose control of your bodily functions.",
		"Your vision fills with twisted geometric shapes.",
		"You hear the whispers of an otherworldly being.",
		"You scream as blood flows from your mouth.",
		"You feel as though all your bones begin to crack.",
	].map((text) => ({ text })),
};

export const STRESS_TABLES: readonly RollTable[] = [STRESS_TRIGGERS, STRESS_RESULTS];

/** The procedure around the tables, for the 5e drawer's reference section. */
export const STRESS_PROCEDURE: readonly { name: string; text: string }[] = [
	{
		name: "Consent first",
		text: "Get the players' permission ahead of time and have safety tools in place — review the effects during session zero so nothing crosses a line.",
	},
	{
		name: "The check",
		text: "When a character witnesses something alien or horrific, call for a Charisma saving throw, DC 10 (easy) to DC 20 (hard). On a failure, they suffer a roleplaying effect from the stress results table.",
	},
	{
		name: "Optional mechanics",
		text: "Alternatively: stunned for 1 minute, repeating the save at end of turn and when damaged; success grants 24-hour immunity. A character can break the effect at the start of their turn for 1d8 psychic damage per two levels; lesser restoration also ends it.",
	},
	{
		name: "Long-term effects",
		text: "Decide any lasting ramifications together with the player, reflecting their wishes — and avoid framing effects as \"madness\"; these are supernatural reactions, not mental illness.",
	},
];
