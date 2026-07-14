import { Modal, type App } from "obsidian";

export interface FormModalButtonsOptions {
	ctaText: string;
	onSubmit: () => void | Promise<void>;
	cancelText?: string;
}

/**
 * Base class for single-purpose data-entry modals (create campaign, etc).
 * Subclasses implement `render()` to build fields into `this.contentEl`,
 * calling `registerFirstInput` on the field that should receive initial focus
 * and `renderButtons` once at the end.
 *
 * `Modal` has no `Component` lifecycle (no `registerDomEvent`), so its button
 * row and Enter-to-submit binding use plain `addEventListener` — this is the
 * documented exception to the house "never bare addEventListener" rule: the
 * elements and their listeners are torn down together with `contentEl` on
 * close, there is nothing to leak.
 */
export abstract class FormModal extends Modal {
	private submitting = false;
	private firstInput: HTMLInputElement | HTMLTextAreaElement | null = null;

	constructor(app: App) {
		super(app);
	}

	onOpen(): void {
		this.submitting = false;
		this.contentEl.empty();
		this.contentEl.addClass("strong-start-form-modal");
		this.render();
		this.firstInput?.focus();
		this.firstInput?.select();
	}

	onClose(): void {
		this.contentEl.empty();
		this.firstInput = null;
	}

	/** Build the form's fields and button row. */
	protected abstract render(): void;

	/** Call once, on the field that should be focused + text-selected on open. */
	protected registerFirstInput(input: HTMLInputElement | HTMLTextAreaElement): void {
		if (!this.firstInput) this.firstInput = input;
	}

	/** Enter anywhere in the form submits, once, consuming the event so it
	 * doesn't also insert a newline or fire a second handler. Shift+Enter is
	 * left alone for any future multi-line field. */
	protected bindEnterToSubmit(el: HTMLElement, onSubmit: () => void | Promise<void>): void {
		el.addEventListener("keydown", (evt: KeyboardEvent) => {
			// IME users press Enter to confirm a composition candidate —
			// that must never submit the form mid-word.
			if (evt.isComposing) return;
			if (evt.key !== "Enter" || evt.shiftKey) return;
			evt.preventDefault();
			void this.submit(onSubmit);
		});
	}

	/** Idempotent submit guard: a second Enter/click while a submit is still
	 * in flight (e.g. a slow vault write) is a no-op rather than a double-fire. */
	protected async submit(onSubmit: () => void | Promise<void>): Promise<void> {
		if (this.submitting) return;
		this.submitting = true;
		try {
			await onSubmit();
		} finally {
			this.submitting = false;
		}
	}

	/** CTA + cancel button row. */
	protected renderButtons(contentEl: HTMLElement, options: FormModalButtonsOptions): void {
		const row = contentEl.createDiv({ cls: "strong-start-form-modal-buttons" });
		const cancel = row.createEl("button", { text: options.cancelText ?? "Cancel" });
		cancel.addEventListener("click", () => this.close());
		const cta = row.createEl("button", { text: options.ctaText, cls: "mod-cta" });
		cta.addEventListener("click", () => void this.submit(options.onSubmit));
	}
}
