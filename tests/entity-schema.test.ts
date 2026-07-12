import { describe, expect, it } from "vitest";
import {
	readLocationFm,
	readNpcFm,
	readPcFm,
	readQuestFm,
	writeLocationFm,
	writeNpcFm,
	writePcFm,
	writeQuestFm,
} from "../src/roster/entity-schema";

describe("PC codec", () => {
	it("reads a well-formed pc", () => {
		expect(readPcFm({ type: "pc", campaign: "[[Greenhollow]]", player: "Sarah", role: "wizard", level: 4 })).toEqual({
			campaign: "[[Greenhollow]]",
			player: "Sarah",
			role: "wizard",
			level: 4,
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
			level: "",
		});
	});

	it("round-trips level through write then read", () => {
		const written = writePcFm({ campaign: "[[Greenhollow]]", level: 7 });
		expect(readPcFm(written)?.level).toBe(7);
	});

	it("is lenient about level: tolerates a numeric string, drops out-of-range or non-numeric values", () => {
		expect(readPcFm({ campaign: "[[Greenhollow]]", level: "12" })?.level).toBe(12);
		expect(readPcFm({ campaign: "[[Greenhollow]]", level: 0 })?.level).toBeUndefined();
		expect(readPcFm({ campaign: "[[Greenhollow]]", level: 21 })?.level).toBeUndefined();
		expect(readPcFm({ campaign: "[[Greenhollow]]", level: "wizard" })?.level).toBeUndefined();
	});

	it("absent level reads as undefined (cleared = deleted)", () => {
		expect(readPcFm({ campaign: "[[Greenhollow]]" })?.level).toBeUndefined();
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

describe("Quest codec (M17)", () => {
	it("reads a well-formed quest", () => {
		expect(readQuestFm({ type: "quest", campaign: "[[Greenhollow]]", status: "done" })).toEqual({
			campaign: "[[Greenhollow]]",
			status: "done",
		});
	});

	it("treats absent or junk status as open", () => {
		expect(readQuestFm({ campaign: "[[Greenhollow]]" })?.status).toBe("open");
		expect(readQuestFm({ campaign: "[[Greenhollow]]", status: "banana" })?.status).toBe("open");
	});

	it("returns null without a campaign link", () => {
		expect(readQuestFm({ status: "done" })).toBeNull();
	});

	it("writes done verbatim and open as empty for pruning (cleared = deleted)", () => {
		expect(writeQuestFm({ campaign: "[[Greenhollow]]", status: "done" })).toEqual({
			type: "quest",
			campaign: "[[Greenhollow]]",
			status: "done",
		});
		expect(writeQuestFm({ campaign: "[[Greenhollow]]", status: "open" })).toEqual({
			type: "quest",
			campaign: "[[Greenhollow]]",
			status: "",
		});
	});

	it("round-trips both statuses", () => {
		expect(readQuestFm(writeQuestFm({ campaign: "[[G]]", status: "done" }))?.status).toBe("done");
		expect(readQuestFm(writeQuestFm({ campaign: "[[G]]", status: "open" }))?.status).toBe("open");
	});
});
