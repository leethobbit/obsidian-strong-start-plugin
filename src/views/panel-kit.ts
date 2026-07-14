import { setIcon, type Component } from "obsidian";

/** A single muted line for a quiet empty state. */
export function renderEmptyState(el: HTMLElement, text: string): void {
	el.createDiv({ cls: "lazy-campaign-empty-state", text });
}

export interface EmptyStateActionOptions {
	title: string;
	body: string;
	ctaText: string;
	onCta: () => void;
	secondaryText?: string;
	onSecondary?: () => void;
}

/**
 * Centered empty-state box with a primary CTA and an optional secondary
 * action. `owner` registers the button listeners via `registerDomEvent` so
 * they're torn down with the owning view/panel component — house rule, never
 * bare `addEventListener`.
 */
export function renderEmptyStateAction(el: HTMLElement, owner: Component, options: EmptyStateActionOptions): void {
	const box = el.createDiv({ cls: "lazy-campaign-empty-state-action" });
	box.createEl("p", { cls: "lazy-campaign-empty-state-title", text: options.title });
	box.createEl("p", { cls: "lazy-campaign-empty-state-body", text: options.body });

	const buttons = box.createDiv({ cls: "lazy-campaign-empty-state-buttons" });
	const cta = buttons.createEl("button", { cls: "mod-cta", text: options.ctaText });
	owner.registerDomEvent(cta, "click", () => options.onCta());

	const onSecondary = options.onSecondary;
	if (options.secondaryText && onSecondary) {
		const secondary = buttons.createEl("button", { text: options.secondaryText });
		owner.registerDomEvent(secondary, "click", () => onSecondary());
	}
}

/**
 * Per-key collapsed/expanded state for a panel's collapsible sections, held
 * by the owning panel instance across re-renders. In-memory only — never
 * persisted to `data.json` (AGENTS.md: that's for settings/UI navigation
 * state, not per-note scratch state). Defaults every key to expanded.
 */
export class SectionState {
	private readonly collapsedKeys = new Set<string>();

	isCollapsed(key: string): boolean {
		return this.collapsedKeys.has(key);
	}

	toggle(key: string): void {
		if (this.collapsedKeys.has(key)) this.collapsedKeys.delete(key);
		else this.collapsedKeys.add(key);
	}
}

/** The slice of `Component`'s API `renderStepper` needs — deliberately
 * narrower than `Component` itself so `step-context.ts`'s `StepContext`
 * (which exposes `registerDomEvent` but isn't a `Component`) can be passed
 * here too, alongside a real view/panel `Component`. */
export interface DomEventOwner {
	registerDomEvent<K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		cb: (evt: HTMLElementEventMap[K]) => void
	): void;
}

export interface StepperOptions {
	value: number;
	min: number;
	max: number;
	/** Accessible label for the +/- buttons, e.g. "character level". */
	label: string;
	onChange: (next: number) => void;
}

/**
 * A minus/value/plus stepper (roster-row level edits, M10's manual
 * party-size/level override) — deliberately buttons, not a raw number
 * `<input>`, so every change is a single, unambiguous click rather than a
 * partially-typed intermediate value. Callers own re-rendering the value
 * (this returns the value span so a caller that owns the surrounding row can
 * update its text directly without a full rebuild, matching `chip-editor.ts`'s
 * local-redraw pattern).
 */
export function renderStepper(container: HTMLElement, owner: DomEventOwner, options: StepperOptions): HTMLElement {
	const wrap = container.createDiv({ cls: "lazy-campaign-stepper" });

	const minusBtn = wrap.createEl("button", {
		cls: "lazy-campaign-stepper-btn",
		text: "−",
		attr: { type: "button", "aria-label": `Decrease ${options.label}` },
	});
	const valueEl = wrap.createSpan({ cls: "lazy-campaign-stepper-value", text: String(options.value) });
	const plusBtn = wrap.createEl("button", {
		cls: "lazy-campaign-stepper-btn",
		text: "+",
		attr: { type: "button", "aria-label": `Increase ${options.label}` },
	});

	owner.registerDomEvent(minusBtn, "click", () => {
		const next = Math.max(options.min, options.value - 1);
		if (next !== options.value) options.onChange(next);
	});
	owner.registerDomEvent(plusBtn, "click", () => {
		const next = Math.min(options.max, options.value + 1);
		if (next !== options.value) options.onChange(next);
	});

	return valueEl;
}

/**
 * A labeled, chevron-toggled collapsible section, its collapsed state tracked
 * in `state` under `key`. `buildBody` runs once, immediately — the body
 * element is only hidden/shown via a CSS class on toggle, never rebuilt, so
 * callers can safely hold onto references into it.
 */
export function renderCollapsibleSection(
	container: HTMLElement,
	owner: DomEventOwner,
	state: SectionState,
	key: string,
	label: string,
	buildBody: (bodyEl: HTMLElement) => void
): void {
	const collapsed = state.isCollapsed(key);
	const section = container.createDiv({ cls: "lazy-campaign-collapsible" });
	const header = section.createEl("button", {
		cls: "lazy-campaign-collapsible-header",
		attr: { type: "button", "aria-expanded": collapsed ? "false" : "true" },
	});
	const chevron = header.createSpan({ cls: "lazy-campaign-collapsible-chevron" });
	setIcon(chevron, collapsed ? "chevron-right" : "chevron-down");
	header.createSpan({ cls: "lazy-campaign-collapsible-label", text: label });

	const body = section.createDiv({ cls: "lazy-campaign-collapsible-body" });
	body.toggleClass("is-hidden", collapsed);
	buildBody(body);

	owner.registerDomEvent(header, "click", () => {
		state.toggle(key);
		const nowCollapsed = state.isCollapsed(key);
		body.toggleClass("is-hidden", nowCollapsed);
		setIcon(chevron, nowCollapsed ? "chevron-right" : "chevron-down");
		header.setAttribute("aria-expanded", nowCollapsed ? "false" : "true");
	});
}
