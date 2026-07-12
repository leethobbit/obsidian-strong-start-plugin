import { describe, expect, it } from "vitest";
import { buildSessionZeroGuide } from "../src/checklist/guide-export";

const CAMPAIGN_BODY = [
	"## Campaign pitch",
	"A slow apocalypse in a drowned valley.",
	"",
	"## Six truths",
	"- The rains never stop.",
	"- Magic rusts.",
	"",
	"## Fronts",
	"### The Veiled Hand",
	"Goal: drown the world.",
].join("\n");

describe("buildSessionZeroGuide", () => {
	it("returns null when there is nothing to hand out", () => {
		expect(buildSessionZeroGuide({ campaignName: "Test", campaignBody: "" })).toBeNull();
	});

	it("builds pitch + truths and never includes fronts", () => {
		const guide = buildSessionZeroGuide({ campaignName: "Greenhollow", campaignBody: CAMPAIGN_BODY });
		expect(guide).toContain("# Greenhollow — player guide");
		expect(guide).toContain("A slow apocalypse in a drowned valley.");
		expect(guide).toContain("- The rains never stop.");
		expect(guide).not.toContain("Veiled Hand");
		expect(guide).not.toContain("drown the world");
	});

	it("includes expectations and lines/veils from the session-zero note", () => {
		const guide = buildSessionZeroGuide({
			campaignName: "Greenhollow",
			campaignBody: CAMPAIGN_BODY,
			sessionZero: {
				lines: ["harm to children"],
				veils: ["torture"],
				body: "## Expectations\nWeekly, three hours, roleplay-heavy.\n\n## Logistics\nMy place.",
			},
		});
		expect(guide).toContain("Weekly, three hours, roleplay-heavy.");
		expect(guide).toContain("**Lines (never on screen):**\n- harm to children");
		expect(guide).toContain("**Veils (off-screen / fade out):**\n- torture");
		expect(guide).not.toContain("My place.");
	});

	it("omits empty sections instead of emitting empty headings", () => {
		const guide = buildSessionZeroGuide({
			campaignName: "Test",
			campaignBody: "## Campaign pitch\nJust a pitch.",
		});
		expect(guide).toContain("## The pitch");
		expect(guide).not.toContain("## Truths of this world");
		expect(guide).not.toContain("## Safety");
	});
});
