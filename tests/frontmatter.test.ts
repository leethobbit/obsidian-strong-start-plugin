import { describe, expect, it } from "vitest";
import { applyLazyWrite, mergeUnknownKeys, pruneEmpty } from "../src/lib/frontmatter";

// pruneEmpty is the pure heart of "cleared = deleted" (SCHEMA.md) — the only
// piece of lib/frontmatter.ts that doesn't need a live App, so it gets its own
// vitest case even though the file also has an `obsidian`-typed helper.
describe("pruneEmpty", () => {
	it("strips false booleans, empty strings, empty arrays and empty objects", () => {
		expect(
			pruneEmpty({
				id: "c-1",
				status: false,
				system: "",
				stepsDone: [],
				secrets: [],
				nested: {},
			})
		).toEqual({ id: "c-1" });
	});

	it("keeps zero and non-empty values", () => {
		expect(pruneEmpty({ session: 0, name: "Greenhollow" })).toEqual({ session: 0, name: "Greenhollow" });
	});

	it("recurses into arrays of objects, pruning each element", () => {
		expect(
			pruneEmpty({
				secrets: [
					{ id: "s-1", text: "hi", revealed: false, note: "" },
					{ id: "s-2", text: "bye", revealed: true },
				],
			})
		).toEqual({
			secrets: [
				{ id: "s-1", text: "hi" },
				{ id: "s-2", text: "bye", revealed: true },
			],
		});
	});

	it("never drops an id-bearing row down to nothing: id alone survives as a non-empty object", () => {
		// A tombstone whose only other truthy field is `archived` still keeps
		// both keys — pruneEmpty only removes an object entirely when EVERY
		// leaf, including `id`, is falsey, which the id format (SCHEMA.md:
		// short random base36, always non-empty) never produces in practice.
		expect(pruneEmpty({ id: "s-x", text: "", revealed: false, note: "", archived: true })).toEqual({
			id: "s-x",
			archived: true,
		});
	});
});

// M2 — unknown-key passthrough: a sibling key under `lazyCampaign` that the
// writing codec doesn't own (e.g. written by a newer plugin version) must
// survive a write from an older codec (SCHEMA.md 1.0 is additive-only).
describe("mergeUnknownKeys", () => {
	it("preserves a key the codec doesn't own", () => {
		expect(mergeUnknownKeys({ id: "c-1" }, { id: "c-1", futureField: "kept" }, new Set(["id", "status"]))).toEqual({
			id: "c-1",
			futureField: "kept",
		});
	});

	it("never resurrects a known field the write pruned away — cleared = deleted still wins for owned keys", () => {
		// `status` is owned by this write (it was in the unpruned payload) but
		// got pruned to "" -> absent. The existing note has `status: "archived"`
		// from a prior write; it must NOT survive just because it's missing
		// from `pruned`.
		expect(mergeUnknownKeys({ id: "c-1" }, { id: "c-1", status: "archived" }, new Set(["id", "status"]))).toEqual({
			id: "c-1",
		});
	});

	it("passes `pruned` through unchanged when there's no existing object (new note)", () => {
		expect(mergeUnknownKeys({ id: "c-1" }, undefined, new Set(["id"]))).toEqual({ id: "c-1" });
		expect(mergeUnknownKeys({ id: "c-1" }, null, new Set(["id"]))).toEqual({ id: "c-1" });
		expect(mergeUnknownKeys({ id: "c-1" }, "not an object", new Set(["id"]))).toEqual({ id: "c-1" });
	});
});

describe("applyLazyWrite", () => {
	it("merges an unknown sibling key into the assigned lazyCampaign object", () => {
		const frontmatter: Record<string, unknown> = {
			lazyCampaign: { type: "campaign", id: "c-1", status: "active", futureFlag: true },
		};
		applyLazyWrite(frontmatter, { type: "campaign", id: "c-1", status: "" });
		expect(frontmatter.lazyCampaign).toEqual({ type: "campaign", id: "c-1", futureFlag: true });
	});

	it("deletes lazyCampaign entirely only when both the pruned payload and unknown keys are empty", () => {
		const frontmatter: Record<string, unknown> = { lazyCampaign: { tableId: "old" } };
		applyLazyWrite(frontmatter, { tableId: "" });
		expect(frontmatter.lazyCampaign).toBeUndefined();
	});

	it("keeps lazyCampaign assigned when only an unknown key survives pruning", () => {
		const frontmatter: Record<string, unknown> = {
			lazyCampaign: { tableId: "old", futureFlag: true },
		};
		applyLazyWrite(frontmatter, { tableId: "" });
		expect(frontmatter.lazyCampaign).toEqual({ futureFlag: true });
	});
});
