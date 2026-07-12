import { describe, expect, it } from "vitest";
import { readTableFm, writeTableFm } from "../src/tables/table-schema";

describe("table codec", () => {
	it("reads an explicit tableId", () => {
		expect(readTableFm({ type: "table", tableId: "rumors-at-the-inn" })).toEqual({
			tableId: "rumors-at-the-inn",
		});
	});

	it("omits tableId when absent — the caller defaults it to the filename slug", () => {
		expect(readTableFm({ type: "table" })).toEqual({ tableId: undefined });
	});

	it("returns null for a non-object", () => {
		expect(readTableFm(null)).toBeNull();
		expect(readTableFm("nope")).toBeNull();
	});

	it("writes the canonical shape", () => {
		expect(writeTableFm({ tableId: "rumors-at-the-inn" })).toEqual({ type: "table", tableId: "rumors-at-the-inn" });
		expect(writeTableFm({})).toEqual({ type: "table", tableId: "" });
	});
});
