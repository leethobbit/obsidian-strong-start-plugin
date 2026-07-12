import type { App } from "obsidian";
import { FormModal } from "../../lib/form-modal";
import { textField } from "../../lib/form-fields";

/**
 * Small modal the secrets ledger opens for "Reveal": the secret's text for
 * context, plus an optional "how did they learn it?" note captured onto the
 * authoritative copy alongside `revealed: true`.
 */
export class RevealSecretModal extends FormModal {
	private note = "";

	constructor(
		app: App,
		private readonly secretText: string,
		private readonly onSubmit: (note: string) => void | Promise<void>
	) {
		super(app);
	}

	protected render(): void {
		this.setTitle("Reveal secret");
		this.contentEl.createEl("p", { cls: "lazy-campaign-hint", text: this.secretText });

		const input = textField(this.contentEl, {
			name: "How did they learn it?",
			desc: "Optional — shown as a note in the secrets ledger.",
			placeholder: "Kara recognized the ring",
			onChange: (value) => {
				this.note = value;
			},
		});
		this.registerFirstInput(input);

		this.bindEnterToSubmit(this.contentEl, () => this.handleSubmit());
		this.renderButtons(this.contentEl, {
			ctaText: "Reveal",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async handleSubmit(): Promise<void> {
		await this.onSubmit(this.note.trim());
		this.close();
	}
}
