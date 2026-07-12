# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: semver (pre-1.0, breaking changes bump MINOR).

Every user-facing change adds a line under `[Unreleased]` **in the same commit** — a pre-commit hook enforces this (`[skip changelog]` bypasses it for non-user-facing work).

## [Unreleased]

### Added

- Initial scaffold.
- Campaign manager view: single host view with icon-rail navigation (Home, Prep, Run, Secrets, Tables, Help).
- Create campaign: quick-create form (name + optional system) that scaffolds a campaign note and folder.
- Sessions: auto-numbered session notes with a managed body scaffold (no secret carry-over yet).
- Dashboard: next-session card and recent-sessions list, with a zero-campaign empty state.
- Prep board: the eight-step master→detail workspace (Characters, Strong start, Scenes, Secrets, Locations, NPCs, Monsters, Rewards), replacing the placeholder panel.
  - Master list: state circles (not started / has content / manually marked done), per-row live summaries, click-to-select, and Ctrl/Cmd+1–8 keyboard step jumps.
  - Toolbar: session selector (with "New session…"), "Open note", a "Run" button (Notice stub until run mode lands), and "N of 8" progress.
  - Strong start: a section-backed textarea with idle-debounced + blur-flushed writes.
  - Scenes/Rewards: a shared one-line-row list editor over bullet-list body sections (add/remove/reorder).
  - Secrets: frontmatter CRUD (add/edit/remove) with a progress count toward 10.
  - Locations/NPCs: a shared link-chip editor with vault-note typeahead and a "Create note" affordance that converts an unresolved chip to a wikilink.
  - Monsters: the same chip editor without note-creation, suggesting from any vault note.
  - Characters: a read-only roster scanned from `type: pc` notes, plus a "Create character note" form.
  - Focus-preserving re-renders: the plugin's own frontmatter/section writes take a "soft" path that skips rebuilding the active editor, and an external write to the open session note defers the rebuild until the field loses focus — the caret survives either way.
- Dashboard: the next-session card's primary action now opens the Prep board directly ("Continue prep"/"Prep session N") instead of the raw note, with 8-dot step progress; "Open note" stays as a secondary action.
- Rolling engine: seedable dice roller (full `NdM±K`, bare `dM`, constants), weighted table rolls, and `{{...}}` template expansion (dice or nested table references, recursion-capped and cycle-safe).
- Built-in tables: the four "Example strong starts" lists (cities and towns/sewers/wilderness/dungeons), the four "Secrets and clues" prompt categories, and the NPC generator's first/last name lists — vendored from the Lazy GM's Resource Document (CC-BY 4.0), with a combined `npc-names` table demonstrating template expansion.
- Uniform inspiration-roll chip (result + Insert/Reroll/Dismiss; rolls never auto-insert) wired into the Strong start step (environment picker), the Secrets step (category picker, inserts as a new secret), and the NPCs step ("Roll a name", fills the add-NPC input without creating a note).
- Tables panel: replaces the placeholder — category-grouped table list, roll button, a session-only result stack with Copy/Reroll and an expandable "How this rolled" trace, and a CC-BY attribution footer.
- Command: "Roll on a table" — fuzzy-pick any registered table and roll it once as a Notice.
- Settings: an About section with the Lazy GM's Resource Document attribution and source link.
- Secret carry-over: new sessions now seed their `secrets[]` from every unrevealed, non-retired secret in prior sessions, always taking the latest-edited copy of each.
- Prep board Secrets step: a "Carried over" strip (hourglass, origin session tag, aged tint that deepens the longer a secret has ridden along) with a single Retire action, separated from a "New this session" list; a "Sync carried" button re-runs carry-over additively and reports how many secrets it brought in; a "Show retired" toggle reveals tombstoned rows with a Restore action. Deletes now route through one helper that tombstones (`archived: true`) instead of removing a row whenever an earlier session would otherwise resurrect it.
- Secrets ledger panel: replaces the Secrets placeholder — a stat line, filter chips (All/In play/Revealed/Retired) plus a text filter, and a grouped list (In play/Revealed/Retired) with carried-count badges, aged tint, and Reveal (optional "how did they learn it?" note)/Retire/Restore/Open session actions. Reveal and retire/restore always write to whichever session note holds the authoritative copy, not necessarily the newest one.
- Dashboard: a "Secrets in play" card — count, the three most-carried in-play secrets, an hourglass staleness hint once any secret has carried three or more sessions, and an "All secrets →" link to the ledger.
