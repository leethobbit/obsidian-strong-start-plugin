import { describe, expect, it } from "vitest";
import {
	readSessionFm,
	SESSION_BODY_SECTIONS,
	sessionBodyScaffold,
	toSessionFm,
	writeSessionFm,
} from "../src/sessions/session-schema";

describe("readSessionFm", () => {
	it("reads a well-formed session", () => {
		const fm = readSessionFm({
			type: "session",
			campaign: "[[Greenhollow]]",
			session: 4,
			date: "2026-07-18",
			status: "played",
			stepsDone: ["characters", "strong-start"],
			secrets: [{ id: "s-1", text: "The mayor is a doppelganger.", revealed: true }],
			npcs: ["[[Mayor Elba]]"],
			locations: [],
			monsters: ["4 x goblin"],
		});
		expect(fm).toEqual({
			campaign: "[[Greenhollow]]",
			session: 4,
			date: "2026-07-18",
			status: "played",
			stepsDone: ["characters", "strong-start"],
			secrets: [{ id: "s-1", text: "The mayor is a doppelganger.", revealed: true }],
			npcs: ["[[Mayor Elba]]"],
			locations: [],
			monsters: ["4 x goblin"],
		});
	});

	it("coerces a stringly-typed session number", () => {
		expect(readSessionFm({ campaign: "[[X]]", session: "4" })?.session).toBe(4);
	});

	it("defaults status to prep and missing arrays to empty", () => {
		const fm = readSessionFm({ campaign: "[[X]]" });
		expect(fm?.status).toBe("prep");
		expect(fm?.stepsDone).toEqual([]);
		expect(fm?.secrets).toEqual([]);
		expect(fm?.npcs).toEqual([]);
	});

	it("dedupes duplicate secret ids, keeping the first", () => {
		const fm = readSessionFm({
			campaign: "[[X]]",
			secrets: [
				{ id: "s-1", text: "first" },
				{ id: "s-1", text: "second, should be dropped" },
				{ id: "s-2", text: "kept" },
			],
		});
		expect(fm?.secrets).toEqual([
			{ id: "s-1", text: "first" },
			{ id: "s-2", text: "kept" },
		]);
	});

	it("drops malformed secret entries (missing id/text)", () => {
		const fm = readSessionFm({
			campaign: "[[X]]",
			secrets: [{ id: "s-1" }, { text: "no id" }, { id: "s-2", text: "kept" }],
		});
		expect(fm?.secrets).toEqual([{ id: "s-2", text: "kept" }]);
	});

	it("returns null without a campaign link", () => {
		expect(readSessionFm({ session: 1 })).toBeNull();
		expect(readSessionFm(null)).toBeNull();
	});
});

describe("writeSessionFm", () => {
	it("emits the canonical shape", () => {
		expect(
			writeSessionFm({
				campaign: "[[Greenhollow]]",
				session: 4,
				date: "2026-07-18",
				status: "prep",
				stepsDone: [],
				secrets: [],
				npcs: [],
				locations: [],
				monsters: [],
			})
		).toEqual({
			type: "session",
			campaign: "[[Greenhollow]]",
			session: 4,
			date: "2026-07-18",
			status: "",
			stepsDone: [],
			secrets: [],
			npcs: [],
			locations: [],
			monsters: [],
		});
	});
});

describe("toSessionFm", () => {
	it("strips `path` and round-trips through writeSessionFm", () => {
		const fm = toSessionFm({
			path: "Campaigns/Greenhollow/Sessions/Session 4.md",
			campaign: "[[Greenhollow]]",
			session: 4,
			date: "2026-07-18",
			status: "prep",
			stepsDone: ["characters"],
			secrets: [],
			npcs: [],
			locations: [],
			monsters: [],
		});
		expect(fm).not.toHaveProperty("path");
		expect(writeSessionFm(fm).stepsDone).toEqual(["characters"]);
	});
});

describe("session body scaffold", () => {
	it("has one heading per managed section", () => {
		const scaffold = sessionBodyScaffold();
		for (const heading of SESSION_BODY_SECTIONS) {
			expect(scaffold).toContain(`## ${heading}`);
		}
	});

	it("scaffolds the run-mode sections in reading order, Notes before Log", () => {
		expect([...SESSION_BODY_SECTIONS]).toEqual(["Strong start", "Scenes", "Rewards", "Notes", "Log"]);
	});
});
