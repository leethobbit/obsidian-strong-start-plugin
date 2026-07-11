// Pure — no `obsidian` import. The ordered eight-step registry driving both
// the prep board's master list and which renderer mounts in the right pane
// (src/views/prep/steps/*.ts). Step ids are frozen (SCHEMA.md) — never key
// logic off `label`/`shortLabel`, only `id`.

export type StepStorageKind = "roster" | "section" | "list-section" | "secrets" | "links";

export type LinkStepKey = "npcs" | "locations" | "monsters";

export interface StepDef {
	/** Frozen id (SCHEMA.md `stepsDone`) — never changes. */
	id: string;
	/** 1–8, display order. */
	number: number;
	/** Sentence-case, the right-pane heading. */
	label: string;
	/** Short form for the master-list row. */
	shortLabel: string;
	storage: StepStorageKind;
	/** Managed H2 heading for `section`/`list-section` steps. */
	sectionHeading?: string;
	/** Session frontmatter array key for `links` steps. */
	fmKey?: LinkStepKey;
}

export const STEPS: readonly StepDef[] = [
	{ id: "characters", number: 1, label: "Review the characters", shortLabel: "Characters", storage: "roster" },
	{
		id: "strong-start",
		number: 2,
		label: "Create a strong start",
		shortLabel: "Strong start",
		storage: "section",
		sectionHeading: "Strong start",
	},
	{
		id: "scenes",
		number: 3,
		label: "Outline potential scenes",
		shortLabel: "Scenes",
		storage: "list-section",
		sectionHeading: "Scenes",
	},
	{ id: "secrets", number: 4, label: "Define secrets and clues", shortLabel: "Secrets", storage: "secrets" },
	{
		id: "locations",
		number: 5,
		label: "Develop fantastic locations",
		shortLabel: "Locations",
		storage: "links",
		fmKey: "locations",
	},
	{ id: "npcs", number: 6, label: "Outline important NPCs", shortLabel: "NPCs", storage: "links", fmKey: "npcs" },
	{
		id: "monsters",
		number: 7,
		label: "Choose relevant monsters",
		shortLabel: "Monsters",
		storage: "links",
		fmKey: "monsters",
	},
	{
		id: "rewards",
		number: 8,
		label: "Select magic item rewards",
		shortLabel: "Rewards",
		storage: "list-section",
		sectionHeading: "Rewards",
	},
] as const;

export function stepById(id: string): StepDef | undefined {
	return STEPS.find((s) => s.id === id);
}
