import { describe, expect, it } from "vitest";
import {
	NIGHT_BLADE_SESSION,
	WHITESPARROW_FRONT,
	WHITESPARROW_LOCATIONS,
	WHITESPARROW_NPCS,
	WHITESPARROW_PARTY,
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

	it("seeds a playable sample party, every member clearly marked replaceable", () => {
		expect(WHITESPARROW_PARTY.length).toBeGreaterThanOrEqual(3);
		expect(WHITESPARROW_PARTY.length).toBeLessThanOrEqual(6);
		const npcNames = new Set(WHITESPARROW_NPCS.map((n) => n.name));
		const seen = new Set<string>();
		for (const pc of WHITESPARROW_PARTY) {
			expect(pc.name.length).toBeGreaterThan(0);
			expect(pc.role.length).toBeGreaterThan(0);
			expect(pc.level).toBeGreaterThanOrEqual(1);
			expect(pc.level).toBeLessThanOrEqual(20);
			// The whole point is a no-confusion roster: bodies open with the
			// replace-me line, and no PC collides with an NPC name.
			expect(pc.body).toMatch(/^\*Sample character/);
			expect(npcNames.has(pc.name)).toBe(false);
			expect(seen.has(pc.name)).toBe(false);
			seen.add(pc.name);
		}
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
