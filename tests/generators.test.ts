import { describe, expect, it } from "vitest";
import { createRng } from "../src/lib/rng";
import { buildRegistry } from "../src/tables/registry";
import { CORE_TABLES } from "../src/content";
import { GENERATORS } from "../src/generators";
import { renderMarkdown, renderBullets, oneLiner } from "../src/generators/types";

const registry = buildRegistry(CORE_TABLES);

describe("GENERATORS", () => {
	it("has one entry per docs/plan.md generator (NPC, Treasure, Quest, Trap, Monument)", () => {
		expect(GENERATORS.map((g) => g.id)).toEqual(["npc", "treasure", "quest", "trap", "monument"]);
	});

	for (const generator of GENERATORS) {
		describe(generator.id, () => {
			it("is deterministic under a seeded rng", () => {
				const a = generator.run(registry, createRng(1234));
				const b = generator.run(registry, createRng(1234));
				expect(a).toEqual(b);
			});

			it("produces at least one line, each with non-empty text", () => {
				const result = generator.run(registry, createRng(1));
				expect(result.lines.length).toBeGreaterThan(0);
				for (const line of result.lines) {
					expect(line.label.length).toBeGreaterThan(0);
					expect(line.text.length).toBeGreaterThan(0);
				}
			});

			it("every line's tableId (when present) resolves in the registry", () => {
				const result = generator.run(registry, createRng(7));
				for (const line of result.lines) {
					if (line.tableId === undefined) continue;
					expect(registry.get(line.tableId), `"${line.tableId}" doesn't resolve`).toBeDefined();
				}
			});

			it("renderMarkdown starts with a bold title line followed by one bullet per line", () => {
				const result = generator.run(registry, createRng(99));
				const markdown = renderMarkdown(result);
				const rendered = markdown.split("\n");
				expect(rendered[0]).toBe(`**${result.title}**`);
				expect(rendered.length).toBe(result.lines.length + 1);
				for (let i = 0; i < result.lines.length; i++) {
					expect(rendered[i + 1]).toBe(`- **${result.lines[i].label}:** ${result.lines[i].text}`);
				}
			});

			it("renderBullets omits the title line", () => {
				const result = generator.run(registry, createRng(2));
				expect(renderBullets(result)).toHaveLength(result.lines.length);
			});

			it("oneLiner joins every line's text with an em dash", () => {
				const result = generator.run(registry, createRng(3));
				expect(oneLiner(result)).toBe(result.lines.map((l) => l.text).join(" — "));
			});
		});
	}
});
