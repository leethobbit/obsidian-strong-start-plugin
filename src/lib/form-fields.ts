import { Setting } from "obsidian";

export interface TextFieldOptions {
	name: string;
	desc?: string;
	placeholder?: string;
	value?: string;
	onChange: (value: string) => void;
}

/**
 * A single-line labelled text field, built on `Setting` so it matches
 * Obsidian's native form chrome inside a modal body. Returns the underlying
 * `<input>` so callers can wire autofocus / Enter-to-submit (see `form-modal.ts`).
 */
export function textField(containerEl: HTMLElement, options: TextFieldOptions): HTMLInputElement {
	// Definite assignment: `addText`'s callback runs synchronously.
	let inputEl!: HTMLInputElement;
	const setting = new Setting(containerEl).setName(options.name);
	if (options.desc) setting.setDesc(options.desc);
	setting.addText((text) => {
		if (options.placeholder) text.setPlaceholder(options.placeholder);
		if (options.value) text.setValue(options.value);
		text.onChange(options.onChange);
		inputEl = text.inputEl;
	});
	return inputEl;
}
