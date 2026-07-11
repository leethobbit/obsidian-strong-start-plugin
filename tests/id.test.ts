import { describe, expect, it } from "vitest";
import { newId } from "../src/lib/id";

describe("newId", () => {
	it("prefixes with the given string and 6 base36 chars", () => {
		expect(newId("c")).toMatch(/^c-[0-9a-z]{6}$/);
		expect(newId("s")).toMatch(/^s-[0-9a-z]{6}$/);
	});

	it("produces different ids across calls", () => {
		const ids = new Set(Array.from({ length: 50 }, () => newId("s")));
		expect(ids.size).toBeGreaterThan(45);
	});
});
