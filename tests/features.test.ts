import { describe, expect, it } from "vitest";
import { FEATURES, featureEnabled } from "../src/features";
import { DEFAULT_SETTINGS } from "../src/settings/settings";

describe("features registry", () => {
	it("registers session-zero and dnd5e", () => {
		const ids = FEATURES.map((f) => f.id);
		expect(ids).toContain("session-zero");
		expect(ids).toContain("dnd5e");
	});

	it("has no duplicate ids", () => {
		const ids = FEATURES.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("every feature is on by default", () => {
		for (const feature of FEATURES) {
			expect(featureEnabled(DEFAULT_SETTINGS, feature.id), feature.id).toBe(true);
		}
	});

	it("disabling a feature round-trips through the settings model", () => {
		const disabled = { ...DEFAULT_SETTINGS, disabledFeatures: ["dnd5e"] };
		expect(featureEnabled(disabled, "dnd5e")).toBe(false);
		expect(featureEnabled(disabled, "session-zero")).toBe(true);

		const reEnabled = { ...disabled, disabledFeatures: disabled.disabledFeatures.filter((id) => id !== "dnd5e") };
		expect(featureEnabled(reEnabled, "dnd5e")).toBe(true);
	});

	it("an unrecognized id is treated as enabled rather than throwing", () => {
		expect(featureEnabled(DEFAULT_SETTINGS, "not-a-real-feature")).toBe(true);
	});
});
