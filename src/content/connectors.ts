// Pure — no `obsidian` import. Verbatim transcription of the "Random
// Underground Connectors" list from the Lazy GM's Resource Document (CC-BY
// 4.0, Michael E. Shea / Sly Flourish — see `attribution.ts`). Table id is
// stable forever (AGENTS.md "Built-in content").

import type { RollTable } from "../tables/types";

export const CONNECTOR_UNDERGROUND: RollTable = {
	id: "connector-underground",
	name: "Random underground connectors",
	category: "places",
	source: "core",
	rows: [
		"Long-abandoned sewers", "Ancient burial chambers", "Underground river", "Tunnels carved by ancient laborers",
		"Massive worm-carved passageways", "Narrow pathway alongside a deep fissure",
		"Tunnels illuminated with phosphorescent fungi", "Spiraling shaft", "Abandoned mine tunnels",
		"Primeval tunnels adorned with thousands of handprints", "Smooth tunnels bored out with magic",
		"Natural tunnel strewn with webs", "Underwater passage", "Moss-covered natural tunnel",
		"Collapsing sinkhole leading to tunnel network", "Ice tunnel", "Cooled lava flow",
		"Huge bridge over a deep chasm", "Otherworldly passage", "Massive platforms crossing a bottomless pit",
	].map((text) => ({ text })),
};

export const CONNECTOR_TABLES: readonly RollTable[] = [CONNECTOR_UNDERGROUND];
