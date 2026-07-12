import { describe, expect, it } from "vitest";
import {
	NIGHT_BLADE_SESSION,
	WHITESPARROW_FRONT,
	WHITESPARROW_LOCATIONS,
	WHITESPARROW_NPCS,
	WHITESPARROW_TRUTHS,
} from "../src/content/whitesparrow";

describe("Whitesparrow starter content", () => {
	it("provides exactly six truths and a three-portent front", () => {
		expect(WHITESPARROW_TRUTHS).toHaveLength(6);
		expect(WHITESPARROW_FRONT.portents).toHaveLength(3);
		expect(WHITESPARROW_FRONT.name.length).toBeGreaterThan(0);
		expect(WHITESPARROW_FRONT.goal.length).toBeGreaterThan(0);
		expect(WHITESPARROW_FRONT.doom.length).toBeGreaterThan(0);
	});

	it("gives every NPC a name, role, and body", () => {
		expect(WHITESPARROW_NPCS.length).toBeGreaterThanOrEqual(8);
		for (const npc of WHITESPARROW_NPCS) {
			expect(npc.name.length).toBeGreaterThan(0);
			expect(npc.role.length).toBeGreaterThan(0);
			expect(npc.body.length).toBeGreaterThan(0);
		}
	});

	it("gives every location aspects and a body", () => {
		for (const location of WHITESPARROW_LOCATIONS) {
			expect(location.aspects.length).toBeGreaterThanOrEqual(3);
			expect(location.body.length).toBeGreaterThan(0);
		}
	});

	it("preps session 1 in the lazy shape: ~10 secrets, 3-10 scenes, links resolving to created notes", () => {
		expect(NIGHT_BLADE_SESSION.secrets).toHaveLength(10);
		expect(NIGHT_BLADE_SESSION.scenes.length).toBeGreaterThanOrEqual(3);
		expect(NIGHT_BLADE_SESSION.scenes.length).toBeLessThanOrEqual(10);

		// Every wikilinked NPC/location the session references must be one of
		// the notes the builder actually creates — a broken link in the
		// starter would read as a bug in the plugin.
		const npcNames = new Set(WHITESPARROW_NPCS.map((n) => n.name));
		for (const link of NIGHT_BLADE_SESSION.npcs) {
			expect(npcNames.has(link.replace(/^\[\[|\]\]$/g, ""))).toBe(true);
		}
		const locationNames = new Set(WHITESPARROW_LOCATIONS.map((l) => l.name));
		for (const link of NIGHT_BLADE_SESSION.locations) {
			expect(locationNames.has(link.replace(/^\[\[|\]\]$/g, ""))).toBe(true);
		}
	});
});
