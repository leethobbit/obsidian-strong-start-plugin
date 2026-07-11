import { describe, expect, it } from "vitest";
import { STEPS, stepById } from "../src/sessions/steps";

const FROZEN_IDS = [
	"characters",
	"strong-start",
	"scenes",
	"secrets",
	"locations",
	"npcs",
	"monsters",
	"rewards",
] as const;

describe("STEPS", () => {
	it("has exactly the eight frozen step ids, in order", () => {
		expect(STEPS.map((s) => s.id)).toEqual(FROZEN_IDS);
	});

	it("numbers steps 1 through 8 in order", () => {
		expect(STEPS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});

	it("gives every section/list-section step a section heading", () => {
		for (const step of STEPS) {
			if (step.storage === "section" || step.storage === "list-section") {
				expect(step.sectionHeading).toBeTruthy();
			}
		}
	});

	it("gives every links step an fm key matching its id", () => {
		const linkSteps = STEPS.filter((s) => s.storage === "links");
		expect(linkSteps.map((s) => s.fmKey)).toEqual(["locations", "npcs", "monsters"]);
	});

	it("stores nothing frontmatter-side for the roster step", () => {
		const characters = stepById("characters");
		expect(characters?.storage).toBe("roster");
		expect(characters?.fmKey).toBeUndefined();
		expect(characters?.sectionHeading).toBeUndefined();
	});
});

describe("stepById", () => {
	it("finds a step by its frozen id", () => {
		expect(stepById("secrets")?.label).toBe("Define secrets and clues");
	});

	it("returns undefined for an unknown id", () => {
		expect(stepById("nope")).toBeUndefined();
	});
});
