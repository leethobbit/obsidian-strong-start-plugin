import type { App } from "obsidian";
import type LazyCampaignPlugin from "../../../main";
import type { CampaignModel } from "../../campaigns/types";
import type { SessionModel } from "../../sessions/types";
import type { SessionFm } from "../../sessions/session-schema";

/**
 * Shared plumbing every step renderer (`steps/*.ts`) gets, kept small so each
 * step file stays focused on its one editor. `session`/`body` are snapshots
 * as of the last render — step renderers never mutate them in place, they
 * always go through `patchFrontmatter`/`writeSection` and keep their own
 * local row/chip state for anything that needs to redraw before the next
 * full render (see `steps/list-section-editor.ts` and `steps/chip-editor.ts`).
 */
export interface StepContext {
	app: App;
	plugin: LazyCampaignPlugin;
	campaign: CampaignModel;
	session: SessionModel;
	/** Every session belonging to `campaign` (newest first, per
	 * `CampaignStore.sessionsOf`) — the Secrets step's carry-over UI needs the
	 * full lineage, not just the open session, to tell carried ids from ones
	 * originating here and to compute carried-session counts. */
	sessions: readonly SessionModel[];
	/** The open session note's cached body text, for section-backed steps. */
	body: string;

	/** Read-modify-write the session note's frontmatter through the codec,
	 * wrapped in self-write marking + `tryFileOp`. `mutate` receives the
	 * current canonical fm shape and returns the next one. */
	patchFrontmatter: (mutate: (fm: SessionFm) => SessionFm) => Promise<void>;

	/** Write one managed body section through `sections.ts` + `vault.process`,
	 * diff-guarded and self-write-marked. Callers debounce/blur-flush their
	 * own idle timers before calling this — it always writes immediately. */
	writeSection: (heading: string, content: string) => Promise<void>;

	/** Open a note in a new tab — shared by roster rows, chip links, and the
	 * malformed-section banner's "Open note" affordance. */
	openNote: (path: string) => Promise<void>;

	/** Register a DOM listener through the host view's `Component` lifecycle
	 * (never bare `addEventListener`) so it's torn down with the view. */
	registerDomEvent: <K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		cb: (evt: HTMLElementEventMap[K]) => void
	) => void;

	/** Track a `Debouncer` (from `obsidian`'s `debounce()`) so the panel can
	 * cancel it before the next full rebuild instead of leaving a stray timer
	 * pointed at detached DOM. */
	registerDebounce: (debouncer: { cancel(): void }) => void;

	/** Track an `AbstractInputSuggest`-family popover so the panel can close
	 * it before the next full rebuild (leak-prevention, see
	 * ~/.claude/docs/obsidian-plugin/ui-recipes.md). */
	registerSuggest: (suggest: { close(): void }) => void;

	/** Cheap refresh of the master-list state circles/summaries and toolbar
	 * progress text after a local edit — never rebuilds the active step's own
	 * workspace DOM (the self-write "soft path"). */
	requestSoftRefresh: () => void;

	/** Full, focus-preserving rebuild of the master list + active step
	 * workspace — used after edits that change what the master list or other
	 * steps should show (e.g. creating a note, adding/removing a row). */
	requestRerender: () => void;
}
