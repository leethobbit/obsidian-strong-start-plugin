import { describe, expect, it } from "vitest";
import { pruneEmpty } from "../src/lib/frontmatter";
import { readSessionFm, writeSessionFm, type SessionFm } from "../src/sessions/session-schema";
import { readSessionZeroFm, writeSessionZeroFm, type SessionZeroFm } from "../src/checklist/session-zero-schema";
import { readCampaignFm, writeCampaignFm, type CampaignFm } from "../src/campaigns/campaign-schema";
import { readMonsterFm, writeMonsterFm, type MonsterFm } from "../src/dnd5e/monster-schema";
import {
	readLocationFm,
	readNpcFm,
	readPcFm,
	readQuestFm,
	writeLocationFm,
	writeNpcFm,
	writePcFm,
	writeQuestFm,
	type LocationFm,
	type NpcFm,
	type PcFm,
	type QuestFm,
} from "../src/roster/entity-schema";
import { readTableFm, writeTableFm, type TableFm } from "../src/tables/table-schema";

/**
 * `read(prune(write(model)))` round-trip, per codec — the shape a note
 * actually sees: `write*Fm` builds the canonical payload, `pruneEmpty` is
 * what `writeLazyFrontmatter` runs before assigning `lazyCampaign`, and
 * `read*Fm` is what the next open/reload sees. Covers representative
 * (fully populated) and edge (empty strings/false flags/empty arrays, plus
 * the M3 archived-secret-with-empty-text tombstone) models for every codec
 * that has both a reader and a writer.
 */
describe("codec write -> prune -> read round trips", () => {
	describe("session", () => {
		const roundTrip = (model: SessionFm) => readSessionFm(pruneEmpty(writeSessionFm(model)));

		it("representative model", () => {
			const model: SessionFm = {
				campaign: "[[Greenhollow]]",
				session: 4,
				date: "2026-07-18",
				status: "played",
				stepsDone: ["characters", "strong-start"],
				secrets: [
					{ id: "s-1", text: "The mayor is a doppelganger.", revealed: true, note: "Kara recognized the ring" },
					{ id: "s-2", text: "The mill hides a shrine to Zargon.", archived: true },
				],
				npcs: ["[[Mayor Elba]]", "Krek the ferryman"],
				locations: ["[[The Sunken Mill]]"],
				monsters: ["4 x goblin", "[[Grib the Ogre]]"],
			};
			expect(roundTrip(model)).toEqual(model);
		});

		it("edge model: empty strings/arrays, absent date, default status", () => {
			const model: SessionFm = {
				campaign: "[[X]]",
				session: 1,
				date: undefined,
				status: "prep",
				stepsDone: [],
				secrets: [],
				npcs: [],
				locations: [],
				monsters: [],
			};
			expect(roundTrip(model)).toEqual(model);
		});

		it("M3 regression: an archived secret with empty text survives with its flags intact", () => {
			const model: SessionFm = {
				campaign: "[[X]]",
				session: 1,
				date: undefined,
				status: "prep",
				stepsDone: [],
				secrets: [{ id: "s-x", text: "", archived: true }],
				npcs: [],
				locations: [],
				monsters: [],
			};
			expect(roundTrip(model)).toEqual(model);
		});
	});

	describe("session-zero", () => {
		const roundTrip = (model: SessionZeroFm) => readSessionZeroFm(pruneEmpty(writeSessionZeroFm(model)));

		it("representative model", () => {
			const model: SessionZeroFm = {
				campaign: "[[Greenhollow]]",
				done: ["one-page-guide", "safety-discussion"],
				lines: ["harm to children"],
				veils: ["torture"],
			};
			expect(roundTrip(model)).toEqual(model);
		});

		it("edge model: all lists empty", () => {
			const model: SessionZeroFm = { campaign: "[[X]]", done: [], lines: [], veils: [] };
			expect(roundTrip(model)).toEqual(model);
		});
	});

	describe("campaign", () => {
		const roundTrip = (model: CampaignFm) => readCampaignFm(pruneEmpty(writeCampaignFm(model)));

		it("representative model", () => {
			const model: CampaignFm = { id: "c-1", system: "5e", status: "archived" };
			expect(roundTrip(model)).toEqual(model);
		});

		it("edge model: no system, default (active) status", () => {
			const model: CampaignFm = { id: "c-1", system: undefined, status: "active" };
			expect(roundTrip(model)).toEqual(model);
		});
	});

	describe("monster", () => {
		const roundTrip = (model: MonsterFm) => readMonsterFm(pruneEmpty(writeMonsterFm(model)));

		it("representative model", () => {
			const model: MonsterFm = {
				campaign: "[[Greenhollow]]",
				cr: 5,
				role: "bruiser",
				flavor: "Large fiend",
				ac: 16,
				dc: 15,
				hp: 95,
				profBonus: 7,
				attacks: 3,
				damagePerAttack: 12,
				damageDice: "3d6 + 2",
				damageTypes: "slashing",
				abilities: ["str", "con"],
				features: ["knockdown", "damaging-aura"],
				template: "brute",
			};
			expect(roundTrip(model)).toEqual(model);
		});

		it("edge model: CR 0, empty abilities/features, no optionals", () => {
			const model: MonsterFm = {
				campaign: "[[Greenhollow]]",
				cr: 0,
				ac: 10,
				dc: 10,
				hp: 3,
				profBonus: 2,
				attacks: 1,
				damagePerAttack: 2,
				abilities: [],
				features: [],
			};
			expect(roundTrip(model)).toEqual(model);
		});
	});

	describe("pc", () => {
		const roundTrip = (model: PcFm) => readPcFm(pruneEmpty(writePcFm(model)));

		it("representative model", () => {
			const model: PcFm = { campaign: "[[Greenhollow]]", player: "Sarah", role: "wizard", level: 4 };
			expect(roundTrip(model)).toEqual(model);
		});

		it("edge model: no player/role/level", () => {
			const model: PcFm = { campaign: "[[Greenhollow]]", player: undefined, role: undefined, level: undefined };
			expect(roundTrip(model)).toEqual(model);
		});
	});

	describe("npc", () => {
		const roundTrip = (model: NpcFm) => readNpcFm(pruneEmpty(writeNpcFm(model)));

		it("representative model", () => {
			const model: NpcFm = { campaign: "[[Greenhollow]]", role: "fence", location: "[[The Docks]]", status: "dead" };
			expect(roundTrip(model)).toEqual(model);
		});

		it("edge model: default (alive) status, no role/location", () => {
			const model: NpcFm = { campaign: "[[Greenhollow]]", role: undefined, location: undefined, status: "alive" };
			expect(roundTrip(model)).toEqual(model);
		});
	});

	describe("quest", () => {
		const roundTrip = (model: QuestFm) => readQuestFm(pruneEmpty(writeQuestFm(model)));

		it("representative model", () => {
			expect(roundTrip({ campaign: "[[Greenhollow]]", status: "done" })).toEqual({
				campaign: "[[Greenhollow]]",
				status: "done",
			});
		});

		it("edge model: default (open) status", () => {
			expect(roundTrip({ campaign: "[[Greenhollow]]", status: "open" })).toEqual({
				campaign: "[[Greenhollow]]",
				status: "open",
			});
		});
	});

	describe("location", () => {
		const roundTrip = (model: LocationFm) => readLocationFm(pruneEmpty(writeLocationFm(model)));

		it("minimal model (the only shape this codec has)", () => {
			expect(roundTrip({ campaign: "[[Greenhollow]]" })).toEqual({ campaign: "[[Greenhollow]]" });
		});
	});

	describe("table", () => {
		const roundTrip = (model: TableFm) => readTableFm(pruneEmpty(writeTableFm(model)));

		it("explicit tableId", () => {
			expect(roundTrip({ tableId: "rumors-at-the-inn" })).toEqual({ tableId: "rumors-at-the-inn" });
		});

		it("edge model: no tableId", () => {
			expect(roundTrip({ tableId: undefined })).toEqual({ tableId: undefined });
		});
	});
});
