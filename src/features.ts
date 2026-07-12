// Pure — no `obsidian` import. Lossless feature-toggle registry (docs/plan.md,
// Inkswell pattern): every feature is ON by default, and is only ever
// switched off by adding its id to `settings.disabledFeatures` — never a
// second "enabled" flag to keep in sync, and never a code path deleted when a
// feature ships. The `dnd5e` id is registered here in M9, well before its own
// UI lands in M10 — registering an id early is fine, the registry doesn't
// imply the feature has any surface yet.

import type { LazyCampaignPluginSettings } from "./settings/settings";

export interface FeatureDescriptor {
	id: string;
	label: string;
	description: string;
}

export const FEATURES: readonly FeatureDescriptor[] = [
	{
		id: "session-zero",
		label: "Session zero",
		description: "The Home destination's session zero checklist and safety-tools sub-tab.",
	},
	{
		id: "dnd5e",
		label: "5e module",
		description: "5e-specific affordances (encounter benchmark, improvised DCs/damage/stats) in prep and run mode.",
	},
];

/**
 * A feature is on unless its id is explicitly listed in `disabledFeatures` —
 * the "lossless" half of the pattern: turning a feature off only hides its
 * UI, it never deletes or migrates the note data underneath, so re-enabling
 * it later picks up right where it left off. An unrecognized id is treated as
 * enabled rather than throwing, so a stale/foreign id left in `data.json`
 * (e.g. from a downgrade) never breaks unrelated features.
 */
export function featureEnabled(settings: Pick<LazyCampaignPluginSettings, "disabledFeatures">, id: string): boolean {
	return !settings.disabledFeatures.includes(id);
}
