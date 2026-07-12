import { describe, expect, it } from "vitest";
import { isIsoDate } from "../src/lib/date";

describe("isIsoDate", () => {
	it("accepts real calendar dates", () => {
		expect(isIsoDate("2026-07-18")).toBe(true);
		expect(isIsoDate("2024-02-29")).toBe(true); // leap day
		expect(isIsoDate("1999-12-31")).toBe(true);
	});

	it("rejects malformed strings", () => {
		expect(isIsoDate("")).toBe(false);
		expect(isIsoDate("2026-7-1")).toBe(false); // unpadded
		expect(isIsoDate("18-07-2026")).toBe(false);
		expect(isIsoDate("2026-07-18 ")).toBe(false); // trailing junk
		expect(isIsoDate("2026-07-18T00:00")).toBe(false);
	});

	it("rejects impossible calendar dates", () => {
		expect(isIsoDate("2026-13-01")).toBe(false);
		expect(isIsoDate("2026-00-10")).toBe(false);
		expect(isIsoDate("2026-02-30")).toBe(false);
		expect(isIsoDate("2025-02-29")).toBe(false); // not a leap year
	});
});
