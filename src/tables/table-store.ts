import { Component, type App } from "obsidian";
import { stripFrontmatter } from "../lib/body-split";
import { slugify } from "../lib/slug";
import { parseUserTableBody } from "./parse-user-table";
import { readTableFm } from "./table-schema";
import type { CampaignStore } from "../campaigns/campaign-store";
import type { RollTable } from "./types";

interface CacheEntry {
	mtime: number;
	table: RollTable;
}

/**
 * Builds the user half of the rolling registry from the campaign store's
 * indexed `type: table` notes (AGENTS.md "User tables shadow core tables by
 * id — that IS the customization mechanism"). Table bodies are read with
 * `vault.cachedRead` (async) and parsed with `parse-user-table.ts`; parses
 * are cached by path + mtime so a `metadataCache` notification that didn't
 * touch a table note's body (or touched an unrelated note) never re-reads
 * anything. `ensureFresh()` is the only place that actually reparses.
 *
 * Constructed and `addChild`-ed by the plugin alongside `CampaignStore`
 * inside `onLayoutReady`. The plugin calls `ensureFresh()` once up front (the
 * campaign store's own initial scan already ran by then, so its `subscribe`
 * callback here would otherwise miss it) and again on every campaign-store
 * notification; `setOnRefresh` is how it learns a reparse actually changed
 * something and should rebuild `plugin.tables`.
 */
export class TableStore extends Component {
	private readonly cache = new Map<string, CacheEntry>();
	private onRefresh: (() => void) | null = null;
	/** In-flight `refreshNow()` — see `ensureFresh` for the coalescing rule. */
	private inflight: Promise<boolean> | null = null;
	private rerunRequested = false;

	constructor(
		private readonly app: App,
		private readonly campaignStore: CampaignStore
	) {
		super();
	}

	onload(): void {
		this.register(
			this.campaignStore.subscribe(() => {
				void this.ensureFresh();
			})
		);
	}

	/** Fires after a `ensureFresh()` call whose result actually changed the
	 * `userTables()` set (added/removed/edited) — never on a no-op reparse. */
	setOnRefresh(cb: () => void): void {
		this.onRefresh = cb;
	}

	userTables(): RollTable[] {
		return [...this.cache.values()].map((entry) => entry.table);
	}

	/** Re-read every currently-indexed table note whose mtime moved since the
	 * last read (or that's new), and drop anything no longer indexed. Returns
	 * true if the resulting `userTables()` set changed at all.
	 *
	 * Coalesced: the scan awaits `cachedRead` per note, so two overlapping
	 * runs could interleave (run A re-inserting a cache entry for a path run
	 * B just deleted — a removed table briefly resurrecting). A call that
	 * lands mid-scan queues exactly one re-run after the current one settles
	 * instead of racing it. */
	async ensureFresh(): Promise<boolean> {
		if (this.inflight) {
			this.rerunRequested = true;
			return this.inflight;
		}
		this.inflight = this.refreshNow().finally(() => {
			this.inflight = null;
			if (this.rerunRequested) {
				this.rerunRequested = false;
				void this.ensureFresh();
			}
		});
		return this.inflight;
	}

	private async refreshNow(): Promise<boolean> {
		const notes = this.campaignStore.tableNotes();
		const seenPaths = new Set<string>();
		let changed = false;

		for (const note of notes) {
			seenPaths.add(note.path);
			const mtime = note.file.stat.mtime;
			const cached = this.cache.get(note.path);
			if (cached && cached.mtime === mtime) continue;

			const raw = await this.app.vault.cachedRead(note.file);
			const rows = parseUserTableBody(stripFrontmatter(raw));
			const fm = readTableFm(note.fm);
			const id = fm?.tableId ?? slugify(note.file.basename);

			const table: RollTable = {
				id,
				name: note.file.basename,
				source: "user",
				rows,
				path: note.path,
			};
			this.cache.set(note.path, { mtime, table });
			changed = true;
		}

		for (const path of [...this.cache.keys()]) {
			if (!seenPaths.has(path)) {
				this.cache.delete(path);
				changed = true;
			}
		}

		if (changed) this.onRefresh?.();
		return changed;
	}
}
