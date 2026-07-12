import { describe, expect, it } from "vitest";
import {
	SESSION_ZERO_CHECKLIST,
	SESSION_ZERO_GROUPS,
	checklistItemsInGroup,
	SAFETY_SENSITIVE_TOPICS_COPY,
	SAFETY_LINES_VEILS_COPY,
	SAFETY_PAUSE_COPY,
	SAFETY_ANONYMOUS_REMINDER,
} from "../src/content/session-zero";

describe("session zero checklist content", () => {
	it("has unique, non-empty ids", () => {
		const ids = SESSION_ZERO_CHECKLIST.map((item) => item.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id.length).toBeGreaterThan(0);
	});

	it("every item has a non-empty label and detail", () => {
		for (const item of SESSION_ZERO_CHECKLIST) {
			expect(item.label.trim().length, item.id).toBeGreaterThan(0);
			expect(item.detail.trim().length, item.id).toBeGreaterThan(0);
		}
	});

	it("keeps every card's detail under ~80 words (guidance, not a table)", () => {
		for (const item of SESSION_ZERO_CHECKLIST) {
			expect(item.detail.split(/\s+/).length, item.id).toBeLessThanOrEqual(80);
		}
	});

	it("every item belongs to a declared group, and every declared group covers at least one item", () => {
		const groupIds = new Set(SESSION_ZERO_GROUPS.map((g) => g.id));
		for (const item of SESSION_ZERO_CHECKLIST) expect(groupIds.has(item.group)).toBe(true);
		for (const group of SESSION_ZERO_GROUPS) expect(checklistItemsInGroup(group.id).length, group.id).toBeGreaterThan(0);
	});

	it("groups partition the checklist with no overlap and no gaps", () => {
		const total = SESSION_ZERO_GROUPS.reduce((sum, group) => sum + checklistItemsInGroup(group.id).length, 0);
		expect(total).toBe(SESSION_ZERO_CHECKLIST.length);
	});
});

describe("safety tools reference copy", () => {
	it("is non-empty and reasonably short (reference cards, not the full doc)", () => {
		for (const copy of [SAFETY_SENSITIVE_TOPICS_COPY, SAFETY_LINES_VEILS_COPY, SAFETY_PAUSE_COPY, SAFETY_ANONYMOUS_REMINDER]) {
			expect(copy.trim().length).toBeGreaterThan(0);
			expect(copy.split(/\s+/).length).toBeLessThanOrEqual(80);
		}
	});
});
