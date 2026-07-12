// Obsidian glue — the shared entity editor (docs/plan.md M17: "never leave
// the plugin to prep"). One modal, discriminated by entity kind, that creates
// and fully edits PC/NPC/location/quest notes: frontmatter fields through the
// per-type codecs plus the whole freeform body as one textarea. Clones the
// `TableEditorModal` pattern — a modal snapshots the note on open, edits in
// isolation, and writes on save, completely outside the store-notification
// render path, so none of the prep board's focus-preserve machinery applies.
//
// Deliberately NOT self-write-marked: open panels (World list, roster, chips)
// should re-render on the save's metadataCache echo.

import { TFile, Notice, type App } from "obsidian";
import { FormModal } from "../../lib/form-modal";
import { dropdownField, textField } from "../../lib/form-fields";
import { tryFileOp } from "../../lib/notify";
import { writeLazyFrontmatter, asLazy } from "../../lib/frontmatter";
import { replaceBody, stripFrontmatter } from "../../lib/body-split";
import {
	readNpcFm,
	readPcFm,
	readQuestFm,
	writeLocationFm,
	writeNpcFm,
	writePcFm,
	writeQuestFm,
} from "../../roster/entity-schema";
import {
	createLocationNote,
	createNpcNote,
	createPcNote,
	createQuestNote,
	renameEntityNote,
} from "../../roster/entity-files";
import type { CampaignModel } from "../../campaigns/types";

export type EntityKind = "pc" | "npc" | "location" | "quest";

const KIND_LABELS: Record<EntityKind, string> = {
	pc: "character",
	npc: "NPC",
	location: "location",
	quest: "quest",
};

const BODY_HINTS: Partial<Record<EntityKind, string>> = {
	pc: "Freeform — goals, bonds, spotlight ideas.",
	npc: "Freeform — appearance, motivation, secrets.",
	location: "Keep the three fantastic aspects as bullets under ## Aspects.",
	quest: "Freeform — hook, twist, how it ends.",
};

interface EditorSnapshot {
	name: string;
	body: string;
	/** Original `campaign` wikilink — preserved verbatim on edit so a moved/
	 * renamed campaign link never gets rewritten by this modal. */
	campaignLink: string;
	mtime: number;
	player?: string;
	role?: string;
	level?: number;
	location?: string;
	npcStatus: "alive" | "dead";
	questStatus: "open" | "done";
}

export interface EntityEditorOptions {
	kind: EntityKind;
	campaign: CampaignModel;
	/** Absent = create mode. */
	existingPath?: string;
}

/**
 * Load the target note (edit mode) and open the editor. The async read
 * happens BEFORE `.open()` so `render()` stays synchronous like every other
 * `FormModal`.
 */
export async function openEntityEditor(app: App, options: EntityEditorOptions): Promise<void> {
	let snapshot: EditorSnapshot | null = null;

	if (options.existingPath) {
		const file = app.vault.getFileByPath(options.existingPath);
		if (!(file instanceof TFile)) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const raw = await app.vault.cachedRead(file);
		const lazy = asLazy(app.metadataCache.getFileCache(file)?.frontmatter) ?? {};
		const pc = readPcFm(lazy);
		const npc = readNpcFm(lazy);
		const quest = readQuestFm(lazy);
		snapshot = {
			name: file.basename,
			body: stripFrontmatter(raw),
			campaignLink: typeof lazy.campaign === "string" ? lazy.campaign : `[[${options.campaign.name}]]`,
			mtime: file.stat.mtime,
			player: pc?.player,
			role: options.kind === "pc" ? pc?.role : npc?.role,
			level: pc?.level,
			location: npc?.location,
			npcStatus: npc?.status ?? "alive",
			questStatus: quest?.status ?? "open",
		};
	}

	new EntityEditorModal(app, options, snapshot).open();
}

class EntityEditorModal extends FormModal {
	private name: string;
	private body: string;
	private player: string;
	private role: string;
	private levelText: string;
	private location: string;
	private npcStatus: "alive" | "dead";
	private questStatus: "open" | "done";
	/** Set after the first stale-file warning; the next Save overwrites. */
	private staleConfirmed = false;

	constructor(
		app: App,
		private readonly options: EntityEditorOptions,
		private readonly snapshot: EditorSnapshot | null
	) {
		super(app);
		this.name = snapshot?.name ?? "";
		this.body = snapshot?.body ?? "";
		this.player = snapshot?.player ?? "";
		this.role = snapshot?.role ?? "";
		this.levelText = snapshot?.level !== undefined ? String(snapshot.level) : "";
		this.location = snapshot?.location ?? "";
		this.npcStatus = snapshot?.npcStatus ?? "alive";
		this.questStatus = snapshot?.questStatus ?? "open";
	}

	protected render(): void {
		const kind = this.options.kind;
		const label = KIND_LABELS[kind];
		this.setTitle(this.snapshot ? `Edit ${label}` : `New ${label}`);

		const nameInput = textField(this.contentEl, {
			name: "Name",
			desc: this.snapshot ? "Renaming updates links to this note everywhere." : undefined,
			placeholder: kind === "quest" ? "Clear the Lonely Torch" : "Name",
			value: this.name,
			onChange: (value) => {
				this.name = value;
			},
		});
		this.registerFirstInput(nameInput);
		this.bindEnterToSubmit(nameInput, () => this.handleSubmit());

		if (kind === "pc") {
			textField(this.contentEl, {
				name: "Player",
				value: this.player,
				onChange: (value) => {
					this.player = value;
				},
			});
			textField(this.contentEl, {
				name: "Role",
				placeholder: "wizard",
				value: this.role,
				onChange: (value) => {
					this.role = value;
				},
			});
			textField(this.contentEl, {
				name: "Level",
				desc: "1–20, or empty for unset (the encounter benchmark then uses its manual override).",
				value: this.levelText,
				onChange: (value) => {
					this.levelText = value;
				},
			});
		}

		if (kind === "npc") {
			textField(this.contentEl, {
				name: "Role",
				placeholder: "fence",
				value: this.role,
				onChange: (value) => {
					this.role = value;
				},
			});
			textField(this.contentEl, {
				name: "Location",
				desc: "Use [[Location name]] to link a location note.",
				value: this.location,
				onChange: (value) => {
					this.location = value;
				},
			});
			dropdownField(this.contentEl, {
				name: "Status",
				options: { alive: "Alive", dead: "Dead" },
				value: this.npcStatus,
				onChange: (value) => {
					this.npcStatus = value === "dead" ? "dead" : "alive";
				},
			});
		}

		if (kind === "quest") {
			dropdownField(this.contentEl, {
				name: "Status",
				options: { open: "Open", done: "Done" },
				value: this.questStatus,
				onChange: (value) => {
					this.questStatus = value === "done" ? "done" : "open";
				},
			});
		}

		const bodyWrap = this.contentEl.createDiv({ cls: "lazy-campaign-table-editor-textarea-wrap" });
		const hint = BODY_HINTS[kind];
		if (hint) bodyWrap.createEl("p", { cls: "lazy-campaign-hint", text: hint });
		const textarea = bodyWrap.createEl("textarea", {
			cls: "lazy-campaign-table-editor-textarea",
			attr: { rows: "12", placeholder: "Note body (markdown)" },
		});
		textarea.value = this.body;
		textarea.addEventListener("input", () => {
			this.body = textarea.value;
		});

		const buttonRow = this.contentEl.createDiv({ cls: "lazy-campaign-entity-editor-footer" });
		if (this.snapshot && this.options.existingPath) {
			const openBtn = buttonRow.createEl("button", { text: "Open note" });
			openBtn.addEventListener("click", () => void this.openNoteAndClose());
		}

		this.renderButtons(this.contentEl, {
			ctaText: "Save",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async openNoteAndClose(): Promise<void> {
		const path = this.options.existingPath;
		const file = path ? this.app.vault.getFileByPath(path) : null;
		this.close();
		if (file instanceof TFile) await this.app.workspace.getLeaf(true).openFile(file);
	}

	/** Lenient like the codec's own level reader: empty/invalid → unset. */
	private parsedLevel(): number | undefined {
		const trimmed = this.levelText.trim();
		if (trimmed.length === 0) return undefined;
		const num = Number(trimmed);
		if (!Number.isFinite(num)) return undefined;
		const rounded = Math.round(num);
		return rounded >= 1 && rounded <= 20 ? rounded : undefined;
	}

	private frontmatterFor(campaignLink: string): Record<string, unknown> {
		switch (this.options.kind) {
			case "pc":
				return writePcFm({
					campaign: campaignLink,
					player: this.player.trim() || undefined,
					role: this.role.trim() || undefined,
					level: this.parsedLevel(),
				});
			case "npc":
				return writeNpcFm({
					campaign: campaignLink,
					role: this.role.trim() || undefined,
					location: this.location.trim() || undefined,
					status: this.npcStatus,
				});
			case "location":
				return writeLocationFm({ campaign: campaignLink });
			case "quest":
				return writeQuestFm({ campaign: campaignLink, status: this.questStatus });
		}
	}

	private normalizedBody(): string {
		return `${this.body.replace(/\s+$/, "")}\n`;
	}

	private async handleSubmit(): Promise<void> {
		const name = this.name.trim();
		if (name.length === 0) {
			new Notice(`Give the ${KIND_LABELS[this.options.kind]} a name first.`);
			return;
		}

		if (this.snapshot && this.options.existingPath) {
			const saved = await tryFileOp(
				() => this.saveExisting(this.options.existingPath as string, name, this.snapshot as EditorSnapshot),
				"Couldn't save that note — check the console for details."
			);
			if (!saved) return;
			new Notice(`Saved ${name}.`);
			this.close();
			return;
		}

		const created = await tryFileOp(
			() => this.saveNew(name),
			"Couldn't create that note — check the console for details."
		);
		if (!created) return;
		new Notice(`Created ${name}.`);
		this.close();
	}

	/** Strictly sequential: staleness check → rename → frontmatter → body,
	 * every later step against the (possibly renamed) same TFile. Returns
	 * false only for the abort paths that already surfaced their own Notice. */
	private async saveExisting(path: string, name: string, snapshot: EditorSnapshot): Promise<boolean> {
		let file = this.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return false;
		}

		// The note changed on disk since the modal opened (sync, split-pane
		// edit) — one warning, then the GM's next Save wins deliberately.
		if (file.stat.mtime !== snapshot.mtime && !this.staleConfirmed) {
			this.staleConfirmed = true;
			new Notice("This note changed on disk while you were editing — saving again will overwrite it.");
			return false;
		}

		if (name !== file.basename) {
			const renamed = await renameEntityNote(this.app, file.path, name);
			if (!renamed) return false; // collision/abort already Notice'd
			file = renamed;
		}

		await writeLazyFrontmatter(this.app, file, this.frontmatterFor(snapshot.campaignLink));
		await this.app.vault.process(file, (raw) => replaceBody(raw, this.normalizedBody()));
		return true;
	}

	private async saveNew(name: string): Promise<TFile> {
		const app = this.app;
		const campaign = this.options.campaign;
		const body = this.normalizedBody();

		let file: TFile;
		switch (this.options.kind) {
			case "pc":
				file = await createPcNote(app, campaign, name, this.player.trim(), body);
				break;
			case "npc":
				file = await createNpcNote(app, campaign, name, body);
				break;
			case "location":
				file = await createLocationNote(app, campaign, name, body);
				break;
			case "quest":
				file = await createQuestNote(app, campaign, name, body);
				break;
		}
		// Second write upgrades creation with the full field set (role/status/
		// level/...) — same two-write shape the create*Note flows already use.
		await writeLazyFrontmatter(app, file, this.frontmatterFor(`[[${campaign.name}]]`));
		return file;
	}
}
