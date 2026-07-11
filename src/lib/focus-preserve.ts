// Focus-preserving rebuild helpers for the prep board (AGENTS.md risk #2, M2
// acceptance criterion: the caret must survive an external `processFrontMatter`
// write to the open session note while the user is typing in a step editor).
// DOM-only — no `obsidian` import needed — but it lives beside `self-write.ts`
// as the other half of the pattern and is wired up by `views/prep/prep-panel.ts`.

const DATA_KEY_ATTR = "data-key";

function isEditableElement(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
	return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

/** True if an `<input>`/`<textarea>` inside `el` currently has focus.
 * Uses the element's own document so popout windows work. */
export function isEditingWithin(el: HTMLElement): boolean {
	const active = el.ownerDocument.activeElement;
	if (!active || !el.contains(active)) return false;
	return isEditableElement(active);
}

interface CapturedFocus {
	key: string;
	selectionStart: number | null;
	selectionEnd: number | null;
}

function captureFocus(container: HTMLElement): CapturedFocus | null {
	const active = container.ownerDocument.activeElement;
	if (!isEditableElement(active) || !container.contains(active)) return null;
	const key = active.getAttribute(DATA_KEY_ATTR);
	if (!key) return null;
	return { key, selectionStart: active.selectionStart, selectionEnd: active.selectionEnd };
}

function restoreFocus(container: HTMLElement, captured: CapturedFocus): void {
	const match = container.querySelector(`[${DATA_KEY_ATTR}="${CSS.escape(captured.key)}"]`);
	if (!isEditableElement(match)) return;
	match.focus();
	if (captured.selectionStart !== null && captured.selectionEnd !== null) {
		match.setSelectionRange(captured.selectionStart, captured.selectionEnd);
	}
}

/**
 * Run `rebuild()` against `container`, capturing the focused editor's
 * identity (its `data-key`) and caret/selection before the rebuild and
 * restoring both afterward if an element with the same `data-key` exists in
 * the fresh DOM. Every interactive editor element in the prep board carries a
 * stable `data-key` (step id + row id) so this can find it again.
 */
export function preserveFocus(container: HTMLElement, rebuild: () => void): void {
	const captured = captureFocus(container);
	rebuild();
	if (captured) restoreFocus(container, captured);
}

/**
 * Defers a rebuild while the user is mid-edit inside `container` instead of
 * yanking focus out mid-keystroke: `request()` runs the rebuild immediately
 * when nothing is focused, otherwise marks the queue dirty and the rebuild
 * fires on the next delegated `focusout` from inside `container`, or after a
 * safety interval tick (backstop for a blur that never bubbles here, e.g. the
 * panel being torn down mid-edit).
 */
export class DeferredRebuildQueue {
	private dirty = false;

	constructor(
		private readonly container: HTMLElement,
		private readonly rebuild: () => void,
		private readonly safetyMs = 4000
	) {}

	/** Wire the delegated `focusout` listener and safety interval through the
	 * caller's own `Component` (`registerDomEvent`/`registerInterval`) so
	 * teardown is automatic — this class holds no listeners/timers itself
	 * once `bind` returns them to the caller for registration. */
	bind(registerFocusOut: (el: HTMLElement, cb: (evt: FocusEvent) => void) => void, registerInterval: (id: number) => number): void {
		registerFocusOut(this.container, () => this.flushIfIdle());
		const intervalId = window.setInterval(() => this.flushIfIdle(), this.safetyMs);
		registerInterval(intervalId);
	}

	/** Ask for a rebuild: immediate if nothing is focused, deferred otherwise. */
	request(): void {
		if (isEditingWithin(this.container)) {
			this.dirty = true;
			return;
		}
		this.rebuild();
	}

	private flushIfIdle(): void {
		if (!this.dirty || isEditingWithin(this.container)) return;
		this.dirty = false;
		this.rebuild();
	}
}
