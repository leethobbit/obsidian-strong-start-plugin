import { describe, expect, it } from "vitest";
import {
	readSessionZeroFm,
	writeSessionZeroFm,
	sessionZeroBodyScaffold,
	SESSION_ZERO_BODY_SECTIONS,
	type SessionZeroFm,
} from "../src/checklist/session-zero-schema";
import { pruneEmpty } from "../src/lib/frontmatter";

describe("readSessionZeroFm", () => {
	it("reads campaign + done/lines/veils", () => {
		expect(
			readSessionZeroFm({
				type: "session-zero",
				campaign: "[[Greenhollow]]",
				done: ["one-page-guide", "safety-discussion"],
				lines: ["harm to children"],
				veils: ["torture"],
			})
		).toEqual({
			campaign: "[[Greenhollow]]",
			done: ["one-page-guide", "safety-discussion"],
			lines: ["harm to children"],
			veils: ["torture"],
		});
	});

	it("defaults missing done/lines/veils to empty arrays", () => {
		expect(readSessionZeroFm({ campaign: "[[Greenhollow]]" })).toEqual({
			campaign: "[[Greenhollow]]",
			done: [],
			lines: [],
			veils: [],
		});
	});

	it("returns null without a campaign link", () => {
		expect(readSessionZeroFm({ lines: ["x"] })).toBeNull();
		expect(readSessionZeroFm(null)).toBeNull();
		expect(readSessionZeroFm("not an object")).toBeNull();
	});

	it("filters non-string entries out of done/lines/veils", () => {
		expect(readSessionZeroFm({ campaign: "[[G]]", done: ["a", 5, null], lines: ["a", 5, null], veils: [1, "b"] })).toEqual({
			campaign: "[[G]]",
			done: ["a"],
			lines: ["a"],
			veils: ["b"],
		});
	});
});

describe("writeSessionZeroFm", () => {
	it("emits the canonical shape", () => {
		const model: SessionZeroFm = {
			campaign: "[[Greenhollow]]",
			done: ["one-page-guide"],
			lines: ["harm to children"],
			veils: ["torture"],
		};
		expect(writeSessionZeroFm(model)).toEqual({
			type: "session-zero",
			campaign: "[[Greenhollow]]",
			done: ["one-page-guide"],
			lines: ["harm to children"],
			veils: ["torture"],
		});
	});

	it("round-trips through read after write", () => {
		const model: SessionZeroFm = {
			campaign: "[[Greenhollow]]",
			done: ["one-page-guide", "safety-discussion"],
			lines: ["harm to children"],
			veils: ["torture", "racism"],
		};
		expect(readSessionZeroFm(writeSessionZeroFm(model))).toEqual(model);
	});

	it("cleared = deleted: empty done/lines/veils are pruned entirely, not written as []", () => {
		const model: SessionZeroFm = { campaign: "[[Greenhollow]]", done: [], lines: [], veils: [] };
		expect(pruneEmpty(writeSessionZeroFm(model))).toEqual({
			type: "session-zero",
			campaign: "[[Greenhollow]]",
		});
	});

	it("clearing just the lines (veils/done still populated) prunes only that key", () => {
		const model: SessionZeroFm = { campaign: "[[Greenhollow]]", done: ["one-page-guide"], lines: [], veils: ["torture"] };
		expect(pruneEmpty(writeSessionZeroFm(model))).toEqual({
			type: "session-zero",
			campaign: "[[Greenhollow]]",
			done: ["one-page-guide"],
			veils: ["torture"],
		});
	});
});

describe("session zero body scaffold", () => {
	it("has one heading per managed section, in order", () => {
		const scaffold = sessionZeroBodyScaffold();
		for (const heading of SESSION_ZERO_BODY_SECTIONS) {
			expect(scaffold).toContain(`## ${heading}`);
		}
	});
});
