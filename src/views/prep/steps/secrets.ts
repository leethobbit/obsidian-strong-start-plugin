import { setIcon } from "obsidian";
import { newId } from "../../../lib/id";
import { addSecret, editSecretText, removeSecret } from "../../../sessions/secrets-ops";
import type { StepContext } from "../step-context";

const TARGET = 10;

/**
 * Frontmatter CRUD on `secrets[]` via the session codec. No reveal checkbox
 * here — that's a run-mode (M6) concern. Keeps its own local `secrets` array
 * (mirrors `list-section-editor.ts`'s `rows` pattern) rather than re-reading
 * `ctx.session` after a local edit.
 */
export function renderSecretsStep(container: HTMLElement, ctx: StepContext): void {
	container.createEl("h3", { text: "Define secrets and clues" });
	const progressEl = container.createEl("p", { cls: "lazy-campaign-progress-text" });

	let secrets = [...ctx.session.secrets];

	const listEl = container.createDiv({ cls: "lazy-campaign-secret-rows" });

	const addRow = container.createDiv({ cls: "lazy-campaign-secret-add-row" });
	const addInput = addRow.createEl("input", {
		type: "text",
		cls: "lazy-campaign-secret-add-input",
		attr: { placeholder: "Add a secret…", "data-key": "secrets-add" },
	});
	ctx.registerDomEvent(addInput, "keydown", (evt) => {
		if (evt.key !== "Enter") return;
		evt.preventDefault();
		const text = addInput.value.trim();
		if (text.length === 0) return;
		secrets = addSecret(secrets, newId("s"), text);
		addInput.value = "";
		commit();
		renderRows();
	});

	function updateProgress(): void {
		const count = secrets.filter((s) => !s.archived).length;
		progressEl.setText(`${count} of ${TARGET}`);
	}

	function commit(): void {
		void ctx.patchFrontmatter((fm) => ({ ...fm, secrets })).then(() => ctx.requestSoftRefresh());
	}

	function renderRows(): void {
		listEl.empty();

		if (secrets.length === 0) {
			listEl.createDiv({ cls: "lazy-campaign-empty-state", text: "No secrets yet." });
			updateProgress();
			return;
		}

		for (const secret of secrets) {
			const row = listEl.createDiv({
				cls: `lazy-campaign-secret-row${secret.archived ? " is-archived" : ""}`,
				attr: { "data-key": `secret-row-${secret.id}` },
			});
			const input = row.createEl("input", {
				type: "text",
				cls: "lazy-campaign-secret-input",
				attr: { "data-key": `secret-input-${secret.id}` },
			});
			input.value = secret.text;

			ctx.registerDomEvent(input, "blur", () => {
				const trimmed = input.value.trim();
				if (trimmed.length === 0 || trimmed === secret.text) return;
				secrets = editSecretText(secrets, secret.id, trimmed);
				commit();
			});

			// M4: deleting a secret that also exists in an earlier session
			// must write `archived: true` (a tombstone) instead of splicing
			// the row — true removal is correct in M2 only because
			// carry-over doesn't exist yet, so nothing could resurrect it
			// (SCHEMA.md "secret carry-over semantics").
			const removeBtn = row.createEl("button", {
				cls: "lazy-campaign-icon-button",
				attr: { "aria-label": "Remove secret", type: "button" },
			});
			setIcon(removeBtn, "x");
			ctx.registerDomEvent(removeBtn, "click", () => {
				secrets = removeSecret(secrets, secret.id);
				commit();
				renderRows();
			});
		}

		updateProgress();
	}

	renderRows();
}
