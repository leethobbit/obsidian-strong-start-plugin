import { Component, TFile, type App } from "obsidian";
import { asLazy } from "../lib/frontmatter";
import { readCampaignFm } from "./campaign-schema";
import { readSessionFm } from "../sessions/session-schema";
import { readLocationFm, readNpcFm, readPcFm, readQuestFm } from "../roster/entity-schema";
import { readSessionZeroFm } from "../checklist/session-zero-schema";
import { readMonsterFm, type MonsterNoteModel } from "../dnd5e/monster-schema";
import type { CampaignModel } from "./types";
import type { SessionModel } from "../sessions/types";
import type { SessionZeroModel } from "../checklist/types";
import type { LocationNoteModel, NpcNoteModel, PcModel, QuestNoteModel } from "../roster/types";

type ManagedType = "campaign" | "session" | "session-zero" | "pc" | "npc" | "location" | "quest" | "monster" | "table";

interface IndexedNote {
	path: string;
	file: TFile;
	type: ManagedType;
	fm: Record<string, unknown>;
}

type Subscriber = (changedPaths: Set<string>) => void;

/**
 * The observable index of every note carrying a `lazyCampaign` frontmatter
 * key. Discovery is a `metadataCache` scan — never a folder walk.
 *
 * Constructed and `addChild`-ed by the plugin inside `onLayoutReady`, never in
 * `onload`: the initial scan needs `metadataCache` warm (AGENTS.md gotcha:
 * "metadataCache timing at startup").
 */
export class CampaignStore extends Component {
	private readonly app: App;
	private readonly index = new Map<string, IndexedNote>();
	private readonly subscribers = new Set<Subscriber>();
	private initialResolveScanDone = false;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		this.scanAll();

		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				// The startup resolution pass can complete after this component
				// loaded, so one follow-up full rescan catches anything that
				// wasn't cached yet at `onload`. Later "resolved" firings (big
				// pastes, sync merges) are already covered file-by-file by the
				// "changed" listener below — skipping the O(vault) rescan there
				// keeps large vaults jank-free.
				if (!this.initialResolveScanDone) {
					this.initialResolveScanDone = true;
					this.scanAll();
				}
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				// Body-only edits matter too: prose is half the datastore
				// (scenes, fronts, session notes), so any change to a note
				// that is — or just stopped being — managed notifies.
				// Subscribers already debounce rebuilds and use the
				// self-write registry to skip their own echoes.
				const wasManaged = this.index.has(file.path);
				const fmChanged = this.indexFile(file);
				if (fmChanged || wasManaged) this.notify(new Set([file.path]));
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				const hadOld = this.index.delete(oldPath);
				const isManaged = this.indexFile(file);
				if (hadOld || isManaged) this.notify(new Set([oldPath, file.path]));
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (!(file instanceof TFile)) return;
				if (this.index.delete(file.path)) this.notify(new Set([file.path]));
			})
		);
	}

	private scanAll(): void {
		const changed = new Set<string>();
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (this.indexFile(file)) changed.add(file.path);
		}
		if (changed.size > 0) this.notify(changed);
	}

	/** Re-reads one file's cache into the index. Returns true if the file's
	 * managed state actually changed (became managed, stopped being managed,
	 * or its `lazyCampaign` object changed) — callers use this to decide
	 * whether a notify is warranted. */
	private indexFile(file: TFile): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		const lazy = asLazy(cache?.frontmatter);
		const type = typeof lazy?.type === "string" ? (lazy.type as ManagedType) : null;

		if (!type || !lazy) {
			return this.index.delete(file.path);
		}

		const previous = this.index.get(file.path);
		const next: IndexedNote = { path: file.path, file, type, fm: lazy };
		const changed = !previous || previous.type !== next.type || !fmEquals(previous.fm, next.fm);
		this.index.set(file.path, next);
		return changed;
	}

	subscribe(cb: Subscriber): () => void {
		this.subscribers.add(cb);
		return () => {
			this.subscribers.delete(cb);
		};
	}

	private notify(changedPaths: Set<string>): void {
		for (const cb of this.subscribers) cb(changedPaths);
	}

	campaigns(): CampaignModel[] {
		const models: CampaignModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "campaign") continue;
			const fm = readCampaignFm(note.fm);
			if (!fm) continue;
			models.push({
				id: fm.id,
				name: note.file.basename,
				path: note.path,
				system: fm.system,
				status: fm.status,
			});
		}
		return models.sort((a, b) => a.name.localeCompare(b.name));
	}

	campaignById(id: string): CampaignModel | null {
		return this.campaigns().find((c) => c.id === id) ?? null;
	}

	/** Sessions belonging to the campaign note at `campaignPath`, newest first. */
	sessionsOf(campaignPath: string): SessionModel[] {
		const models: SessionModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "session") continue;
			const link = typeof note.fm.campaign === "string" ? note.fm.campaign : null;
			if (!link) continue;
			const dest = this.resolveWikilink(link, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			const fm = readSessionFm(note.fm);
			if (!fm) continue;
			models.push({ ...fm, path: note.path });
		}
		return models.sort((a, b) => b.session - a.session);
	}

	/** PC notes (`type: pc`) belonging to `campaignPath`, name-sorted — the
	 * Characters step's roster (prep board step 1). */
	pcsOf(campaignPath: string): PcModel[] {
		const models: PcModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "pc") continue;
			const fm = readPcFm(note.fm);
			if (!fm) continue;
			const dest = this.resolveWikilink(fm.campaign, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			models.push({
				path: note.path,
				name: note.file.basename,
				campaign: fm.campaign,
				player: fm.player,
				role: fm.role,
				level: fm.level,
			});
		}
		return models.sort((a, b) => a.name.localeCompare(b.name));
	}

	/** NPC notes (`type: npc`) belonging to `campaignPath` — the NPCs step's
	 * typeahead suggestion source. */
	npcNotesOf(campaignPath: string): NpcNoteModel[] {
		const models: NpcNoteModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "npc") continue;
			const fm = readNpcFm(note.fm);
			if (!fm) continue;
			const dest = this.resolveWikilink(fm.campaign, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			models.push({
				path: note.path,
				name: note.file.basename,
				campaign: fm.campaign,
				role: fm.role,
				location: fm.location,
				status: fm.status,
			});
		}
		return models.sort((a, b) => a.name.localeCompare(b.name));
	}

	/** Location notes (`type: location`) belonging to `campaignPath` — the
	 * Locations step's typeahead suggestion source. */
	locationNotesOf(campaignPath: string): LocationNoteModel[] {
		const models: LocationNoteModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "location") continue;
			const fm = readLocationFm(note.fm);
			if (!fm) continue;
			const dest = this.resolveWikilink(fm.campaign, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			models.push({ path: note.path, name: note.file.basename, campaign: fm.campaign });
		}
		return models.sort((a, b) => a.name.localeCompare(b.name));
	}

	/** Quest notes (`type: quest`) belonging to `campaignPath` — the Home /
	 * World panel's quest group (M17). Open quests sort before done ones,
	 * name-sorted within each. */
	questsOf(campaignPath: string): QuestNoteModel[] {
		const models: QuestNoteModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "quest") continue;
			const fm = readQuestFm(note.fm);
			if (!fm) continue;
			const dest = this.resolveWikilink(fm.campaign, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			models.push({ path: note.path, name: note.file.basename, campaign: fm.campaign, status: fm.status });
		}
		return models.sort((a, b) =>
			a.status === b.status ? a.name.localeCompare(b.name) : a.status === "open" ? -1 : 1
		);
	}

	/** Monster notes (`type: monster`) belonging to `campaignPath` — the Home /
	 * World panel's monster group and the prep Monsters step (M18, 5e module).
	 * Sorted by CR ascending, then name. */
	monstersOf(campaignPath: string): MonsterNoteModel[] {
		const models: MonsterNoteModel[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "monster") continue;
			const fm = readMonsterFm(note.fm);
			if (!fm) continue;
			const dest = this.resolveWikilink(fm.campaign, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			models.push({ ...fm, path: note.path, name: note.file.basename });
		}
		return models.sort((a, b) => (a.cr === b.cr ? a.name.localeCompare(b.name) : a.cr - b.cr));
	}

	/** The campaign's session-zero note (`type: session-zero`), if one exists —
	 * SCHEMA.md: one per campaign. Read by run mode's safety card (M6,
	 * `lines`/`veils` only) and the Home / Session zero panel (M9, the full
	 * model including `done` + `path` for `patchSessionZero`). */
	sessionZeroOf(campaignPath: string): SessionZeroModel | null {
		for (const note of this.index.values()) {
			if (note.type !== "session-zero") continue;
			const fm = readSessionZeroFm(note.fm);
			if (!fm) continue;
			const dest = this.resolveWikilink(fm.campaign, note.path);
			if (!dest || dest.path !== campaignPath) continue;
			return { ...fm, path: note.path };
		}
		return null;
	}

	/** Table notes (`type: table`) anywhere in the vault — tables are
	 * vault-global, not scoped to a campaign (AGENTS.md, SCHEMA.md). Consumed
	 * by `tables/table-store.ts` to build the user-table half of the rolling
	 * registry. */
	tableNotes(): { path: string; file: TFile; fm: Record<string, unknown> }[] {
		const models: { path: string; file: TFile; fm: Record<string, unknown> }[] = [];
		for (const note of this.index.values()) {
			if (note.type !== "table") continue;
			models.push({ path: note.path, file: note.file, fm: note.fm });
		}
		return models;
	}

	private resolveWikilink(raw: string, sourcePath: string): TFile | null {
		const match = /^\[\[([^\]|]+)/.exec(raw.trim());
		const linkpath = match ? match[1] : raw.trim();
		return this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
	}
}

function fmEquals(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
