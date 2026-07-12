import { describe, expect, it } from "vitest";
import {
	CAMPAIGN_BODY_SECTIONS,
	buildCampaignBody,
	campaignBodyScaffold,
	readCampaignFm,
	writeCampaignFm,
} from "../src/campaigns/campaign-schema";
import { parseFronts } from "../src/campaigns/fronts";
import { parseBulletSection } from "../src/sessions/bullet-list";
import { sectionContent } from "../src/lib/sections";

describe("readCampaignFm", () => {
	it("reads a well-formed object", () => {
		expect(readCampaignFm({ type: "campaign", id: "c-4k2j9x", system: "5e", status: "active" })).toEqual({
			id: "c-4k2j9x",
			system: "5e",
			status: "active",
		});
	});

	it("defaults status to active when absent", () => {
		expect(readCampaignFm({ id: "c-1" })?.status).toBe("active");
	});

	it("tolerates junk status values by falling back to active", () => {
		expect(readCampaignFm({ id: "c-1", status: "deleted" })?.status).toBe("active");
	});

	it("omits system when blank", () => {
		expect(readCampaignFm({ id: "c-1", system: "" })?.system).toBeUndefined();
	});

	it("returns null without a stable id", () => {
		expect(readCampaignFm({ status: "active" })).toBeNull();
		expect(readCampaignFm(null)).toBeNull();
		expect(readCampaignFm("not an object")).toBeNull();
	});
});

describe("writeCampaignFm", () => {
	it("emits the canonical shape, leaving active/absent system as prunable empty strings", () => {
		expect(writeCampaignFm({ id: "c-1", system: "5e", status: "active" })).toEqual({
			type: "campaign",
			id: "c-1",
			system: "5e",
			status: "",
		});
		expect(writeCampaignFm({ id: "c-1", status: "archived" })).toEqual({
			type: "campaign",
			id: "c-1",
			system: "",
			status: "archived",
		});
	});
});

describe("campaign body scaffold", () => {
	it("has one heading per managed section, in order", () => {
		const scaffold = campaignBodyScaffold();
		for (const heading of CAMPAIGN_BODY_SECTIONS) {
			expect(scaffold).toContain(`## ${heading}`);
		}
	});
});

describe("buildCampaignBody", () => {
	it("an all-skipped wizard run produces the identical empty scaffold", () => {
		expect(buildCampaignBody("", [], [])).toBe(campaignBodyScaffold());
	});

	it("fills the pitch section verbatim", () => {
		const body = buildCampaignBody("Prevent the coming of the Black Moon", [], []);
		expect(sectionContent(body, "Campaign pitch")).toBe("Prevent the coming of the Black Moon");
	});

	it("fills six truths as a bullet list", () => {
		const truths = ["Truth one", "Truth two", "Truth three"];
		const body = buildCampaignBody("", truths, []);
		expect(parseBulletSection(sectionContent(body, "Six truths"))).toEqual({ rows: truths, malformed: false });
	});

	it("drops blank truth inputs (six fixed slots, only some filled)", () => {
		const body = buildCampaignBody("", ["Truth one", "", "  ", "Truth two", "", ""], []);
		expect(parseBulletSection(sectionContent(body, "Six truths")).rows).toEqual(["Truth one", "Truth two"]);
	});

	it("fills fronts, each becoming its own `###` block", () => {
		const body = buildCampaignBody("", [], [
			{ name: "Dark necromancer", goal: "Raise an army", portents: ["First sign", "Second sign", ""], doom: "The dead rise." },
		]);
		const fronts = parseFronts(sectionContent(body, "Fronts"));
		expect(fronts).toEqual([
			{
				name: "Dark necromancer",
				goal: "Raise an army",
				portents: [
					{ text: "First sign", done: false },
					{ text: "Second sign", done: false },
				],
				doom: "The dead rise.",
				extra: [],
			},
		]);
	});

	it("leaves House rules empty — the wizard has no step for it", () => {
		const body = buildCampaignBody("A pitch", ["A truth"], []);
		expect(sectionContent(body, "House rules")).toBe("");
	});
});
