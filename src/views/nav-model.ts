// Pure — no `obsidian` import. Declarative nav destinations driving both the
// desktop rail and the phone bottom bar/more sheet from one source of truth.

export type NavMode = "home" | "prep" | "run" | "secrets" | "tables" | "help";
export type NavGroup = "hub" | "pipeline" | "insight" | "footer";

export interface NavDestination {
	mode: NavMode;
	label: string;
	/** Lucide icon id, passed to `setIcon`. */
	icon: string;
	group: NavGroup;
	subtabs?: readonly string[];
}

export const DESTINATIONS: readonly NavDestination[] = [
	{ mode: "home", label: "Home", icon: "castle", group: "hub", subtabs: ["dashboard", "sessions", "world", "foundation", "session-zero"] },
	{ mode: "prep", label: "Prep", icon: "list-checks", group: "pipeline" },
	{ mode: "run", label: "Run", icon: "play", group: "pipeline" },
	{ mode: "secrets", label: "Secrets", icon: "key-round", group: "insight" },
	{ mode: "tables", label: "Tables", icon: "dices", group: "insight", subtabs: ["roll", "generators"] },
	{ mode: "help", label: "Help", icon: "circle-help", group: "footer" },
] as const;

/** Phone bottom bar — the at-the-table role gets slot 1. */
export const PHONE_BAR: readonly NavMode[] = ["run", "prep", "home"];

/** Phone "More" sheet — everything not in the bar. */
export const PHONE_MORE_SHEET: readonly NavMode[] = ["tables", "secrets", "help"];

export function destinationFor(mode: NavMode): NavDestination | undefined {
	return DESTINATIONS.find((d) => d.mode === mode);
}
