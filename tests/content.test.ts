import { describe, expect, it } from "vitest";
import { CORE_TABLES } from "../src/content";
import { parseDice } from "../src/tables/dice";
import { STRONG_START_TABLES } from "../src/content/strong-starts";
import { SECRETS_CLUES_TABLES } from "../src/content/secrets-clues";
import { NPC_FIRST_NAMES, NPC_LAST_NAMES, NPC_FULL_NAME } from "../src/content/npc-names";
import {
	CAMPAIGN_PITCHES,
	CAMPAIGN_STARTING_LOCATIONS,
	CAMPAIGN_FRONTS,
	CAMPAIGN_LOCAL_LOCATIONS,
	CAMPAIGN_TRUTHS_SEED,
} from "../src/content/campaign";

const PLACEHOLDER_RE = /\{\{([^{}]*)\}\}/g;

describe("CORE_TABLES", () => {
	it("has no duplicate table ids", () => {
		const ids = CORE_TABLES.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("every table has at least one row", () => {
		for (const table of CORE_TABLES) {
			expect(table.rows.length, `table "${table.id}" has no rows`).toBeGreaterThan(0);
		}
	});

	it("every row has non-empty text", () => {
		for (const table of CORE_TABLES) {
			for (const row of table.rows) {
				expect(row.text.trim().length, `an empty row in "${table.id}"`).toBeGreaterThan(0);
			}
		}
	});

	it("every {{...}} placeholder is either valid dice or a known core table id (guards transcription typos)", () => {
		const knownIds = new Set(CORE_TABLES.map((t) => t.id));
		for (const table of CORE_TABLES) {
			for (const row of table.rows) {
				for (const match of row.text.matchAll(PLACEHOLDER_RE)) {
					const token = match[1].trim();
					const isDice = parseDice(token) !== null;
					const isKnownTable = knownIds.has(token);
					expect(
						isDice || isKnownTable,
						`"${table.id}" references unresolvable placeholder {{${token}}}`
					).toBe(true);
				}
			}
		}
	});
});

describe("strong starts (verbatim transcription counts)", () => {
	it("has all four environments, 10 entries each", () => {
		expect(STRONG_START_TABLES).toHaveLength(4);
		for (const table of STRONG_START_TABLES) {
			expect(table.rows, table.id).toHaveLength(10);
		}
	});
});

describe("secrets & clues (verbatim transcription counts)", () => {
	it("has all four categories, 10 prompts each", () => {
		expect(SECRETS_CLUES_TABLES).toHaveLength(4);
		for (const table of SECRETS_CLUES_TABLES) {
			expect(table.rows, table.id).toHaveLength(10);
		}
	});
});

describe("npc names (verbatim transcription counts)", () => {
	it("has 100 first names and 40 last names", () => {
		expect(NPC_FIRST_NAMES.rows).toHaveLength(100);
		expect(NPC_LAST_NAMES.rows).toHaveLength(40);
	});

	it("the composite npc-names table references both lists via templates", () => {
		expect(NPC_FULL_NAME.rows).toHaveLength(1);
		expect(NPC_FULL_NAME.rows[0].text).toBe("{{npc-first-names}} {{npc-last-names}}");
	});
});

describe("campaign content (verbatim transcription counts)", () => {
	it("has 20 campaign pitches", () => {
		expect(CAMPAIGN_PITCHES.rows).toHaveLength(20);
	});

	it("has 10 starting locations", () => {
		expect(CAMPAIGN_STARTING_LOCATIONS.rows).toHaveLength(10);
	});

	it("has 20 campaign fronts", () => {
		expect(CAMPAIGN_FRONTS.rows).toHaveLength(20);
	});

	it("has 20 local adventure locations", () => {
		expect(CAMPAIGN_LOCAL_LOCATIONS.rows).toHaveLength(20);
	});

	it("the six-truths seed table is a composition (not verbatim doc content) but still references only known ids", () => {
		expect(CAMPAIGN_TRUTHS_SEED.rows.length).toBeGreaterThan(0);
		for (const row of CAMPAIGN_TRUTHS_SEED.rows) {
			expect(row.text).toMatch(/\{\{.+\}\}/);
		}
	});
});
