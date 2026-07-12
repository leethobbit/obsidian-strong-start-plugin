import { AbstractInputSuggest, setIcon, type App, type TFile } from "obsidian";
import { addLink, convertToWikilink, displayText, isWikilink, removeLink } from "../../../sessions/link-list";
import type { StepContext } from "../step-context";
import type { LinkStepKey } from "../../../sessions/steps";

export interface ChipEditorOptions {
	/** Stable prefix for `data-key`s, e.g. "locations"/"npcs"/"monsters". */
	stepId: string;
	fmKey: LinkStepKey;
	placeholder: string;
	/** Candidate display names for the typeahead. */
	suggestions: () => string[];
	/** Omitted for monsters — no create-note affordance (SCHEMA.md: no
	 * monster note type in v1, monsters are strings or links to the GM's own
	 * notes). */
	createNote?: (name: string) => Promise<{ file: TFile } | null>;
	/** M17: when set, resolved wikilink chips get a pencil opening the entity
	 * editor for the linked note. The label click stays "open note" — muscle
	 * memory. Omitted for monsters (no note type to edit). */
	onEdit?: (resolvedPath: string) => void;
}

/**
 * `AbstractInputSuggest` subclass for the chip editor's typeahead. Never
 * overrides `selectSuggestion` (the base impl's `setValue()` + `onSelect`
 * dispatch is exactly what's needed) — see ui-recipes.md's leak rules.
 */
class VaultNoteSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		private readonly candidates: () => string[]
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): string[] {
		const q = query.trim().toLowerCase();
		const all = this.candidates();
		const matches = q.length === 0 ? all : all.filter((c) => c.toLowerCase().includes(q));
		return matches.slice(0, 20);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}
}

export interface ChipEditorHandle {
	/** Populate the pending "add" input without committing it — used by the
	 * NPCs step's "Roll a name" inspire control, which fills the input for the
	 * GM to accept/edit rather than creating a chip outright (docs/plan.md:
	 * "insert puts the name into the chip-editor input; does not create a
	 * note"). */
	setInputValue(value: string): void;
}

/**
 * Shared link-chip editor over a session frontmatter string array — used by
 * the Locations, NPCs, and Monsters steps. Keeps its own local `links` array
 * (mirrors `list-section-editor.ts`'s `rows` pattern) so it never has to read
 * back through the (snapshot) `ctx.session` after its own edit.
 */
export function renderChipEditor(container: HTMLElement, ctx: StepContext, options: ChipEditorOptions): ChipEditorHandle {
	let links = [...ctx.session[options.fmKey]];

	const chipRow = container.createDiv({ cls: "lazy-campaign-chip-row" });

	const inputRow = container.createDiv({ cls: "lazy-campaign-chip-input-row" });
	const input = inputRow.createEl("input", {
		type: "text",
		cls: "lazy-campaign-chip-input",
		attr: { placeholder: options.placeholder, "data-key": `${options.stepId}-add` },
	});

	const suggest = new VaultNoteSuggest(ctx.app, input, options.suggestions);
	// Rule: update state directly from `onSelect`, never rely on a
	// programmatic `inputEl.value` write round-tripping through a separate
	// change listener (ui-recipes.md).
	suggest.onSelect((value) => commitAdd(value));
	ctx.registerSuggest(suggest);

	ctx.registerDomEvent(input, "keydown", (evt) => {
		if (evt.isComposing) return; // Enter confirming an IME candidate must not commit
			if (evt.key !== "Enter") return;
		evt.preventDefault();
		commitAdd(input.value);
	});

	function commitAdd(value: string): void {
		const trimmed = value.trim();
		if (trimmed.length === 0) return;
		links = addLink(links, trimmed);
		input.value = "";
		commit();
		renderChips();
	}

	function commit(): void {
		void ctx.patchFrontmatter((fm) => ({ ...fm, [options.fmKey]: links })).then(() => ctx.requestSoftRefresh());
	}

	function renderChips(): void {
		chipRow.empty();
		if (links.length === 0) {
			chipRow.createSpan({ cls: "lazy-campaign-empty-state", text: "None yet." });
			return;
		}

		links.forEach((raw, index) => {
			const chip = chipRow.createDiv({
				cls: "lazy-campaign-chip",
				attr: { "data-key": `${options.stepId}-chip-${index}` },
			});
			const label = chip.createSpan({ cls: "lazy-campaign-chip-label", text: displayText(raw) });

			if (isWikilink(raw)) {
				label.addClass("is-linked");
				ctx.registerDomEvent(label, "click", () => {
					const dest = ctx.app.metadataCache.getFirstLinkpathDest(displayText(raw), ctx.session.path);
					if (dest) void ctx.openNote(dest.path);
				});

				const onEdit = options.onEdit;
				if (onEdit) {
					const dest = ctx.app.metadataCache.getFirstLinkpathDest(displayText(raw), ctx.session.path);
					if (dest) {
						const editBtn = chip.createEl("button", {
							cls: "lazy-campaign-icon-button lazy-campaign-chip-edit",
							attr: { "aria-label": `Edit ${displayText(raw)}`, type: "button" },
						});
						setIcon(editBtn, "pencil");
						ctx.registerDomEvent(editBtn, "click", () => onEdit(dest.path));
					}
				}
			} else if (options.createNote) {
				const createBtn = chip.createEl("button", { text: "Create note", cls: "lazy-campaign-chip-create" });
				ctx.registerDomEvent(createBtn, "click", () => void handleCreate(raw));
			}

			const removeBtn = chip.createEl("button", {
				cls: "lazy-campaign-icon-button",
				attr: { "aria-label": "Remove", type: "button" },
			});
			setIcon(removeBtn, "x");
			ctx.registerDomEvent(removeBtn, "click", () => {
				links = removeLink(links, raw);
				commit();
				renderChips();
			});
		});
	}

	async function handleCreate(plainValue: string): Promise<void> {
		if (!options.createNote) return;
		const created = await options.createNote(plainValue);
		if (!created) return;
		links = convertToWikilink(links, plainValue, created.file.basename);
		commit();
		renderChips();
	}

	renderChips();

	return {
		setInputValue(value: string) {
			input.value = value;
			input.focus();
		},
	};
}
