// Pure — no `obsidian` import. Lenient reader / strict writer for the custom
// table note type (SCHEMA.md "Custom table — type: table"). `tableId` is the
// only frontmatter field; when absent, callers default it to the note's
// filename slug (`table-store.ts`) rather than here, since that default
// needs the file's basename, which isn't part of the frontmatter object.

export interface TableFm {
	tableId?: string;
}

export function readTableFm(fm: unknown): TableFm | null {
	if (typeof fm !== "object" || fm === null) return null;
	const source = fm as Record<string, unknown>;
	const tableId = typeof source.tableId === "string" && source.tableId.length > 0 ? source.tableId : undefined;
	return { tableId };
}

export function writeTableFm(model: TableFm): Record<string, unknown> {
	return { type: "table", tableId: model.tableId ?? "" };
}
