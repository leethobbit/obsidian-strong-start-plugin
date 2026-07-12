import { describe, expect, it } from "vitest";
import { buildRegistry } from "../src/tables/registry";
import type { RollTable } from "../src/tables/types";

function table(id: string, name: string, source: "core" | "user" = "core"): RollTable {
	return { id, name, category: "plots", source, rows: [{ text: "row" }] };
}

describe("buildRegistry", () => {
	it("looks up core tables by id", () => {
		const registry = buildRegistry([table("a", "Table A")]);
		expect(registry.get("a")?.name).toBe("Table A");
		expect(registry.get("missing")).toBeUndefined();
	});

	it("lists every table via all()", () => {
		const registry = buildRegistry([table("a", "Table A"), table("b", "Table B")]);
		expect(registry.all().map((t) => t.id).sort()).toEqual(["a", "b"]);
	});

	it("a user table shadows a core table of the same id", () => {
		const registry = buildRegistry([table("a", "Core A")], [table("a", "User A", "user")]);
		const found = registry.get("a");
		expect(found?.name).toBe("User A");
		expect(found?.source).toBe("user");
		expect(registry.all()).toHaveLength(1);
	});

	it("a user table with a new id is added alongside core tables", () => {
		const registry = buildRegistry([table("a", "Core A")], [table("b", "User B", "user")]);
		expect(registry.all().map((t) => t.id).sort()).toEqual(["a", "b"]);
	});

	it("defaults to no user tables", () => {
		const registry = buildRegistry([table("a", "Core A")]);
		expect(registry.all()).toHaveLength(1);
	});

	it("a user table restores the built-in once it's dropped from a later rebuild (M5 invalidation)", () => {
		// Simulates `TableStore`/`refreshRegistry()`: the same core list, rebuilt
		// once with the shadowing user table present and once after it's gone
		// (deleted/renamed away from the shared id).
		const core = [table("a", "Core A")];
		const shadowed = buildRegistry(core, [table("a", "User A", "user")]);
		expect(shadowed.get("a")?.source).toBe("user");

		const restored = buildRegistry(core, []);
		expect(restored.get("a")).toEqual({ id: "a", name: "Core A", category: "plots", source: "core", rows: [{ text: "row" }] });
	});
});
