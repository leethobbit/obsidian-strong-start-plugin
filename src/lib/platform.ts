import { Platform, type App } from "obsidian";

/**
 * Phone-sized mobile viewport (as opposed to tablet or desktop). `app` is
 * accepted — unused today — for parity with other helpers here and in case a
 * future per-window check is needed; every call site should read `isPhone(this.app)`
 * rather than reaching for the `Platform` global directly.
 */
export function isPhone(_app: App): boolean {
	return Platform.isPhone;
}
