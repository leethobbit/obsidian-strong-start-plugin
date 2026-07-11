import { Notice } from "obsidian";

/**
 * Await a vault/file operation and surface a failure as a `Notice` instead of
 * an uncaught rejection. Wrap only at UI entry points (command callbacks,
 * modal submit handlers, click handlers) — never inside pure logic or the
 * store, which should let errors propagate to their caller.
 */
export async function tryFileOp<T>(
	op: Promise<T> | (() => Promise<T>),
	userMessage: string
): Promise<T | null> {
	try {
		return await (typeof op === "function" ? op() : op);
	} catch (error) {
		console.error(userMessage, error);
		new Notice(userMessage);
		return null;
	}
}
