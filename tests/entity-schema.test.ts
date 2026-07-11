import { describe, expect, it } from "vitest";
import {
	readLocationFm,
	readNpcFm,
	readPcFm,
	writeLocationFm,
	writeNpcFm,
	writePcFm,
} from "../src/roster/entity-schema";

describe("PC codec", () => {
	it("reads a well-formed pc", () => {
		expect(readPcFm({ type: "pc", campaign: "[[Greenhollow]]", player: "Sarah", role: "wizard" })).toEqual({
			campaign: "[[Greenhollow]]",
			player: "Sarah",
			role: "wizard",
		});
	});

	it("returns null without a campaign link", () => {
		expect(readPcFm({ player: "Sarah" })).toBeNull();
		expect(readPcFm(null)).toBeNull();
	});

	it("writes the canonical shape", () => {
		expect(writePcFm({ campaign: "[[Greenhollow]]", player: "Sarah" })).toEqual({
			type: "pc",
			campaign: "[[Greenhollow]]",
			player: "Sarah",
			role: "",
		});
	});
});

describe("NPC codec", () => {
	it("defaults status to alive", () => {
		expect(readNpcFm({ campaign: "[[Greenhollow]]" })?.status).toBe("alive");
	});

	it("reads a dead NPC with a location", () => {
		expect(readNpcFm({ campaign: "[[Greenhollow]]", location: "[[The Docks]]", status: "dead" })).toEqual({
			campaign: "[[Greenhollow]]",
			role: undefined,
			location: "[[The Docks]]",
			status: "dead",
		});
	});

	it("writes the canonical shape", () => {
		expect(writeNpcFm({ campaign: "[[Greenhollow]]", status: "alive" })).toEqual({
			type: "npc",
			campaign: "[[Greenhollow]]",
			role: "",
			location: "",
			status: "",
		});
	});
});

describe("Location codec", () => {
	it("reads/writes the minimal shape", () => {
		expect(readLocationFm({ campaign: "[[Greenhollow]]" })).toEqual({ campaign: "[[Greenhollow]]" });
		expect(writeLocationFm({ campaign: "[[Greenhollow]]" })).toEqual({
			type: "location",
			campaign: "[[Greenhollow]]",
		});
	});

	it("returns null without a campaign link", () => {
		expect(readLocationFm({})).toBeNull();
	});
});
