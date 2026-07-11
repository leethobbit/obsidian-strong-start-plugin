import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings/settings";

// Seed test proving the pure-logic split works: this file imports a module
// with no `obsidian` import. If this test can't run, someone leaked an
// obsidian import into a pure module.
describe("settings model", () => {
	it("has defaults", () => {
		expect(DEFAULT_SETTINGS.campaignRoot).toBe("Campaigns");
	});
});
