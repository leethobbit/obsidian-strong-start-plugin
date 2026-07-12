import { describe, expect, it } from "vitest";
import { blankFront, frontFromWizardInput, parseFronts, renderFronts, toggleFrontPortent, type Front } from "../src/campaigns/fronts";

const TWO_FRONTS = [
	"### Thieves' guild",
	"Control every dock in the city",
	"- [ ] A warehouse burns under suspicious circumstances",
	"- [x] A councilor is caught with stolen goods",
	"- [ ] The guildmaster's mask is glimpsed at a murder scene",
	"**Doom:** The guild seizes the harbor watch outright.",
	"",
	"### Dark necromancer",
	"Raise an army from the old battlefield",
	"- [ ] Graves nearby are found disturbed",
	"- [ ] A village goes silent overnight",
	"- [ ] Refugees speak of the walking dead",
	"**Doom:** The dead outnumber the living for a mile around.",
].join("\n");

describe("parseFronts", () => {
	it("parses multiple fronts with goal/portents/doom", () => {
		const fronts = parseFronts(TWO_FRONTS);
		expect(fronts).toHaveLength(2);
		expect(fronts[0]).toEqual<Front>({
			name: "Thieves' guild",
			goal: "Control every dock in the city",
			portents: [
				{ text: "A warehouse burns under suspicious circumstances", done: false },
				{ text: "A councilor is caught with stolen goods", done: true },
				{ text: "The guildmaster's mask is glimpsed at a murder scene", done: false },
			],
			doom: "The guild seizes the harbor watch outright.",
			extra: [],
		});
		expect(fronts[1].name).toBe("Dark necromancer");
		expect(fronts[1].portents).toHaveLength(3);
	});

	it("tolerates a missing goal and missing doom line", () => {
		const fronts = parseFronts(["### Rival adventurers", "- [ ] They beat the party to a job"].join("\n"));
		expect(fronts).toHaveLength(1);
		expect(fronts[0].goal).toBe("");
		expect(fronts[0].doom).toBe("");
		expect(fronts[0].portents).toEqual([{ text: "They beat the party to a job", done: false }]);
	});

	it("preserves hand-added prose as `extra` lines", () => {
		const fronts = parseFronts(
			["### Mages' guild", "Monopolize arcane research", "Notes: they've gone quiet since session 3.", "- [ ] A rival school opens nearby"].join(
				"\n"
			)
		);
		expect(fronts[0].goal).toBe("Monopolize arcane research");
		expect(fronts[0].extra).toEqual(["Notes: they've gone quiet since session 3."]);
	});

	it("returns an empty array for an empty section", () => {
		expect(parseFronts("")).toEqual([]);
	});

	it("gives a front with no body content at all an empty goal/doom and no portents", () => {
		const fronts = parseFronts("### Undead prince");
		expect(fronts).toEqual<Front[]>([{ name: "Undead prince", goal: "", portents: [], doom: "", extra: [] }]);
	});
});

describe("renderFronts", () => {
	it("round-trips parse(render(fronts))", () => {
		const fronts = parseFronts(TWO_FRONTS);
		const rendered = renderFronts(fronts);
		expect(parseFronts(rendered)).toEqual(fronts);
	});

	it("omits the goal line when empty and the doom line when empty", () => {
		const front: Front = { name: "Rival adventurers", goal: "", portents: [], doom: "", extra: [] };
		expect(renderFronts([front])).toBe("### Rival adventurers");
	});

	it("drops empty-text portents", () => {
		const front: Front = {
			name: "Rival adventurers",
			goal: "",
			portents: [
				{ text: "Real portent", done: false },
				{ text: "  ", done: false },
			],
			doom: "",
			extra: [],
		};
		expect(renderFronts([front])).toBe("### Rival adventurers\n- [ ] Real portent");
	});

	it("joins multiple fronts with a blank line", () => {
		const a: Front = { name: "A", goal: "", portents: [], doom: "", extra: [] };
		const b: Front = { name: "B", goal: "", portents: [], doom: "", extra: [] };
		expect(renderFronts([a, b])).toBe("### A\n\n### B");
	});
});

describe("toggleFrontPortent", () => {
	it("flips exactly one portent's checkbox and leaves every other byte untouched", () => {
		const toggled = toggleFrontPortent(TWO_FRONTS, 0, 0);
		const lines = toggled.split("\n");
		expect(lines[2]).toBe("- [x] A warehouse burns under suspicious circumstances");
		// Every other line is byte-identical to the input.
		const original = TWO_FRONTS.split("\n");
		for (let i = 0; i < lines.length; i++) {
			if (i === 2) continue;
			expect(lines[i]).toBe(original[i]);
		}
	});

	it("un-checks an already-checked portent", () => {
		const toggled = toggleFrontPortent(TWO_FRONTS, 0, 1);
		expect(toggled.split("\n")[3]).toBe("- [ ] A councilor is caught with stolen goods");
	});

	it("targets the correct front by index, not just the first checkbox found", () => {
		const toggled = toggleFrontPortent(TWO_FRONTS, 1, 0);
		const lines = toggled.split("\n");
		expect(lines[9]).toBe("- [x] Graves nearby are found disturbed");
		// The first front's own portents are untouched.
		expect(lines[2]).toBe("- [ ] A warehouse burns under suspicious circumstances");
		expect(lines[3]).toBe("- [x] A councilor is caught with stolen goods");
	});

	it("preserves hand-added prose byte-for-byte when toggling", () => {
		const content = [
			"### Mages' guild",
			"Monopolize arcane research",
			"Notes: they've gone quiet since session 3.",
			"- [ ] A rival school opens nearby",
			"- [x] An apprentice defects with a forbidden tome",
		].join("\n");
		const toggled = toggleFrontPortent(content, 0, 0);
		expect(toggled).toBe(
			[
				"### Mages' guild",
				"Monopolize arcane research",
				"Notes: they've gone quiet since session 3.",
				"- [x] A rival school opens nearby",
				"- [x] An apprentice defects with a forbidden tome",
			].join("\n")
		);
	});

	it("no-ops when the indices don't resolve to a real checkbox", () => {
		expect(toggleFrontPortent(TWO_FRONTS, 5, 0)).toBe(TWO_FRONTS);
		expect(toggleFrontPortent(TWO_FRONTS, 0, 99)).toBe(TWO_FRONTS);
	});
});

describe("frontFromWizardInput", () => {
	it("trims fields and drops empty portent slots", () => {
		const front = frontFromWizardInput({
			name: "  Dark necromancer  ",
			goal: " Raise an army ",
			portents: ["First sign", "  ", ""],
			doom: " The dead rise. ",
		});
		expect(front).toEqual<Front>({
			name: "Dark necromancer",
			goal: "Raise an army",
			portents: [{ text: "First sign", done: false }],
			doom: "The dead rise.",
			extra: [],
		});
	});
});

describe("blankFront", () => {
	it("is a fully empty front", () => {
		expect(blankFront()).toEqual<Front>({ name: "New front", goal: "", portents: [], doom: "", extra: [] });
	});
});
