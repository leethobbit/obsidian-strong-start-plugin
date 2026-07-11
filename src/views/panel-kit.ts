import type { Component } from "obsidian";

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
