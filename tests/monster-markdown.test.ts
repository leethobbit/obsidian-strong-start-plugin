import { describe, expect, it } from "vitest";
import { replaceSection, sectionContent } from "../src/lib/sections";
import { baselineBuildFor, deriveMonster } from "../src/dnd5e/monster-build";
import {
	MONSTER_NOTES_HEADING,
	MONSTER_STAT_BLOCK_HEADING,
	monsterStatBlockMarkdown,
	seededMonsterBody,
} from "../src/dnd5e/monster-markdown";

function cr5Derived(extra: Partial<Parameters<typeof deriveMonster>[0]> = {}) {
	const base = baselineBuildFor(5);
	if (!base) throw new Error("missing CR 5");
	return deriveMonster({ ...base, flavor: "Large fiend", damageTypes: "slashing", ...extra });
}

describe("monsterStatBlockMarkdown", () => {
	it("renders the core lines", () => {
		const markdown = monsterStatBlockMarkdown(cr5Derived());
		expect(markdown).toContain("*Large fiend*");
		expect(markdown).toContain("**Armor Class** 15 · **Hit Points** 95 (range 71–119) · **CR** 5");
		expect(markdown).toContain("**Attacks** 3 attacks, +7 to hit, 12 (3d6 + 2) slashing damage each — 36 damage per round");
		expect(markdown).toContain("**Save DC** 15");
	});

	it("renders proficient abilities and feature paragraphs with resolved damage", () => {
		const markdown = monsterStatBlockMarkdown(
			cr5Derived({ abilities: ["str", "con"], features: ["damaging-burst", "misty-step"] })
		);
		expect(markdown).toContain("**Proficient** Strength, Constitution +7");
		expect(markdown).toContain("***Damaging Burst.***");
		expect(markdown).toContain("About 18 damage.");
		expect(markdown).toContain("***Misty Step.***");
	});

	it("flags the all-features-no-attacks edge", () => {
		const markdown = monsterStatBlockMarkdown(
			cr5Derived({ attacks: 1, features: ["damaging-aura", "damage-reflection"] })
		);
		expect(markdown).toContain("**Attacks** none");
	});
});

describe("seededMonsterBody", () => {
	it("seeds both managed headings with the rendered block", () => {
		const body = seededMonsterBody(cr5Derived());
		expect(sectionContent(body, MONSTER_STAT_BLOCK_HEADING)).toContain("**Armor Class** 15");
		expect(sectionContent(body, MONSTER_NOTES_HEADING)).toBe("");
	});

	it("uses a preset's verbatim block when provided", () => {
		const body = seededMonsterBody(cr5Derived(), "**Armor Class** 11\n**Hit Points** 9 (2d8)");
		expect(sectionContent(body, MONSTER_STAT_BLOCK_HEADING)).toContain("9 (2d8)");
	});

	it("survives a Refresh-stat-block round-trip without touching notes", () => {
		const body = seededMonsterBody(cr5Derived()) + "user prose after seed\n";
		const withNotes = replaceSection(body, MONSTER_NOTES_HEADING, "My custom lore.");
		const refreshed = replaceSection(
			withNotes,
			MONSTER_STAT_BLOCK_HEADING,
			monsterStatBlockMarkdown(cr5Derived({ ac: 17 }))
		);
		expect(sectionContent(refreshed, MONSTER_STAT_BLOCK_HEADING)).toContain("**Armor Class** 17");
		expect(sectionContent(refreshed, MONSTER_NOTES_HEADING)).toBe("My custom lore.");
	});
});
