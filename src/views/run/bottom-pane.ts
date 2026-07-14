// Obsidian glue — run mode's bottom Log/Notes pane (run-screen redesign).
// The write-only log bar grows into a collapsible pane: a visible rolling
// `## Log` history above the existing append-only input, and a free-form
// `## Notes` scratchpad textarea — the panel's second (and last) editable
// surface, a deliberate amendment to M6's "no editable text except log".
// Collapsed, it is exactly the old one-line bar plus an expand chevron.
//
// DOM is built once per full rebuild; open/tab flips only toggle CSS classes,
// so uncommitted textarea keystrokes survive them. Notes writes are pinned to
// the session path captured at mount and chained through one in-flight
// promise, so the panel's flush-before-reread (`flushDebouncers`) can await
// a blur-started commit — not just a still-pending debounce timer.

import { debounce, setIcon } from "obsidian";
import { parseBulletSection } from "../../sessions/bullet-list";
import { sectionContent } from "../../lib/sections";
import { formatClockTime } from "../../lib/format-elapsed";
import type { RegisterDomEvent } from "../roll-chip";

export type BottomTab = "log" | "notes";

export interface BottomPaneHost {
	registerDomEvent: RegisterDomEvent;
	/** Flushed (awaited) by the run panel before every body re-read, and on
	 * teardown — the flush-don't-drop contract `prep-panel.ts` documents. */
	registerDebounce(debouncer: { cancel(): void; run(): unknown }): void;
	appendLog(path: string, text: string): Promise<void>;
	writeSectionAt(path: string, heading: string, content: string): Promise<void>;
	paneState(): { open: boolean; tab: BottomTab };
	setPaneState(next: Partial<{ open: boolean; tab: BottomTab }>): void;
}

const LOG_TIME_RE = /^(\d{1,2}:\d{2})\s+(.*)$/;

export function mountBottomPane(pane: HTMLElement, host: BottomPaneHost, sessionPath: string, bodyText: string): void {
	pane.addClass("strong-start-run-bottom");

	// ---- Tabs row (visible while open) ----
	const tabsRow = pane.createDiv({ cls: "strong-start-tables-subtabs strong-start-run-bottom-tabs" });
	const logTabBtn = tabsRow.createEl("button", { cls: "strong-start-tables-subtab", text: "Log", attr: { type: "button" } });
	const notesTabBtn = tabsRow.createEl("button", { cls: "strong-start-tables-subtab", text: "Notes", attr: { type: "button" } });
	const collapseBtn = tabsRow.createEl("button", {
		cls: "strong-start-run-icon-button strong-start-run-bottom-collapse",
		attr: { "aria-label": "Collapse log and notes", type: "button" },
	});
	setIcon(collapseBtn, "chevron-down");

	// ---- Body: log history / notes textarea ----
	const body = pane.createDiv({ cls: "strong-start-run-bottom-body" });
	const history = body.createDiv({ cls: "strong-start-run-log-history" });
	let emptyRow: HTMLElement | null = null;
	const appendHistoryRow = (text: string): void => {
		emptyRow?.remove();
		emptyRow = null;
		const row = history.createDiv({ cls: "strong-start-run-log-row" });
		const match = LOG_TIME_RE.exec(text);
		if (match) {
			row.createSpan({ cls: "strong-start-run-log-time", text: match[1] });
			row.createSpan({ text: match[2] });
		} else {
			row.setText(text);
		}
	};
	const logRows = parseBulletSection(sectionContent(bodyText, "Log")).rows;
	if (logRows.length === 0) {
		emptyRow = history.createDiv({ cls: "strong-start-run-log-row strong-start-empty-state", text: "Nothing logged yet." });
	} else {
		for (const row of logRows) appendHistoryRow(row);
	}
	const scrollToLatest = (): void => {
		history.scrollTop = history.scrollHeight;
	};

	const notesArea = body.createEl("textarea", {
		cls: "strong-start-run-notes-input",
		attr: { rows: "6", placeholder: "Session notes…", "data-key": "run-notes" },
	});
	notesArea.value = sectionContent(bodyText, "Notes");

	// Pinned commit chain: `pinnedPath` never follows a session switch, and
	// every write queues behind the previous one so `run()` can hand the
	// panel a promise that covers a commit already in flight.
	const pinnedPath = sessionPath;
	let inFlight: Promise<unknown> = Promise.resolve();
	const commit = (): Promise<unknown> => {
		inFlight = inFlight.then(() => host.writeSectionAt(pinnedPath, "Notes", notesArea.value));
		return inFlight;
	};
	const debouncedCommit = debounce(() => void commit(), 800, true);
	host.registerDebounce({
		cancel: () => debouncedCommit.cancel(),
		run: () => {
			debouncedCommit.run();
			return inFlight;
		},
	});
	host.registerDomEvent(notesArea, "input", () => debouncedCommit());
	host.registerDomEvent(notesArea, "blur", () => debouncedCommit.run());

	// ---- Input row (log input + expand chevron) ----
	const inputRow = pane.createDiv({ cls: "strong-start-run-bottom-inputrow" });
	const input = inputRow.createEl("input", {
		type: "text",
		cls: "strong-start-run-log-input",
		attr: { placeholder: "Log a note…", "data-key": "run-log-input" },
	});
	host.registerDomEvent(input, "keydown", (evt) => {
		if (evt.isComposing) return; // Enter confirming an IME candidate must not commit
		if (evt.key !== "Enter") return;
		evt.preventDefault();
		const text = input.value.trim();
		if (text.length === 0) return;
		input.value = "";
		// Optimistic: the panel's self-write soft path never re-reads the
		// body, so the pane owns its history rows between full rebuilds.
		appendHistoryRow(`${formatClockTime(new Date())} ${text}`);
		scrollToLatest();
		void host.appendLog(sessionPath, text).then(() => input.focus());
	});
	const expandBtn = inputRow.createEl("button", {
		cls: "strong-start-run-icon-button strong-start-run-bottom-expand",
		attr: { "aria-label": "Show log and notes", type: "button" },
	});
	setIcon(expandBtn, "chevron-up");

	// ---- Open/tab state (persisted device preference, like runTextSize) ----
	const applyState = (): void => {
		const state = host.paneState();
		pane.toggleClass("is-open", state.open);
		pane.toggleClass("is-tab-log", state.tab === "log");
		pane.toggleClass("is-tab-notes", state.tab === "notes");
		logTabBtn.toggleClass("is-active", state.tab === "log");
		notesTabBtn.toggleClass("is-active", state.tab === "notes");
		// scrollHeight is 0 while the history is hidden — re-anchor whenever
		// it becomes visible.
		if (state.open && state.tab === "log") scrollToLatest();
	};
	host.registerDomEvent(logTabBtn, "click", () => {
		host.setPaneState({ tab: "log" });
		applyState();
	});
	host.registerDomEvent(notesTabBtn, "click", () => {
		host.setPaneState({ tab: "notes" });
		applyState();
	});
	host.registerDomEvent(collapseBtn, "click", () => {
		host.setPaneState({ open: false });
		applyState();
	});
	host.registerDomEvent(expandBtn, "click", () => {
		host.setPaneState({ open: true });
		applyState();
	});
	applyState();
}
