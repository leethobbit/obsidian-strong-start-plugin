import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginSelfWrite, isSelfWrite } from "../src/lib/self-write";

const PATH = "Campaigns/Test/Session 1.md";

describe("self-write marks", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		// Drain any leftover mark so tests stay independent.
		vi.advanceTimersByTime(60_000);
		isSelfWrite(PATH);
		vi.useRealTimers();
	});

	it("is not a self-write before any mark", () => {
		expect(isSelfWrite(PATH)).toBe(false);
	});

	it("marks the path while a write is in flight", () => {
		const done = beginSelfWrite(PATH);
		expect(isSelfWrite(PATH)).toBe(true);
		done();
	});

	it("keeps the mark through the post-done grace tail — the cache echo lands after the write settles", () => {
		const done = beginSelfWrite(PATH);
		done();
		expect(isSelfWrite(PATH)).toBe(true);
		vi.advanceTimersByTime(500);
		expect(isSelfWrite(PATH)).toBe(true);
	});

	it("releases the mark once the post-done tail elapses", () => {
		const done = beginSelfWrite(PATH);
		done();
		vi.advanceTimersByTime(2_000);
		expect(isSelfWrite(PATH)).toBe(false);
	});

	it("expires a hung write instead of suppressing external edits forever", () => {
		beginSelfWrite(PATH); // never calls done()
		vi.advanceTimersByTime(5_000);
		expect(isSelfWrite(PATH)).toBe(false);
	});

	it("one write's done() never releases an overlapping write's mark", () => {
		const doneA = beginSelfWrite(PATH);
		const doneB = beginSelfWrite(PATH);
		doneA();
		vi.advanceTimersByTime(1_000); // past A's tail, B still in flight
		expect(isSelfWrite(PATH)).toBe(true);
		doneB();
		expect(isSelfWrite(PATH)).toBe(true); // B's own tail
		vi.advanceTimersByTime(2_000);
		expect(isSelfWrite(PATH)).toBe(false);
	});

	it("tolerates a double done() without corrupting the in-flight count", () => {
		const doneA = beginSelfWrite(PATH);
		const doneB = beginSelfWrite(PATH);
		doneA();
		doneA(); // double release must not decrement B away
		vi.advanceTimersByTime(1_000);
		expect(isSelfWrite(PATH)).toBe(true); // B in flight
		doneB();
		vi.advanceTimersByTime(2_000);
		expect(isSelfWrite(PATH)).toBe(false);
	});

	it("marks are per-path", () => {
		const done = beginSelfWrite(PATH);
		expect(isSelfWrite("Other/Note.md")).toBe(false);
		done();
	});
});
