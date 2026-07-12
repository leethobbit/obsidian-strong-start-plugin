import { describe, expect, it } from "vitest";
import { formatClockTime, formatElapsed } from "../src/lib/format-elapsed";

describe("formatElapsed", () => {
	it("formats sub-minute durations as mm:ss", () => {
		expect(formatElapsed(0)).toBe("0:00");
		expect(formatElapsed(59_000)).toBe("0:59");
	});

	it("formats sub-hour durations as m:ss / mm:ss", () => {
		expect(formatElapsed(60_000)).toBe("1:00");
		expect(formatElapsed(5 * 60_000 + 32_000)).toBe("5:32");
		expect(formatElapsed(59 * 60_000 + 59_000)).toBe("59:59");
	});

	it("switches to h:mm (no seconds) at the first full hour", () => {
		expect(formatElapsed(60 * 60_000)).toBe("1:00");
		expect(formatElapsed(60 * 60_000 + 90_000)).toBe("1:01");
		expect(formatElapsed(3 * 60 * 60_000 + 5 * 60_000)).toBe("3:05");
	});

	it("clamps negative/non-finite input to zero", () => {
		expect(formatElapsed(-500)).toBe("0:00");
		expect(formatElapsed(NaN)).toBe("0:00");
	});
});

describe("formatClockTime", () => {
	it("formats HH:MM, zero-padded", () => {
		expect(formatClockTime(new Date(2026, 0, 1, 9, 5))).toBe("09:05");
		expect(formatClockTime(new Date(2026, 0, 1, 23, 59))).toBe("23:59");
		expect(formatClockTime(new Date(2026, 0, 1, 0, 0))).toBe("00:00");
	});
});
