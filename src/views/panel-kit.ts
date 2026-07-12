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

/**
 * A labeled, chevron-toggled collapsible section, its collapsed state tracked
 * in `state` under `key`. `buildBody` runs once, immediately — the body
 * element is only hidden/shown via a CSS class on toggle, never rebuilt, so
 * callers can safely hold onto references into it.
 */
export function renderCollapsibleSection(
	container: HTMLElement,
	owner: Component,
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
