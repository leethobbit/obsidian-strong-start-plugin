import { describe, expect, it } from "vitest";
import { buildSessionSheet } from "../src/sessions/session-sheet";
import type { SessionModel } from "../src/sessions/types";

function session(overrides: Partial<SessionModel> = {}): SessionModel {
	return {
		path: "Campaigns/Greenhollow/Sessions/Session 4.md",
		campaign: "[[Greenhollow]]",
		session: 4,
		status: "prep",
		stepsDone: [],
		secrets: [],
		npcs: [],
		locations: [],
		monsters: [],
		...overrides,
	};
}

const EMPTY_BODY = "## Strong start\n\n## Scenes\n\n## Rewards\n\n## Log\n";

describe("buildSessionSheet", () => {
	it("titles the sheet with session number and campaign name", () => {
		const sheet = buildSessionSheet("Greenhollow", session(), EMPTY_BODY);
		expect(sheet.startsWith("# Session 4 — Greenhollow\n")).toBe(true);
	});

	it("includes the date when present", () => {
		const sheet = buildSessionSheet("Greenhollow", session({ date: "2026-01-05" }), EMPTY_BODY);
		expect(sheet).toContain("# Session 4 — Greenhollow (2026-01-05)");
	});

	it("pulls the strong start body section", () => {
		const body = "## Strong start\nThe party wakes up in a cage.\n\n## Scenes\n\n## Rewards\n";
		const sheet = buildSessionSheet("Greenhollow", session(), body);
		expect(sheet).toContain("## Strong start\n\nThe party wakes up in a cage.");
	});

	it("shows 'None yet.' for every empty section", () => {
		const sheet = buildSessionSheet("Greenhollow", session(), EMPTY_BODY);
		expect(sheet).toContain("## Strong start\n\nNone yet.");
		expect(sheet).toContain("## Scenes\n\n- None yet.");
		expect(sheet).toContain("## Secrets\n\n- None yet.");
		expect(sheet).toContain("## Locations\n\n- None yet.");
		expect(sheet).toContain("## Rewards\n\n- None yet.");
	});

	it("renders scenes with their done state as checkboxes", () => {
		const body = "## Strong start\n\n## Scenes\n- [x] Scout the mill\n- [ ] Confront the mayor\n\n## Rewards\n";
		const sheet = buildSessionSheet("Greenhollow", session(), body);
		expect(sheet).toContain("- [x] Scout the mill");
		expect(sheet).toContain("- [ ] Confront the mayor");
	});

	it("marks unrevealed secrets with an open checkbox and revealed ones as done", () => {
		const s = session({
			secrets: [
				{ id: "s-1", text: "The mayor is a doppelganger" },
				{ id: "s-2", text: "The well is cursed", revealed: true },
				{ id: "s-3", text: "Retired secret", archived: true },
			],
		});
		const sheet = buildSessionSheet("Greenhollow", s, EMPTY_BODY);
		expect(sheet).toContain("- [ ] The mayor is a doppelganger");
		expect(sheet).toContain("- [x] The well is cursed (revealed)");
		expect(sheet).not.toContain("Retired secret");
	});

	it("strips wikilink brackets from locations/NPCs/monsters", () => {
		const s = session({
			locations: ["[[The Sunken Keep]]"],
			npcs: ["[[Mireth the Broker|Mireth]]"],
			monsters: ["Owlbear"],
		});
		const sheet = buildSessionSheet("Greenhollow", s, EMPTY_BODY);
		expect(sheet).toContain("## Locations\n\n- The Sunken Keep");
		expect(sheet).toContain("## NPCs\n\n- Mireth");
		expect(sheet).toContain("## Monsters\n\n- Owlbear");
	});

	it("renders reward rows verbatim, adding a bullet if missing", () => {
		const body = "## Strong start\n\n## Scenes\n\n## Rewards\n- A +1 dagger\nA silver amulet\n";
		const sheet = buildSessionSheet("Greenhollow", session(), body);
		expect(sheet).toContain("- A +1 dagger");
		expect(sheet).toContain("- A silver amulet");
	});

	it("ends with a single trailing newline", () => {
		const sheet = buildSessionSheet("Greenhollow", session(), EMPTY_BODY);
		expect(sheet.endsWith("\n")).toBe(true);
		expect(sheet.endsWith("\n\n")).toBe(false);
	});
});
