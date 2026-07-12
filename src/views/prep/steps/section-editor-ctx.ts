import type { SectionEditorCtx } from "./list-section-editor";
import type { StepContext } from "../step-context";

/** Adapts a prep step's full `StepContext` down to the narrower
 * `SectionEditorCtx` shape `list-section-editor.ts` actually needs — the same
 * editor is reused by the Foundation sub-tab, which has no `StepContext`
 * (campaign notes, not sessions) but builds an equivalent object directly. */
export function sectionEditorCtxFrom(ctx: StepContext): SectionEditorCtx {
	return {
		registerDomEvent: ctx.registerDomEvent,
		registerDebounce: ctx.registerDebounce,
		writeSection: ctx.writeSection,
		openNote: ctx.openNote,
		notePath: ctx.session.path,
	};
}
