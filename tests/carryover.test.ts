import { describe, expect, it } from "vitest";
import { canHardDelete, carryForward, latestVersions, openSecrets, syncCarried } from "../src/sessions/carryover";
import type { SessionModel } from "../src/sessions/types";

function session(overrides: Partial<SessionModel> & Pick<SessionModel, "path" | "session">): SessionModel {
	return {
		campaign: "[[Test]]",
		status: "prep",
		stepsDone: [],
		secrets: [],
		npcs: [],
		locations: [],
		monsters: [],
		...overrides,
	};
}

describe("carryForward", () => {
	it("carries an unrevealed, non-archived secret forward", () => {
		const s1 = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "The mayor is a doppelganger." }] });
		expect(carryForward([s1])).toEqual([{ id: "s-1", text: "The mayor is a doppelganger." }]);
	});

	it("excludes revealed secrets", () => {
		const s1 = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x", revealed: true }] });
		expect(carryForward([s1])).toEqual([]);
	});

	it("excludes archived (tombstoned) secrets", () => {
		const s1 = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x", archived: true }] });
		expect(carryForward([s1])).toEqual([]);
	});

	it("never copies state flags, even when the authoritative copy carries a note", () => {
		const s1 = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x", note: "should not carry" }] });
		const result = carryForward([s1]);
		expect(result).toEqual([{ id: "s-1", text: "x" }]);
		expect(result[0]).not.toHaveProperty("note");
		expect(result[0]).not.toHaveProperty("revealed");
		expect(result[0]).not.toHaveProperty("archived");
	});

	it("uses the latest session's text when a secret was edited in a later session", () => {
		const s1 = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "original text" }] });
		const s2 = session({ path: "s2.md", session: 2, secrets: [{ id: "s-1", text: "edited text" }] });
		expect(carryForward([s1, s2])).toEqual([{ id: "s-1", text: "edited text" }]);
	});

	it("orders by first appearance: session number asc, then row order within that session", () => {
		const s1 = session({
			path: "s1.md",
			session: 1,
			secrets: [
				{ id: "s-b", text: "b" },
				{ id: "s-a", text: "a" },
			],
		});
		const s2 = session({ path: "s2.md", session: 2, secrets: [{ id: "s-c", text: "c" }] });
		// Passed newest-first (as CampaignStore.sessionsOf returns them) — order
		// must come from session/row data, never array position.
		expect(carryForward([s2, s1]).map((s) => s.id)).toEqual(["s-b", "s-a", "s-c"]);
	});

	it("trusts deduped input: a hypothetical duplicate id within one session keeps the first row (matches the codec's own keep-first dedupe)", () => {
		const s1: SessionModel = {
			...session({ path: "s1.md", session: 1 }),
			secrets: [
				{ id: "s-1", text: "first" },
				{ id: "s-1", text: "second, should not win" },
			],
		};
		expect(carryForward([s1])).toEqual([{ id: "s-1", text: "first" }]);
	});
});

describe("syncCarried", () => {
	it("appends a missing carried id", () => {
		const prior = [session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x" }] })];
		const current = session({ path: "s2.md", session: 2, secrets: [] });
		expect(syncCarried(current, prior)).toEqual([{ id: "s-1", text: "x" }]);
	});

	it("does not re-add an id already present but archived in current", () => {
		const prior = [session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x" }] })];
		const current = session({ path: "s2.md", session: 2, secrets: [{ id: "s-1", text: "x", archived: true }] });
		expect(syncCarried(current, prior)).toEqual([]);
	});

	it("does not re-add an id already present but revealed in current", () => {
		const prior = [session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x" }] })];
		const current = session({ path: "s2.md", session: 2, secrets: [{ id: "s-1", text: "x", revealed: true }] });
		expect(syncCarried(current, prior)).toEqual([]);
	});

	it("is strictly additive: never removes or overwrites current's own rows", () => {
		const prior = [session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "prior text" }] })];
		const current = session({ path: "s2.md", session: 2, secrets: [{ id: "s-2", text: "own secret" }] });
		expect(syncCarried(current, prior)).toEqual([{ id: "s-1", text: "prior text" }]);
		expect(current.secrets).toEqual([{ id: "s-2", text: "own secret" }]);
	});

	it("un-revealing the only (and authoritative) occurrence in an old session brings it back through sync, even with a later session already present", () => {
		// s-1 was originally revealed in session 1, so it never carried into
		// session 2. The GM decides that was premature and clears the flag
		// directly on session 1 — still the sole/authoritative occurrence.
		const s1Unrevealed = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x" }] });
		const s2 = session({ path: "s2.md", session: 2, secrets: [] });
		expect(syncCarried(s2, [s1Unrevealed])).toEqual([{ id: "s-1", text: "x" }]);
	});
});

describe("tombstone-then-restore", () => {
	it("archiving drops an id from carry-forward; removing the tombstone brings it back", () => {
		const archived = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x", archived: true }] });
		expect(carryForward([archived])).toEqual([]);

		const restored = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x" }] });
		expect(carryForward([restored])).toEqual([{ id: "s-1", text: "x" }]);
	});
});

describe("canHardDelete", () => {
	it("is true when the id appears in no earlier session", () => {
		const current = session({ path: "s2.md", session: 2, secrets: [{ id: "s-1", text: "x" }] });
		expect(canHardDelete("s-1", current, [])).toBe(true);
	});

	it("is false when the id also exists in an earlier session", () => {
		const prior = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "x" }] });
		const current = session({ path: "s2.md", session: 2, secrets: [{ id: "s-1", text: "x" }] });
		expect(canHardDelete("s-1", current, [prior])).toBe(false);
	});
});

describe("openSecrets", () => {
	it("reports in-play/revealed/retired state from the authoritative copy", () => {
		const s1 = session({
			path: "s1.md",
			session: 1,
			secrets: [
				{ id: "s-1", text: "in play" },
				{ id: "s-2", text: "revealed one", revealed: true, note: "saw the ring" },
				{ id: "s-3", text: "retired one", archived: true },
			],
		});
		const result = openSecrets([s1]);

		expect(result.find((d) => d.id === "s-1")?.state).toBe("in-play");

		const revealed = result.find((d) => d.id === "s-2");
		expect(revealed?.state).toBe("revealed");
		expect(revealed?.note).toBe("saw the ring");
		expect(revealed?.revealedInSession).toBe(1);

		expect(result.find((d) => d.id === "s-3")?.state).toBe("retired");
	});

	it("attributes origin session and counts distinct sessions carried", () => {
		const s1 = session({ path: "s1.md", session: 1, secrets: [{ id: "s-1", text: "a" }] });
		const s2 = session({ path: "s2.md", session: 2, secrets: [{ id: "s-1", text: "a" }] });
		const s3 = session({ path: "s3.md", session: 3, secrets: [{ id: "s-1", text: "a (edited)" }] });

		const entry = openSecrets([s1, s2, s3]).find((d) => d.id === "s-1");
		expect(entry?.originSession).toBe(1);
		expect(entry?.sessionsCarried).toBe(3);
		expect(entry?.text).toBe("a (edited)");
		expect(entry?.authoritativeSessionPath).toBe("s3.md");
		expect(entry?.authoritativeSessionNumber).toBe(3);
	});

	it("returns an empty fold for no sessions", () => {
		expect(openSecrets([])).toEqual([]);
	});
});

describe("latestVersions tie-break comparator", () => {
	it("breaks a same-session-number tie on date, ascending (later date wins)", () => {
		const a = session({ path: "a.md", session: 5, date: "2026-01-01", secrets: [{ id: "s-1", text: "from A" }] });
		const b = session({ path: "b.md", session: 5, date: "2026-02-01", secrets: [{ id: "s-1", text: "from B" }] });
		const result = latestVersions([a, b]);
		expect(result.get("s-1")?.secret.text).toBe("from B");
		expect(result.get("s-1")?.sessionPath).toBe("b.md");
	});

	it("breaks a same-session-number, same-date tie on path, ascending (later path wins)", () => {
		const a = session({ path: "a.md", session: 5, date: "2026-01-01", secrets: [{ id: "s-1", text: "from A" }] });
		const b = session({ path: "b.md", session: 5, date: "2026-01-01", secrets: [{ id: "s-1", text: "from B" }] });
		const result = latestVersions([a, b]);
		expect(result.get("s-1")?.secret.text).toBe("from B");
	});

	it("treats a missing date as sorting before any real date", () => {
		const noDate = session({ path: "a.md", session: 5, secrets: [{ id: "s-1", text: "no date" }] });
		const withDate = session({ path: "b.md", session: 5, date: "2026-01-01", secrets: [{ id: "s-1", text: "has date" }] });
		const result = latestVersions([noDate, withDate]);
		expect(result.get("s-1")?.secret.text).toBe("has date");
	});
});
