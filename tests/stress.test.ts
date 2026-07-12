import { describe, expect, it } from "vitest";
import { STRESS_RESULTS, STRESS_TABLES, STRESS_TRIGGERS } from "../src/content/stress";

describe("stress effect tables", () => {
	it("keeps the document's d20 shape for both lists", () => {
		expect(STRESS_TRIGGERS.rows).toHaveLength(20);
		expect(STRESS_RESULTS.rows).toHaveLength(20);
		for (const row of [...STRESS_TRIGGERS.rows, ...STRESS_RESULTS.rows]) {
			expect(row.text.length).toBeGreaterThan(0);
			expect(row.weight).toBeUndefined();
		}
	});

	it("uses stable, prefixed ids and stress framing in the names", () => {
		for (const table of STRESS_TABLES) {
			expect(table.id.startsWith("stress-")).toBe(true);
			expect(table.name.startsWith("Stress —")).toBe(true);
			expect(table.source).toBe("core");
		}
	});
});
