import { describe, expect, it } from "vitest";
import { deriveRunTallies } from "../src/sessions/run-derive";
import type { SessionModel } from "../src/sessions/types";

function session(overrides: Partial<SessionModel> = {}): SessionModel {
	return {
		path: "Sessions/Session 4.md",
		campaign: "[[Greenhollow]]",
		session: 4,
		status: "prep",
		stepsDone: [],
		secrets: [],
		npcs: [],
		locations: [],
		monsters: [],
		...overrides,
	};
}

describe("deriveRunTallies", () => {
	it("tallies scenes done/total and secrets revealed/total", () => {
		const s = session({
			secrets: [
				{ id: "s-1", text: "a", revealed: true },
				{ id: "s-2", text: "b" },
				{ id: "s-3", text: "c" },
			],
		});
		const scenes = [
			{ text: "Scout the mill", done: true },
			{ text: "Confront the mayor", done: false },
			{ text: "Escape the tunnel", done: false },
		];
		expect(deriveRunTallies(s, scenes)).toEqual({
			scenesDone: 1,
			scenesTotal: 3,
			secretsRevealed: 1,
			secretsTotal: 3,
			carryCount: 2,
		});
	});

	it("excludes archived secrets from every count", () => {
		const s = session({
			secrets: [
				{ id: "s-1", text: "a", archived: true },
				{ id: "s-2", text: "b", revealed: true },
			],
		});
		expect(deriveRunTallies(s, [])).toEqual({
			scenesDone: 0,
			scenesTotal: 0,
			secretsRevealed: 1,
			secretsTotal: 1,
			carryCount: 0,
		});
	});

	it("handles zero scenes and zero secrets", () => {
		expect(deriveRunTallies(session(), [])).toEqual({
			scenesDone: 0,
			scenesTotal: 0,
			secretsRevealed: 0,
			secretsTotal: 0,
			carryCount: 0,
		});
	});

	it("carryCount is zero when everything active is revealed", () => {
		const s = session({ secrets: [{ id: "s-1", text: "a", revealed: true }, { id: "s-2", text: "b", revealed: true }] });
		expect(deriveRunTallies(s, []).carryCount).toBe(0);
	});
});
