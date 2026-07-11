import { describe, expect, it } from "vitest";
import { pruneEmpty } from "../src/lib/frontmatter";

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
});
