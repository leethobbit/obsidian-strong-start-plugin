import { describe, expect, it } from "vitest";
import { DESTINATIONS, PHONE_BAR, PHONE_MORE_SHEET, destinationFor } from "../src/views/nav-model";

describe("nav model", () => {
	it("has one entry per mode, no duplicates", () => {
		const modes = DESTINATIONS.map((d) => d.mode);
		expect(new Set(modes).size).toBe(modes.length);
	});

	it("lists the documented destinations in rail order", () => {
		expect(DESTINATIONS.map((d) => d.mode)).toEqual(["home", "prep", "run", "secrets", "tables", "help"]);
	});

	it("keeps Help pinned to the footer group", () => {
		expect(destinationFor("help")?.group).toBe("footer");
	});

	it("groups hub/pipeline/insight destinations as documented", () => {
		expect(destinationFor("home")?.group).toBe("hub");
		expect(destinationFor("prep")?.group).toBe("pipeline");
		expect(destinationFor("run")?.group).toBe("pipeline");
		expect(destinationFor("secrets")?.group).toBe("insight");
		expect(destinationFor("tables")?.group).toBe("insight");
	});

	it("gives home and tables their documented sub-tabs", () => {
		expect(destinationFor("home")?.subtabs).toEqual(["dashboard", "sessions", "world", "foundation", "session-zero"]);
		expect(destinationFor("tables")?.subtabs).toEqual(["roll", "generators"]);
	});

	it("has a Lucide icon id for every destination", () => {
		for (const dest of DESTINATIONS) {
			expect(dest.icon.length).toBeGreaterThan(0);
		}
	});

	it("keeps the phone bar and more-sheet non-overlapping and only referencing real destinations", () => {
		const modes = new Set(DESTINATIONS.map((d) => d.mode));
		for (const mode of [...PHONE_BAR, ...PHONE_MORE_SHEET]) {
			expect(modes.has(mode)).toBe(true);
		}
		const bar = new Set(PHONE_BAR);
		const overlap = PHONE_MORE_SHEET.filter((mode) => bar.has(mode));
		expect(overlap).toEqual([]);
	});

	it("puts Run first in the phone bar", () => {
		expect(PHONE_BAR[0]).toBe("run");
	});
});
