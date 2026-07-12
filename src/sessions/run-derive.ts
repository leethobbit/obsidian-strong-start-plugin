// Pure — no `obsidian` import. Tallies for run mode's End-session modal
// (docs/plan.md M6): scenes done/total, secrets revealed/total, and how many
// unrevealed secrets will carry forward once this session ends.

import type { TaskRow } from "./bullet-list";
import type { SessionModel } from "./types";

export interface RunTallies {
	scenesDone: number;
	scenesTotal: number;
	secretsRevealed: number;
	secretsTotal: number;
	/** Active (non-archived), unrevealed secrets — exactly what `carryForward`
	 * (carryover.ts) would pick up from this session once it becomes a "prior"
	 * session for the next one (SCHEMA.md carry-over semantics). */
	carryCount: number;
}

export function deriveRunTallies(session: SessionModel, sceneRows: readonly TaskRow[]): RunTallies {
	const scenesDone = sceneRows.filter((row) => row.done).length;
	const activeSecrets = session.secrets.filter((secret) => !secret.archived);
	const secretsRevealed = activeSecrets.filter((secret) => secret.revealed === true).length;

	return {
		scenesDone,
		scenesTotal: sceneRows.length,
		secretsRevealed,
		secretsTotal: activeSecrets.length,
		carryCount: activeSecrets.length - secretsRevealed,
	};
}
