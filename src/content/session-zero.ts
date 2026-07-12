// Pure — no `obsidian` import. Verbatim-faithful (lightly compressed —
// the doc's own text is long-form prose, this is a checklist, not a table)
// transcription of the "Session Zero Checklist" and "Safety Tools" sections
// from the Lazy GM's Resource Document (CC-BY 4.0, Michael E. Shea / Sly
// Flourish — see `attribution.ts`). Checklist item ids are stable forever
// (SCHEMA.md `session-zero.done[]` stores exactly these ids; AGENTS.md
// "Built-in content").

export type SessionZeroGroup = "pitch" | "safety" | "characters" | "logistics";

export interface SessionZeroChecklistItem {
	id: string;
	label: string;
	detail: string;
	group: SessionZeroGroup;
}

/**
 * The doc's checklist walks: one-page guide → describe the theme → discuss
 * safety tools → decide on a group patron → build characters together
 * (optionally with connections) → run a short adventure. Grouped here into
 * the Home / Session zero sub-tab's four collapsible sections
 * (docs/plan.md M9).
 */
export const SESSION_ZERO_CHECKLIST: readonly SessionZeroChecklistItem[] = [
	{
		id: "one-page-guide",
		label: "Write a one-page guide",
		detail:
			"Before session zero, hand players a single page: the campaign's theme and flavor, what makes it different (your six truths), what characters and motivations fit best, potentially troubling themes, and the group patrons on offer.",
		group: "pitch",
	},
	{
		id: "describe-theme",
		label: "Describe the theme",
		detail: "Gathered together, walk through the one-page guide and sell the campaign's story — get everyone excited before getting into the details.",
		group: "pitch",
	},
	{
		id: "safety-discussion",
		label: "Discuss safety tools",
		detail:
			"Talk through the campaign's potentially troubling themes, write down hard lines and off-screen content together, and agree on a way to pause the game and break character.",
		group: "safety",
	},
	{
		id: "choose-patron",
		label: "Decide on a group patron",
		detail:
			"Describe a few NPCs who could tie all the characters together and propel them forward, and work toward a patron every player is happy with — don't let the choice alienate anyone.",
		group: "characters",
	},
	{
		id: "build-characters",
		label: "Build characters together",
		detail:
			"Help players build characters that reinforce the campaign's themes and motivations, calling out classes, backgrounds, and skills that fit especially well.",
		group: "characters",
	},
	{
		id: "character-connections",
		label: "Connect the characters",
		detail:
			"Optionally, roll or pick a relationship for each pair of characters (adopted siblings, fellow veterans, buddy cops…) so the party starts with a bond, not just a shared tavern.",
		group: "characters",
	},
	{
		id: "short-adventure",
		label: "Run a short adventure",
		detail:
			"Once characters are built, run a quick scene at the end — a fight plus some negotiation or exploration — to introduce the party to the campaign before the first full session.",
		group: "logistics",
	},
] as const;

export const SESSION_ZERO_GROUPS: readonly { id: SessionZeroGroup; label: string }[] = [
	{ id: "pitch", label: "Pitch & expectations" },
	{ id: "safety", label: "Safety tools" },
	{ id: "characters", label: "Characters" },
	{ id: "logistics", label: "Logistics" },
];

export function checklistItemsInGroup(group: SessionZeroGroup): readonly SessionZeroChecklistItem[] {
	return SESSION_ZERO_CHECKLIST.filter((item) => item.group === group);
}

// ---- Safety tools reference copy -----------------------------------------
// Short paraphrase of "Potentially Sensitive Topics" / "Hard Lines and
// Off-Screen Content" / "Pause for a Second" — kept under ~80 words per card
// (the doc's own guidance runs to several paragraphs each; this is a
// reference card, not a table).

export const SAFETY_SENSITIVE_TOPICS_COPY =
	"Before anyone sits down, decide what's on the table at all — the doc lists dozens of examples, from body horror and gore to racism and harm to children or animals. Bring your own hard lines to the conversation first, then find out which topics your players aren't comfortable with, and cut those from the game entirely.";

export const SAFETY_LINES_VEILS_COPY =
	"Sort sensitive topics into two buckets: hard lines (material that should never come up) and veils (handled off-screen — described vaguely, or faded to black). Capture both together, in an open, nonjudgmental conversation, so no one has to guess where the boundary is mid-scene.";

export const SAFETY_PAUSE_COPY =
	'"Pause for a second" lets anyone stop a scene, break character, and check in as players out of character — to edit content on the fly ("I\'m not comfortable with that") or just confirm everyone\'s still on board. Use it early and often, so it never feels like an alarm bell reserved only for emergencies.';

// DEVIATION: the resource doc doesn't specifically call out an "anonymous"
// submission channel for lines/veils — this line is the plugin's own UI
// copy, not a doc transcription, reminding the table that the list isn't
// fixed at session zero.
export const SAFETY_ANONYMOUS_REMINDER =
	"Lines and veils aren't locked in at session zero — anyone can add one at any time during the campaign, no explanation required.";
