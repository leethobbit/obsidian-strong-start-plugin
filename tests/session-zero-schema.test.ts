import { describe, expect, it } from "vitest";
import { readSessionZeroFm } from "../src/checklist/session-zero-schema";

describe("readSessionZeroFm", () => {
	it("reads campaign + lines/veils", () => {
		expect(
			readSessionZeroFm({ type: "session-zero", campaign: "[[Greenhollow]]", lines: ["harm to children"], veils: ["torture"] })
		).toEqual({ campaign: "[[Greenhollow]]", lines: ["harm to children"], veils: ["torture"] });
	});

	it("defaults missing lines/veils to empty arrays", () => {
		expect(readSessionZeroFm({ campaign: "[[Greenhollow]]" })).toEqual({
			campaign: "[[Greenhollow]]",
			lines: [],
			veils: [],
		});
	});

	it("returns null without a campaign link", () => {
		expect(readSessionZeroFm({ lines: ["x"] })).toBeNull();
		expect(readSessionZeroFm(null)).toBeNull();
		expect(readSessionZeroFm("not an object")).toBeNull();
	});

	it("filters non-string entries out of lines/veils", () => {
		expect(readSessionZeroFm({ campaign: "[[G]]", lines: ["a", 5, null], veils: [1, "b"] })).toEqual({
			campaign: "[[G]]",
			lines: ["a"],
			veils: ["b"],
		});
	});
});
