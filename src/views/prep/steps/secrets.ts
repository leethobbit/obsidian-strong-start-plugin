import { Notice, setIcon } from "obsidian";
import { newId } from "../../../lib/id";
import { addSecret, deleteSecretSafely, editSecretText, restoreSecret } from "../../../sessions/secrets-ops";
import { canHardDelete, openSecrets, syncCarried, type DerivedSecret } from "../../../sessions/carryover";
import { rollTable } from "../../../tables/roll";
import { renderInspireControl } from "../../roll-chip";
import type { Secret } from "../../../sessions/types";
import type { StepContext } from "../step-context";

const TARGET = 10;

// The four "Creating Secrets and Clues" categories (src/content/secrets-clues.ts).
const SECRETS_TABLE_IDS = [
	"secrets-character",
	"secrets-historical",
	"secrets-npc-villain",
	"secrets-plot",
] as const;

/**
 * Frontmatter CRUD on `secrets[]` via the session codec, plus the carry-over
 * UI: a carried strip (ids that originate in an earlier session — the only
 * action is Retire), a new-this-session list (editable/removable — hard
 * delete only when nothing earlier would resurrect it), a "Sync carried
 * secrets" button, and a "Show retired" toggle over tombstoned rows. No
 * reveal control here — that's the secrets ledger/run-mode's job. Keeps its
 * own local `secrets` array (mirrors `list-section-editor.ts`'s `rows`
 * pattern) rather than re-reading `ctx.session` after a local edit.
 */
export function renderSecretsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Define secrets and clues" });
	const progressEl = container.createEl("p", { cls: "strong-start-progress-text" });

	let secrets = [...ctx.session.secrets];

	// Every session other than the current one, older by number — the
	// "prior" set carryForward/syncCarried/canHardDelete reason about.
	const priorSessions = ctx.sessions.filter((s) => s.path !== ctx.session.path && s.session < ctx.session.session);

	// The campaign-wide fold tells us, per id, where it first appeared and
	// how many distinct sessions contain it — recomputed once per render
	// (the local `secrets` edits below only ever touch the current session's
	// own rows, never this map).
	const derivedById = new Map(openSecrets(ctx.sessions).map((d) => [d.id, d] as const));

	const carriedHeaderRow = container.createDiv({ cls: "strong-start-secret-section-header" });
	carriedHeaderRow.createEl("h4", {
		cls: "strong-start-secret-section-heading",
		text: "Carried over — unrevealed from earlier",
	});
	const syncBtn = carriedHeaderRow.createEl("button", {
		cls: "strong-start-secret-sync-button",
		attr: { type: "button", "aria-label": "Sync carried secrets" },
	});
	const syncIcon = syncBtn.createSpan();
	setIcon(syncIcon, "refresh-cw");
	syncBtn.createSpan({ text: " Sync carried" });
	ctx.registerDomEvent(syncBtn, "click", () => handleSync());

	const carriedListEl = container.createDiv({ cls: "strong-start-secret-rows strong-start-secret-carried-strip" });

	container.createEl("h4", { cls: "strong-start-secret-section-heading", text: "New this session" });
	const listEl = container.createDiv({ cls: "strong-start-secret-rows" });

	const addRow = container.createDiv({ cls: "strong-start-secret-add-row" });
	const addInput = addRow.createEl("input", {
		type: "text",
		cls: "strong-start-secret-add-input",
		attr: { placeholder: "Add a secret…", "data-key": "secrets-add" },
	});
	ctx.registerDomEvent(addInput, "keydown", (evt) => {
		if (evt.isComposing) return; // Enter confirming an IME candidate must not commit
			if (evt.key !== "Enter") return;
		evt.preventDefault();
		const text = addInput.value.trim();
		if (text.length === 0) return;
		secrets = addSecret(secrets, newId("s"), text);
		addInput.value = "";
		commit();
		renderAll();
	});

	renderInspireControl({
		container,
		tableIds: SECRETS_TABLE_IDS,
		getTable: (id) => ctx.plugin.tables?.get(id),
		rollTable: (id) => (ctx.plugin.tables ? rollTable(id, ctx.plugin.tables, ctx.plugin.rng) : null),
		registerDomEvent: ctx.registerDomEvent,
		onInsert: (text) => {
			secrets = addSecret(secrets, newId("s"), text);
			commit();
			renderAll();
		},
	});

	let showRetired = false;
	const retiredToggleRow = container.createDiv({ cls: "strong-start-secret-retired-toggle-row" });
	const retiredToggleBtn = retiredToggleRow.createEl("button", {
		cls: "strong-start-secret-retired-toggle",
		text: "Show retired",
		attr: { type: "button" },
	});
	ctx.registerDomEvent(retiredToggleBtn, "click", () => {
		showRetired = !showRetired;
		retiredToggleBtn.setText(showRetired ? "Hide retired" : "Show retired");
		renderRetired();
	});
	const retiredListEl = container.createDiv({ cls: "strong-start-secret-rows strong-start-secret-retired-list" });

	function isCarried(id: string): boolean {
		const derived = derivedById.get(id);
		return derived !== undefined && derived.originSession < ctx.session.session;
	}

	function agedClass(derived: DerivedSecret | undefined): string {
		const carriedTimes = (derived?.sessionsCarried ?? 1) - 1;
		if (carriedTimes >= 3) return "is-carried-3-plus";
		if (carriedTimes === 2) return "is-carried-2";
		return "is-carried-1";
	}

	function commit(): void {
		void ctx.patchFrontmatter((fm) => ({ ...fm, secrets })).then(() => ctx.requestSoftRefresh());
	}

	function updateProgress(): void {
		const count = secrets.filter((s) => !s.archived).length;
		progressEl.setText(`${count} of ${TARGET}`);
	}

	function handleDelete(secret: Secret): void {
		const hardDeleteAllowed = canHardDelete(secret.id, ctx.session, priorSessions);
		secrets = deleteSecretSafely(secrets, secret.id, hardDeleteAllowed);
		commit();
		renderAll();
	}

	function handleRestore(secret: Secret): void {
		secrets = restoreSecret(secrets, secret.id);
		commit();
		renderAll();
	}

	function handleSync(): void {
		const additions = syncCarried(ctx.session, priorSessions);
		if (additions.length === 0) {
			new Notice("Nothing new to carry.");
			return;
		}
		secrets = [...secrets, ...additions];
		commit();
		renderAll();
		new Notice(`${additions.length} secret${additions.length === 1 ? "" : "s"} carried in.`);
	}

	function renderTextRow(
		mountEl: HTMLElement,
		secret: Secret,
		options: { extraCls?: string; onDelete: () => void; deleteLabel: string; showOrigin?: boolean }
	): void {
		const derived = derivedById.get(secret.id);
		const row = mountEl.createDiv({
			cls: `strong-start-secret-row${options.extraCls ? ` ${options.extraCls}` : ""}`,
			attr: { "data-key": `secret-row-${secret.id}` },
		});

		if (options.showOrigin) {
			const hourglass = row.createSpan({ cls: "strong-start-secret-hourglass" });
			setIcon(hourglass, "hourglass");
			if (derived) row.createSpan({ cls: "strong-start-secret-origin-tag", text: `s.${derived.originSession}` });
		}

		const input = row.createEl("input", {
			type: "text",
			cls: "strong-start-secret-input",
			attr: { "data-key": `secret-input-${secret.id}` },
		});
		input.value = secret.text;
		ctx.registerDomEvent(input, "blur", () => {
			const trimmed = input.value.trim();
			if (trimmed.length === 0 || trimmed === secret.text) return;
			secrets = editSecretText(secrets, secret.id, trimmed);
			commit();
		});

		const deleteBtn = row.createEl("button", { cls: "strong-start-secret-action-button", text: options.deleteLabel });
		ctx.registerDomEvent(deleteBtn, "click", options.onDelete);
	}

	function renderCarried(): void {
		carriedListEl.empty();
		const rows = secrets.filter((s) => !s.archived && isCarried(s.id));
		if (rows.length === 0) {
			carriedListEl.createDiv({ cls: "strong-start-empty-state", text: "Nothing carried over yet." });
			return;
		}
		for (const secret of rows) {
			renderTextRow(carriedListEl, secret, {
				extraCls: agedClass(derivedById.get(secret.id)),
				onDelete: () => handleDelete(secret),
				deleteLabel: "Retire",
				showOrigin: true,
			});
		}
	}

	function renderNew(): void {
		listEl.empty();
		const rows = secrets.filter((s) => !s.archived && !isCarried(s.id));
		if (rows.length === 0) {
			listEl.createDiv({ cls: "strong-start-empty-state", text: "No secrets yet." });
			return;
		}
		for (const secret of rows) {
			renderTextRow(listEl, secret, {
				onDelete: () => handleDelete(secret),
				deleteLabel: "Remove",
			});
		}
	}

	function renderRetired(): void {
		retiredListEl.empty();
		retiredListEl.toggleClass("is-hidden", !showRetired);
		if (!showRetired) return;
		const rows = secrets.filter((s) => s.archived);
		if (rows.length === 0) {
			retiredListEl.createDiv({ cls: "strong-start-empty-state", text: "Nothing retired." });
			return;
		}
		for (const secret of rows) {
			const row = retiredListEl.createDiv({
				cls: "strong-start-secret-row is-retired",
				attr: { "data-key": `secret-row-${secret.id}` },
			});
			row.createSpan({ cls: "strong-start-secret-input strong-start-secret-retired-text", text: secret.text });
			const restoreBtn = row.createEl("button", { cls: "strong-start-secret-action-button", text: "Restore" });
			ctx.registerDomEvent(restoreBtn, "click", () => handleRestore(secret));
		}
	}

	function renderAll(): void {
		renderCarried();
		renderNew();
		renderRetired();
		updateProgress();
	}

	renderAll();
}
