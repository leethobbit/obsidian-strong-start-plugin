import { describe, expect, it } from "vitest";
import {
	addSecret,
	archiveSecret,
	deleteSecretSafely,
	editSecretText,
	removeSecret,
	restoreSecret,
	revealSecret,
	unrevealSecret,
} from "../src/sessions/secrets-ops";
import { writeSessionFm } from "../src/sessions/session-schema";
import type { Secret } from "../src/sessions/types";

describe("addSecret", () => {
	it("appends a new secret with no state flags", () => {
		const result = addSecret([], "s-1", "The mayor is a doppelganger.");
		expect(result).toEqual([{ id: "s-1", text: "The mayor is a doppelganger." }]);
	});

	it("does not mutate the input array", () => {
		const original: Secret[] = [];
		addSecret(original, "s-1", "text");
		expect(original).toEqual([]);
	});
});

describe("editSecretText", () => {
	it("updates only the matching secret's text", () => {
		const secrets: Secret[] = [
			{ id: "s-1", text: "old" },
			{ id: "s-2", text: "untouched" },
		];
		expect(editSecretText(secrets, "s-1", "new")).toEqual([
			{ id: "s-1", text: "new" },
			{ id: "s-2", text: "untouched" },
		]);
	});

	it("preserves existing state flags on the edited secret", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "old", revealed: true, note: "Kara noticed the ring" }];
		expect(editSecretText(secrets, "s-1", "new")).toEqual([
			{ id: "s-1", text: "new", revealed: true, note: "Kara noticed the ring" },
		]);
	});

	it("is a no-op for an unknown id", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "old" }];
		expect(editSecretText(secrets, "s-nope", "new")).toEqual(secrets);
	});
});

describe("removeSecret", () => {
	it("removes only the matching secret", () => {
		const secrets: Secret[] = [
			{ id: "s-1", text: "keep" },
			{ id: "s-2", text: "remove" },
		];
		expect(removeSecret(secrets, "s-2")).toEqual([{ id: "s-1", text: "keep" }]);
	});
});

describe("archiveSecret", () => {
	it("tombstones only the matching secret, leaving its text untouched", () => {
		const secrets: Secret[] = [
			{ id: "s-1", text: "keep" },
			{ id: "s-2", text: "tombstone me" },
		];
		expect(archiveSecret(secrets, "s-2")).toEqual([
			{ id: "s-1", text: "keep" },
			{ id: "s-2", text: "tombstone me", archived: true },
		]);
	});
});

describe("restoreSecret", () => {
	it("strips `archived` back off, leaving other fields alone", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x", archived: true }];
		expect(restoreSecret(secrets, "s-1")).toEqual([{ id: "s-1", text: "x" }]);
	});

	it("is a no-op for an id that isn't archived", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x" }];
		expect(restoreSecret(secrets, "s-1")).toEqual(secrets);
	});
});

describe("revealSecret", () => {
	it("marks revealed and captures an optional note", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x" }];
		expect(revealSecret(secrets, "s-1", "Kara recognized the ring")).toEqual([
			{ id: "s-1", text: "x", revealed: true, note: "Kara recognized the ring" },
		]);
	});

	it("treats a blank note as no note, and preserves an existing one", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x", note: "existing note" }];
		expect(revealSecret(secrets, "s-1", "   ")).toEqual([{ id: "s-1", text: "x", revealed: true, note: "existing note" }]);
	});
});

describe("unrevealSecret", () => {
	it("strips `revealed` back off, leaving other fields (including note) alone", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x", revealed: true, note: "Kara noticed" }];
		expect(unrevealSecret(secrets, "s-1")).toEqual([{ id: "s-1", text: "x", note: "Kara noticed" }]);
	});

	it("is a no-op for an id that isn't revealed", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x" }];
		expect(unrevealSecret(secrets, "s-1")).toEqual(secrets);
	});
});

describe("deleteSecretSafely", () => {
	it("hard-removes the row when hard delete is allowed", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x" }];
		expect(deleteSecretSafely(secrets, "s-1", true)).toEqual([]);
	});

	it("tombstones the row instead of removing it when hard delete is not allowed", () => {
		const secrets: Secret[] = [{ id: "s-1", text: "x" }];
		expect(deleteSecretSafely(secrets, "s-1", false)).toEqual([{ id: "s-1", text: "x", archived: true }]);
	});
});

describe("secrets CRUD through the codec", () => {
	it("emits canonical output after add/edit/remove", () => {
		let secrets: Secret[] = [];
		secrets = addSecret(secrets, "s-1", "first secret");
		secrets = addSecret(secrets, "s-2", "second secret");
		secrets = editSecretText(secrets, "s-1", "first secret, edited");
		secrets = removeSecret(secrets, "s-2");

		const fm = writeSessionFm({
			campaign: "[[Greenhollow]]",
			session: 1,
			date: "2026-07-18",
			status: "prep",
			stepsDone: [],
			secrets,
			npcs: [],
			locations: [],
			monsters: [],
		});

		expect(fm.secrets).toEqual([{ id: "s-1", text: "first secret, edited", revealed: false, note: "", archived: false }]);
	});
});
