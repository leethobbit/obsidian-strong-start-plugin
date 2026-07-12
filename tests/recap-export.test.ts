import { describe, expect, it } from "vitest";
import { buildPlayerRecap, type RecapSource } from "../src/sessions/recap-export";
import type { SessionModel } from "../src/sessions/types";

function session(overrides: Partial<SessionModel>): SessionModel {
	return {
		path: "Campaigns/Test/Sessions/Session 1.md",
		campaign: "[[Test]]",
		session: 1,
		status: "played",
		stepsDone: [],
		secrets: [],
		npcs: [],
		locations: [],
		monsters: [],
		...overrides,
	};
}

function source(model: Partial<SessionModel>, body = ""): RecapSource {
	return { session: session(model), body };
}

describe("buildPlayerRecap", () => {
	it("returns null when nothing has been played", () => {
		expect(buildPlayerRecap("Greenhollow", [])).toBeNull();
		expect(buildPlayerRecap("Greenhollow", [source({ status: "prep" })])).toBeNull();
	});

	it("emits played sessions in ascending order regardless of input order", () => {
		const recap = buildPlayerRecap("Greenhollow", [
			source({ session: 3 }, "## Recap\nThird."),
			source({ session: 1 }, "## Recap\nFirst."),
		]);
		expect(recap).not.toBeNull();
		const first = recap?.indexOf("## Session 1") ?? -1;
		const third = recap?.indexOf("## Session 3") ?? -1;
		expect(first).toBeGreaterThan(-1);
		expect(third).toBeGreaterThan(first);
	});

	it("skips prep sessions entirely", () => {
		const recap = buildPlayerRecap("Greenhollow", [
			source({ session: 1 }, "## Recap\nDone."),
			source({ session: 2, status: "prep" }, "## Recap\nNot yet."),
		]);
		expect(recap).not.toContain("Session 2");
		expect(recap).not.toContain("Not yet.");
	});

	it("includes only revealed, non-archived secrets", () => {
		const recap = buildPlayerRecap("Greenhollow", [
			source(
				{
					session: 1,
					secrets: [
						{ id: "s-1", text: "The mayor is a doppelganger", revealed: true },
						{ id: "s-2", text: "The mill hides a shrine" },
						{ id: "s-3", text: "The king is dead", revealed: true, archived: true },
					],
				},
				"## Recap\nA session."
			),
		]);
		expect(recap).toContain("The mayor is a doppelganger");
		expect(recap).not.toContain("The mill hides a shrine");
		expect(recap).not.toContain("The king is dead");
	});

	it("carries the reveal note inline and never leaks the GM log", () => {
		const recap = buildPlayerRecap("Greenhollow", [
			source(
				{ session: 1, secrets: [{ id: "s-1", text: "A clue", revealed: true, note: "Kara spotted the ring" }] },
				"## Recap\nShort.\n\n## Log\n- 19:02 players missed everything"
			),
		]);
		expect(recap).toContain("A clue (Kara spotted the ring)");
		expect(recap).not.toContain("players missed everything");
	});

	it("marks sessions without a recap instead of dropping them", () => {
		const recap = buildPlayerRecap("Greenhollow", [source({ session: 1, date: "2026-07-01" }, "")]);
		expect(recap).toContain("## Session 1 — 2026-07-01");
		expect(recap).toContain("_No recap recorded._");
	});
});
