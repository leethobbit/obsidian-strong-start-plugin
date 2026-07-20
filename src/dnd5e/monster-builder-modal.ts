// Obsidian glue — the 5e Monster Builder modal (M18). Clones the entity
// editor's shape (src/views/home/entity-editor-modal.ts): snapshot before
// open, edit in isolation, stale-mtime one-warning-then-overwrite, rename on
// save. This modal is the SINGLE editor for `type: monster` notes — they
// deliberately don't join `EntityKind` (a twelve-field 5e form doesn't belong
// in the shared editor's switch).
//
// The body is the GM's: creation seeds `## Stat block` + `## Notes` once, and
// after that the block only changes via the explicit "Refresh stat block"
// button (pure `replaceSection` on the textarea value — nothing auto-writes).

import { TFile, Notice, type App } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { dropdownField, textField } from "../lib/form-fields";
import { tryFileOp } from "../lib/notify";
import { writeLazyFrontmatter, asLazy } from "../lib/frontmatter";
import { replaceBody, stripFrontmatter } from "../lib/body-split";
import { replaceSection } from "../lib/sections";
import { ABILITY_IDS, MONSTER_FEATURES, MONSTER_ROLES } from "../content/monster-builder";
import { GENERAL_USE_MONSTERS } from "../content/monster-builder-presets";
import { readMonsterFm, writeMonsterFm, type MonsterBuildFields, type MonsterFm } from "./monster-schema";
import {
	baselineBuildFor,
	crLabel,
	deriveMonster,
	statsForCr,
	suggestedCrForParty,
	withAttackCount,
} from "./monster-build";
import {
	MONSTER_STAT_BLOCK_HEADING,
	monsterStatBlockMarkdown,
	seededMonsterBody,
} from "./monster-markdown";
import { MONSTER_STATS_BY_CR } from "../content/monster-builder";
import { createMonsterNote } from "./monster-files";
import { renameEntityNote } from "../roster/entity-files";
import type { CampaignModel } from "../campaigns/types";

interface MonsterSnapshot {
	name: string;
	body: string;
	campaignLink: string;
	mtime: number;
	fm: MonsterFm;
}

export interface MonsterBuilderOptions {
	campaign: CampaignModel;
	/** Absent = create mode. */
	existingPath?: string;
	/** Known PC levels — powers the "For the party" CR suggestion. */
	partyLevels?: readonly number[];
	/** Fires after a successful save so callers can link the note (e.g. the
	 * prep Monsters step appending a `[[Name]]` chip). */
	onSaved?: (file: TFile, name: string) => void | Promise<void>;
}

/** Order-insensitive equality — manual chip toggles rebuild the array in
 * ABILITY_IDS order, which may not match a role's suggestion order. */
function sameAbilitySet(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && b.every((ability) => a.includes(ability));
}

export async function openMonsterBuilder(app: App, options: MonsterBuilderOptions): Promise<void> {
	let snapshot: MonsterSnapshot | null = null;

	if (options.existingPath) {
		const file = app.vault.getFileByPath(options.existingPath);
		if (!(file instanceof TFile)) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return;
		}
		const raw = await app.vault.cachedRead(file);
		const lazy = asLazy(app.metadataCache.getFileCache(file)?.frontmatter) ?? {};
		const fm = readMonsterFm(lazy);
		if (!fm) {
			new Notice("That note isn't a readable monster — check its lazyCampaign frontmatter.");
			return;
		}
		snapshot = {
			name: file.basename,
			body: stripFrontmatter(raw),
			campaignLink: fm.campaign,
			mtime: file.stat.mtime,
			fm,
		};
	}

	new MonsterBuilderModal(app, options, snapshot).open();
}

const DEFAULT_CR = 1;

class MonsterBuilderModal extends FormModal {
	private name: string;
	private body: string;
	private build: MonsterBuildFields;
	private previewEl: HTMLElement | null = null;
	private bodyTextarea: HTMLTextAreaElement | null = null;
	/** Verbatim preset stat block to seed the body with (create mode only). */
	private presetBody: string | null = null;
	private staleConfirmed = false;

	constructor(
		app: App,
		private readonly options: MonsterBuilderOptions,
		private readonly snapshot: MonsterSnapshot | null
	) {
		super(app);
		this.name = snapshot?.name ?? "";
		this.body = snapshot?.body ?? "";
		this.build = snapshot
			? { ...snapshot.fm }
			: (baselineBuildFor(DEFAULT_CR) as MonsterBuildFields);
	}

	protected render(): void {
		this.setTitle(this.snapshot ? "Edit monster" : "Build a monster");
		this.contentEl.addClass("strong-start-monster-builder");

		if (!this.snapshot) this.renderStartFrom();

		const nameInput = textField(this.contentEl, {
			name: "Name",
			desc: this.snapshot ? "Renaming updates links to this note everywhere." : undefined,
			placeholder: "Grib the Ogre",
			value: this.name,
			onChange: (value) => {
				this.name = value;
				// The preview card titles itself with the name — without this
				// it shows the stale/"Unnamed monster" title until some other
				// field changes.
				this.updatePreview();
			},
		});
		this.registerFirstInput(nameInput);
		this.bindEnterToSubmit(nameInput, () => this.handleSubmit());

		this.renderCrRow();

		textField(this.contentEl, {
			name: "Flavor",
			desc: "Free size/type line — shown atop the stat block.",
			placeholder: "Large fiend",
			value: this.build.flavor ?? "",
			onChange: (value) => {
				this.build.flavor = value.trim() || undefined;
				this.updatePreview();
			},
		});

		const roleOptions: Record<string, string> = { "": "None" };
		for (const role of MONSTER_ROLES) roleOptions[role.id] = role.name;
		dropdownField(this.contentEl, {
			name: "Role",
			desc: "Tactical role — pre-suggests proficient abilities, never changes the numbers.",
			options: roleOptions,
			value: this.build.role ?? "",
			onChange: (value) => {
				const role = MONSTER_ROLES.find((candidate) => candidate.id === value);
				const outgoing = MONSTER_ROLES.find((candidate) => candidate.id === this.build.role);
				this.build.role = role?.id;
				// Re-seed only while the chips are still un-customized: blank, or
				// exactly the outgoing role's suggestion. A hand-edited set is the
				// GM's ("pre-suggests ... never enforced") and survives role swaps.
				const untouched =
					this.build.abilities.length === 0 ||
					(outgoing !== undefined && sameAbilitySet(this.build.abilities, outgoing.suggestedAbilities));
				if (untouched) {
					this.build.abilities = role ? [...role.suggestedAbilities] : [];
					this.rerender();
					return;
				}
				this.updatePreview();
			},
		});

		this.renderNumberField("Armor class", String(this.build.ac), (num) => {
			this.build.ac = num;
		});
		this.renderNumberField("Save DC", String(this.build.dc), (num) => {
			this.build.dc = num;
		});
		const table = statsForCr(this.build.cr);
		this.renderNumberField(
			"Hit points",
			String(this.build.hp),
			(num) => {
				this.build.hp = num;
			},
			table ? `The table suggests ${table.hpMin}–${table.hpMax} at CR ${crLabel(this.build.cr)}.` : undefined
		);

		const attackOptions: Record<string, string> = {};
		for (let i = 1; i <= 6; i++) attackOptions[String(i)] = String(i);
		dropdownField(this.contentEl, {
			name: "Attacks per round",
			desc: "Changing this re-splits the CR's damage per round across the new count.",
			options: attackOptions,
			value: String(Math.min(6, Math.max(1, this.build.attacks))),
			onChange: (value) => {
				this.build = withAttackCount(this.build, Number(value));
				this.rerender();
			},
		});

		this.renderNumberField("Damage per attack", String(this.build.damagePerAttack), (num) => {
			this.build.damagePerAttack = num;
		});
		textField(this.contentEl, {
			name: "Damage dice",
			desc: "Optional dice equation; empty shows averages only.",
			placeholder: "3d6 + 2",
			value: this.build.damageDice ?? "",
			onChange: (value) => {
				this.build.damageDice = value.trim() || undefined;
				this.updatePreview();
			},
		});
		textField(this.contentEl, {
			name: "Damage types",
			placeholder: "slashing, or fire and cold",
			value: this.build.damageTypes ?? "",
			onChange: (value) => {
				this.build.damageTypes = value.trim() || undefined;
				this.updatePreview();
			},
		});

		this.renderAbilityChips();
		this.renderFeatureList();
		this.renderPreview();
		this.renderBodyEditor();

		const footer = this.contentEl.createDiv({ cls: "strong-start-entity-editor-footer" });
		if (this.snapshot && this.options.existingPath) {
			const openBtn = footer.createEl("button", { text: "Open note" });
			openBtn.addEventListener("click", () => void this.openNoteAndClose());
		}

		this.renderButtons(this.contentEl, {
			ctaText: "Save",
			onSubmit: () => this.handleSubmit(),
		});
	}

	/** Create mode's entry row: the seven general-use presets. */
	private renderStartFrom(): void {
		const wrap = this.contentEl.createDiv({ cls: "strong-start-monster-presets" });
		wrap.createEl("p", {
			cls: "strong-start-hint",
			text: "Start from a general-use stat block, or pick a CR below and build from the table.",
		});
		const row = wrap.createDiv({ cls: "strong-start-monster-presets-row" });
		for (const preset of GENERAL_USE_MONSTERS) {
			const button = row.createEl("button", {
				cls: "strong-start-monster-preset",
				text: `${preset.name} (CR ${crLabel(preset.cr)})`,
				attr: { title: preset.usage },
			});
			button.addEventListener("click", () => {
				this.build = { ...preset.build, abilities: [...preset.build.abilities], features: [...preset.build.features] };
				this.presetBody = preset.body;
				this.rerender();
			});
		}
	}

	private renderCrRow(): void {
		const crOptions: Record<string, string> = {};
		for (const line of MONSTER_STATS_BY_CR) {
			crOptions[String(line.cr)] = `CR ${line.label} — ${line.examples.length > 0 ? line.examples.join(", ") : "beyond published monsters"}`;
		}
		const select = dropdownField(this.contentEl, {
			name: "Challenge rating",
			desc: "Changing CR resets the numeric fields to the table baseline for the new CR.",
			options: crOptions,
			value: String(this.build.cr),
			onChange: (value) => this.rebaseline(Number(value)),
		});

		const levels = (this.options.partyLevels ?? []).filter((level) => level >= 1 && level <= 20);
		if (!this.snapshot && levels.length > 0) {
			const suggested = suggestedCrForParty(levels);
			if (suggested !== null) {
				const row = this.contentEl.createDiv({ cls: "strong-start-monster-party-row" });
				const button = row.createEl("button", {
					text: `For the party: CR ${crLabel(suggested)}`,
				});
				row.createEl("span", {
					cls: "strong-start-hint",
					text: "One monster vs one character, hard — from the table's equivalent character level.",
				});
				button.addEventListener("click", () => {
					select.value = String(suggested);
					this.rebaseline(suggested);
				});
			}
		}
	}

	private rebaseline(cr: number): void {
		const baseline = baselineBuildFor(cr);
		if (!baseline) return;
		this.build = {
			...baseline,
			role: this.build.role,
			flavor: this.build.flavor,
			damageTypes: this.build.damageTypes,
			abilities: this.build.abilities,
			features: this.build.features,
		};
		if (this.presetBody) {
			this.presetBody = null;
			new Notice("Preset stat block dropped — the numbers were reset to the CR baseline.");
		}
		new Notice(`Reset to the CR ${crLabel(cr)} baseline.`);
		this.rerender();
	}

	/** Lenient numeric field: invalid input just leaves the last good value. */
	private renderNumberField(name: string, value: string, apply: (num: number) => void, desc?: string): void {
		textField(this.contentEl, {
			name,
			desc,
			value,
			onChange: (raw) => {
				const num = Number(raw.trim());
				if (Number.isFinite(num) && num >= 0) {
					apply(Math.round(num));
					this.updatePreview();
				}
			},
		});
	}

	private renderAbilityChips(): void {
		const row = this.contentEl.createDiv({ cls: "strong-start-monster-abilities" });
		row.createEl("span", { cls: "strong-start-monster-field-label", text: "Proficient abilities" });
		for (const ability of ABILITY_IDS) {
			const active = this.build.abilities.includes(ability);
			const chip = row.createEl("button", {
				cls: active ? "strong-start-monster-chip is-active" : "strong-start-monster-chip",
				text: ability.toUpperCase(),
			});
			chip.addEventListener("click", () => {
				this.build.abilities = active
					? this.build.abilities.filter((candidate) => candidate !== ability)
					: [...ABILITY_IDS.filter((candidate) => this.build.abilities.includes(candidate) || candidate === ability)];
				this.rerender();
			});
		}
	}

	private renderFeatureList(): void {
		const wrap = this.contentEl.createDiv({ cls: "strong-start-monster-features" });
		wrap.createEl("span", { cls: "strong-start-monster-field-label", text: "Features" });
		for (const feature of MONSTER_FEATURES) {
			const row = wrap.createDiv({ cls: "strong-start-monster-feature-row" });
			const label = row.createEl("label");
			const checkbox = label.createEl("input", { type: "checkbox" });
			checkbox.checked = this.build.features.includes(feature.id);
			const cost = feature.costsOneAttack ? " (costs one attack)" : "";
			label.createEl("span", { text: `${feature.name}${cost}`, attr: { title: feature.text } });
			checkbox.addEventListener("change", () => {
				this.build.features = checkbox.checked
					? [...this.build.features, feature.id]
					: this.build.features.filter((id) => id !== feature.id);
				this.updatePreview();
			});
		}
	}

	private renderPreview(): void {
		this.previewEl = this.contentEl.createDiv({ cls: "strong-start-monster-preview" });
		this.updatePreview();
	}

	private updatePreview(): void {
		if (!this.previewEl) return;
		this.previewEl.empty();
		const derived = deriveMonster(this.build);
		const { build } = derived;
		this.previewEl.createEl("div", {
			cls: "strong-start-monster-preview-title",
			text: this.name.trim() || "Unnamed monster",
		});
		if (build.flavor) this.previewEl.createEl("div", { cls: "strong-start-monster-preview-flavor", text: build.flavor });
		const statLine = this.previewEl.createDiv({ cls: "strong-start-monster-preview-stats" });
		statLine.setText(`AC ${build.ac} · HP ${build.hp} · CR ${crLabel(build.cr)} · save DC ${build.dc}`);
		const attackLine = this.previewEl.createDiv({ cls: "strong-start-monster-preview-stats" });
		if (derived.effectiveAttacks > 0) {
			const dice = build.damageDice ? ` (${build.damageDice})` : "";
			const types = build.damageTypes ? ` ${build.damageTypes}` : "";
			attackLine.setText(
				`${derived.effectiveAttacks} × +${build.profBonus} to hit, ${build.damagePerAttack}${dice}${types} — ${derived.damagePerRound}/round`
			);
		} else {
			attackLine.setText("No attacks left — features carry the whole damage budget.");
		}
		for (const feature of derived.featureLines) {
			const damage = feature.damage !== undefined ? ` About ${feature.damage} damage.` : "";
			this.previewEl.createEl("div", {
				cls: "strong-start-monster-preview-feature",
				text: `${feature.name}. ${feature.text}${damage}`,
			});
		}
	}

	private renderBodyEditor(): void {
		const wrap = this.contentEl.createDiv({ cls: "strong-start-table-editor-textarea-wrap" });
		wrap.createEl("p", {
			cls: "strong-start-hint",
			text: this.snapshot
				? "The note body. Refresh stat block regenerates only the ## Stat block section from the fields above."
				: "Optional — leave empty to seed ## Stat block and ## Notes automatically on save.",
		});
		this.bodyTextarea = wrap.createEl("textarea", {
			cls: "strong-start-table-editor-textarea",
			attr: { rows: "10", placeholder: "Note body (markdown)" },
		});
		this.bodyTextarea.value = this.body;
		this.bodyTextarea.addEventListener("input", () => {
			this.body = this.bodyTextarea?.value ?? this.body;
		});
		const refresh = wrap.createEl("button", { text: "Refresh stat block" });
		refresh.addEventListener("click", () => {
			const derived = deriveMonster(this.build);
			const current = this.bodyTextarea?.value ?? "";
			const next =
				current.trim().length === 0
					? seededMonsterBody(derived, this.presetBody ?? undefined)
					: replaceSection(current, MONSTER_STAT_BLOCK_HEADING, monsterStatBlockMarkdown(derived));
			this.body = next;
			if (this.bodyTextarea) this.bodyTextarea.value = next;
		});
	}

	private rerender(): void {
		this.contentEl.empty();
		this.render();
	}

	private async openNoteAndClose(): Promise<void> {
		const path = this.options.existingPath;
		const file = path ? this.app.vault.getFileByPath(path) : null;
		this.close();
		if (file instanceof TFile) await this.app.workspace.getLeaf(true).openFile(file);
	}

	private fm(campaignLink: string): MonsterFm {
		return { ...this.build, campaign: campaignLink };
	}

	private normalizedBody(): string {
		return `${this.body.replace(/\s+$/, "")}\n`;
	}

	private async handleSubmit(): Promise<void> {
		const name = this.name.trim();
		if (name.length === 0) {
			new Notice("Give the monster a name first.");
			return;
		}

		if (this.snapshot && this.options.existingPath) {
			const saved = await tryFileOp(
				() => this.saveExisting(this.options.existingPath as string, name, this.snapshot as MonsterSnapshot),
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
		new Notice(`Created ${created.basename}.`);
		this.close();
		await this.options.onSaved?.(created, created.basename);
	}

	private async saveExisting(path: string, name: string, snapshot: MonsterSnapshot): Promise<boolean> {
		let file = this.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice("That note couldn't be found — it may have been moved or deleted.");
			return false;
		}

		if (file.stat.mtime !== snapshot.mtime && !this.staleConfirmed) {
			this.staleConfirmed = true;
			new Notice("This note changed on disk while you were editing — saving again will overwrite it.");
			return false;
		}

		if (name !== file.basename) {
			const renamed = await renameEntityNote(this.app, file.path, name);
			if (!renamed) return false;
			file = renamed;
		}

		await writeLazyFrontmatter(this.app, file, writeMonsterFm(this.fm(snapshot.campaignLink)));
		await this.app.vault.process(file, (raw) => replaceBody(raw, this.normalizedBody()));
		return true;
	}

	private async saveNew(name: string): Promise<TFile> {
		const derived = deriveMonster(this.build);
		const body =
			this.body.trim().length === 0
				? seededMonsterBody(derived, this.presetBody ?? undefined)
				: this.normalizedBody();
		return createMonsterNote(
			this.app,
			this.options.campaign,
			name,
			this.fm(`[[${this.options.campaign.name}]]`),
			body
		);
	}
}
