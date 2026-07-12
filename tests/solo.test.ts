import { describe, expect, it } from "vitest";
import { SOLO_CHAMBER_EVENTS, SOLO_MONUMENT_EFFECTS, SOLO_TABLES, SOLO_TREASURES } from "../src/content/solo";

describe("Lazy Solo 5e tables", () => {
	it("preserves the document's die weights (d10 / d6 / d8)", () => {
		const totalWeight = (rows: { weight?: number }[]) => rows.reduce((sum, r) => sum + (r.weight ?? 1), 0);
		expect(totalWeight(SOLO_CHAMBER_EVENTS.rows)).toBe(10);
		expect(totalWeight(SOLO_MONUMENT_EFFECTS.rows)).toBe(6);
		expect(totalWeight(SOLO_TREASURES.rows)).toBe(8);
	});

	it("keeps the 4-in-10 quest-progress odds of the chamber events table", () => {
		const qpWeight = SOLO_CHAMBER_EVENTS.rows
			.filter((r) => r.text.includes("quest progress"))
			.reduce((sum, r) => sum + (r.weight ?? 1), 0);
		expect(qpWeight).toBe(4);
	});

	it("uses stable, prefixed ids", () => {
		for (const table of SOLO_TABLES) {
			expect(table.id.startsWith("solo-")).toBe(true);
			expect(table.source).toBe("core");
		}
	});
});
