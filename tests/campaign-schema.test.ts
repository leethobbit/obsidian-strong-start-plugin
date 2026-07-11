import { describe, expect, it } from "vitest";
import {
	CAMPAIGN_BODY_SECTIONS,
	campaignBodyScaffold,
	readCampaignFm,
	writeCampaignFm,
} from "../src/campaigns/campaign-schema";

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
