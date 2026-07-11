import { describe, expect, it } from "vitest";
import { createRng } from "../src/lib/rng";
import { buildRegistry } from "../src/tables/registry";
import { rollTable } from "../src/tables/roll";
import type { RollTable } from "../src/tables/types";

function table(id: string, rows: RollTable["rows"]): RollTable {
	return { id, name: id, category: "plots", source: "core", rows };
}

describe("rollTable", () => {
	it("returns null for an unknown table id", () => {
		const registry = buildRegistry([]);
		expect(rollTable("nope", registry, createRng(1))).toBeNull();
	});

	it("returns null for a table with no rows", () => {
		const registry = buildRegistry([table("empty", [])]);
		expect(rollTable("empty", registry, createRng(1))).toBeNull();
	});

	it("picks a single-row table deterministically and traces the pick", () => {
		const registry = buildRegistry([table("one-row", [{ text: "Only option" }])]);
		const result = rollTable("one-row", registry, createRng(1));
		expect(result).toEqual({ text: "Only option", trace: [{ tableId: "one-row", result: "Only option" }] });
	});

	it("expands a dice placeholder before treating a token as a table id", () => {
		const registry = buildRegistry([table("dice-roll", [{ text: "You take {{1d1}} damage" }])]);
		const result = rollTable("dice-roll", registry, createRng(1));
		expect(result?.text).toBe("You take 1 damage");
		expect(result?.trace).toEqual([
			{ tableId: "dice-roll", result: "You take {{1d1}} damage" },
			{ dice: "1d1", result: "1" },
		]);
	});

	it("expands a nested table-id reference recursively", () => {
		const registry = buildRegistry([
			table("greeting", [{ text: "Hello, {{name}}!" }]),
			table("name", [{ text: "Bob" }]),
		]);
		const result = rollTable("greeting", registry, createRng(1));
		expect(result?.text).toBe("Hello, Bob!");
		expect(result?.trace).toEqual([
			{ tableId: "greeting", result: "Hello, {{name}}!" },
			{ tableId: "name", result: "Bob" },
		]);
	});

	it("combines dice and table-ref placeholders in one row", () => {
		const registry = buildRegistry([
			table("loot", [{ text: "{{1d1}} × {{item}}" }]),
			table("item", [{ text: "gold coin" }]),
		]);
		const result = rollTable("loot", registry, createRng(1));
		expect(result?.text).toBe("1 × gold coin");
	});

	it("leaves an unresolvable table id literal instead of throwing", () => {
		const registry = buildRegistry([table("broken", [{ text: "See {{missing-table}}." }])]);
		const result = rollTable("broken", registry, createRng(1));
		expect(result?.text).toBe("See {{missing-table}}.");
	});

	it("is cycle-safe: a self-referencing table leaves the placeholder literal", () => {
		const registry = buildRegistry([table("self-ref", [{ text: "loop: {{self-ref}}" }])]);
		const result = rollTable("self-ref", registry, createRng(1));
		expect(result).not.toBeNull();
		expect(result?.text).toBe("loop: {{self-ref}}");
	});

	it("caps recursion depth at 8 instead of infinite-looping a long reference chain", () => {
		const CHAIN_LENGTH = 12;
		const tables: RollTable[] = [];
		for (let i = 0; i < CHAIN_LENGTH; i++) {
			const next = i + 1 < CHAIN_LENGTH ? `{{chain-${i + 1}}}` : "end";
			tables.push(table(`chain-${i}`, [{ text: `link-${i} ${next}` }]));
		}
		const registry = buildRegistry(tables);

		const result = rollTable("chain-0", registry, createRng(1));
		expect(result).not.toBeNull();
		// The chain is longer than the depth cap, so somewhere down the line a
		// `{{chain-N}}` placeholder is left unresolved rather than the whole
		// chain expanding (which would also prove there's no infinite loop).
		expect(result?.text).toMatch(/\{\{chain-\d+\}\}/);
	});

	it("weighted pick distribution is sane over many seeded rolls", () => {
		const registry = buildRegistry([
			table("weighted", [
				{ text: "common", weight: 3 },
				{ text: "rare", weight: 1 },
			]),
		]);
		const rng = createRng(1234);
		let common = 0;
		let rare = 0;
		const N = 4000;
		for (let i = 0; i < N; i++) {
			const result = rollTable("weighted", registry, rng);
			if (result?.text === "common") common++;
			else if (result?.text === "rare") rare++;
		}
		expect(common + rare).toBe(N);
		// Expected ~75/25 split; generous tolerance since this is a statistical
		// check, not an exact-value one.
		expect(common / N).toBeGreaterThan(0.65);
		expect(common / N).toBeLessThan(0.85);
	});
});
