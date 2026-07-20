// Pure — no `obsidian` import. Parse/render for the `## Fronts` managed body
// section (SCHEMA.md: one `### <Front>` per front — a goal line, `- [ ]` grim
// portents, a doom line). `sections.ts` only knows how to replace a whole H2
// section, so everything below the `## Fronts` heading is this module's
// concern; it tolerates hand-edited extra prose per front (preserved
// verbatim, appended back after the doom line on any full render) and never
// invents formatting the GM didn't write.
//
// Toggling a single portent (`toggleFrontPortent`) deliberately does NOT go
// through parse-then-render: it flips exactly one `[ ]`/`[x]` character in
// place on the raw section text, so every other byte — hand-added prose,
// spacing, a front the parser doesn't fully understand — survives untouched.

export interface FrontPortent {
	text: string;
	done: boolean;
}

export interface Front {
	name: string;
	/** First non-blank, non-portent, non-doom line under the heading. Empty
	 * string if the front has no goal line yet. */
	goal: string;
	portents: FrontPortent[];
	/** Content of a `**Doom:** ...` line, empty string if absent. */
	doom: string;
	/** Any other non-blank lines in this front's block, in original order —
	 * hand-added prose the parser doesn't have a slot for. Preserved verbatim
	 * on render so a full re-render (add/remove/edit-name front) never drops
	 * a GM's notes. */
	extra: string[];
}

const FRONT_HEADING_RE = /^###[ \t]+(.+?)[ \t]*$/;
const TASK_BULLET_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;
const DOOM_RE = /^\*\*Doom:\*\*\s*(.*)$/i;
const CHECKBOX_RE = /\[([ xX])\]/;

/** Parse the raw content of a `## Fronts` section into a model. Fronts with
 * no recognizable content are simply empty (`goal: ""`, no portents) rather
 * than dropped — an empty front card still renders in the Foundation panel. */
export function parseFronts(sectionContent: string): Front[] {
	const fronts: Front[] = [];
	let current: Front | null = null;

	for (const line of sectionContent.split("\n")) {
		const heading = FRONT_HEADING_RE.exec(line);
		if (heading) {
			current = { name: heading[1].trim(), goal: "", portents: [], doom: "", extra: [] };
			fronts.push(current);
			continue;
		}
		if (!current) continue; // stray content before the first `###` — ignore.
		if (line.trim().length === 0) continue;

		const task = TASK_BULLET_RE.exec(line);
		if (task) {
			current.portents.push({ text: task[2].trim(), done: task[1].toLowerCase() === "x" });
			continue;
		}

		const doom = DOOM_RE.exec(line.trim());
		if (doom) {
			// First doom line wins the model slot; a hand-added second one is
			// preserved verbatim in `extra` instead of silently replacing it
			// (a full render would otherwise drop one of them).
			if (current.doom.length === 0) current.doom = doom[1].trim();
			else current.extra.push(line.trim());
			continue;
		}

		if (current.goal.length === 0) {
			current.goal = line.trim();
			continue;
		}

		current.extra.push(line.trim());
	}

	return fronts;
}

/** Render a fronts model back to `## Fronts` section content. Used for
 * anything that changes a front's shape (add/remove front, edit name/goal/
 * doom, add/remove a portent) — never used for a portent-done toggle, which
 * goes through `toggleFrontPortent` instead to stay byte-preserving. */
export function renderFronts(fronts: readonly Front[]): string {
	const blocks = fronts.map((front) => {
		const lines: string[] = [`### ${front.name || "Untitled front"}`];
		if (front.goal.trim().length > 0) lines.push(front.goal.trim());
		for (const portent of front.portents) {
			if (portent.text.trim().length === 0) continue;
			lines.push(`- [${portent.done ? "x" : " "}] ${portent.text.trim()}`);
		}
		if (front.doom.trim().length > 0) lines.push(`**Doom:** ${front.doom.trim()}`);
		for (const extra of front.extra) {
			if (extra.trim().length > 0) lines.push(extra.trim());
		}
		return lines.join("\n");
	});
	return blocks.join("\n\n");
}

/**
 * Flip exactly one portent's `[ ]`/`[x]` checkbox in place, leaving every
 * other byte of `sectionContent` untouched — including hand-added prose the
 * parser doesn't model, and any front the parser only partially understands.
 * No-ops (returns the input unchanged) if the indices don't resolve to a real
 * checkbox line.
 */
export function toggleFrontPortent(sectionContent: string, frontIndex: number, portentIndex: number): string {
	const lines = sectionContent.split("\n");
	let currentFront = -1;
	let currentPortent = -1;

	for (let i = 0; i < lines.length; i++) {
		if (FRONT_HEADING_RE.test(lines[i])) {
			currentFront++;
			currentPortent = -1;
			continue;
		}
		if (currentFront !== frontIndex) continue;
		if (!TASK_BULLET_RE.test(lines[i])) continue;

		currentPortent++;
		if (currentPortent !== portentIndex) continue;

		lines[i] = lines[i].replace(CHECKBOX_RE, (_match, box: string) => `[${box.trim().length === 0 ? "x" : " "}]`);
		return lines.join("\n");
	}

	return sectionContent;
}

/** Input shape for a front freshly authored in the campaign creation wizard —
 * all portents start unchecked, no hand-added prose yet. */
export interface WizardFrontInput {
	name: string;
	goal: string;
	portents: readonly string[];
	doom: string;
}

export function frontFromWizardInput(input: WizardFrontInput): Front {
	return {
		name: input.name.trim(),
		goal: input.goal.trim(),
		portents: input.portents
			.map((text) => text.trim())
			.filter((text) => text.length > 0)
			.map((text) => ({ text, done: false })),
		doom: input.doom.trim(),
		extra: [],
	};
}

/** A blank front for "Add front" — three empty portent slots, matching the
 * wizard/Foundation's fixed three-portent card shape. */
export function blankFront(): Front {
	return { name: "New front", goal: "", portents: [], doom: "", extra: [] };
}
