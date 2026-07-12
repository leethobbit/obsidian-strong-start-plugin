import type { App } from "obsidian";
import { FormModal } from "../../lib/form-modal";
import type { RunTallies } from "../../sessions/run-derive";

export interface EndSessionModalOptions {
	tallies: RunTallies;
	/** The session number that would come next — for the carry-forward notice. */
	nextSessionNumber: number;
	/** Called with the (possibly empty) recap text and the (possibly empty)
	 * stars/wishes answers on "End session". */
	onSubmit: (recapText: string, stars: string, wishes: string) => void | Promise<void>;
}

/**
 * The end-session flow (docs/plan.md M6): tallies, an optional "what
 * happened?" recap, and a carry-forward notice. "Keep running" is just the
 * base modal's cancel button relabeled — closing without ending is always
 * safe (docs/plan.md: "Closing without ending is safe").
 */
export class EndSessionModal extends FormModal {
	private recap = "";
	private stars = "";
	private wishes = "";

	constructor(
		app: App,
		private readonly options: EndSessionModalOptions
	) {
		super(app);
	}

	protected render(): void {
		this.setTitle("End session");
		const t = this.options.tallies;

		this.contentEl.createEl("p", {
			cls: "lazy-campaign-hint",
			text: `${t.scenesDone} of ${t.scenesTotal} scenes played · ${t.secretsRevealed} secret${
				t.secretsRevealed === 1 ? "" : "s"
			} revealed`,
		});

		const textarea = this.contentEl.createEl("textarea", {
			cls: "lazy-campaign-end-session-textarea",
			attr: { rows: "5", placeholder: "What happened? Leave blank to skip the recap." },
		});
		// Bare `addEventListener` here mirrors `form-modal.ts`'s documented
		// exception: this element and its listener are torn down together with
		// `contentEl` on close, so there's nothing to leak.
		textarea.addEventListener("input", () => {
			this.recap = textarea.value;
		});
		this.registerFirstInput(textarea);

		// Stars and wishes (docs/plan.md M16, doc: "Stars and Wishes") — two
		// optional prompts asked while the table's reactions are still fresh.
		// Same bare-listener exception as the recap textarea above.
		const starsInput = this.contentEl.createEl("textarea", {
			cls: "lazy-campaign-end-session-textarea lazy-campaign-end-session-feedback",
			attr: { rows: "2", placeholder: "Stars — what did the players enjoy? Leave blank to skip." },
		});
		starsInput.addEventListener("input", () => {
			this.stars = starsInput.value;
		});
		const wishesInput = this.contentEl.createEl("textarea", {
			cls: "lazy-campaign-end-session-textarea lazy-campaign-end-session-feedback",
			attr: { rows: "2", placeholder: "Wishes — what do they want more of? Leave blank to skip." },
		});
		wishesInput.addEventListener("input", () => {
			this.wishes = wishesInput.value;
		});

		if (t.carryCount > 0) {
			this.contentEl.createEl("p", {
				cls: "lazy-campaign-hint",
				text: `${t.carryCount} unrevealed secret${t.carryCount === 1 ? "" : "s"} will carry to session ${
					this.options.nextSessionNumber
				}.`,
			});
		}

		// No Enter-to-submit here (unlike other form modals): the recap is
		// multi-line prose and an accidental Enter must never end the session.
		this.renderButtons(this.contentEl, {
			ctaText: "End session",
			cancelText: "Keep running",
			onSubmit: () => this.handleSubmit(),
		});
	}

	private async handleSubmit(): Promise<void> {
		await this.options.onSubmit(this.recap.trim(), this.stars.trim(), this.wishes.trim());
		this.close();
	}
}
