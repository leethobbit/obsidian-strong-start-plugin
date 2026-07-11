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
  - Secrets: frontmatter CRUD (add/edit/remove) with a progress count toward 10; secret deletion is plain removal in M2 (tombstones arrive with carry-over in M4).
  - Locations/NPCs: a shared link-chip editor with vault-note typeahead and a "Create note" affordance that converts an unresolved chip to a wikilink.
  - Monsters: the same chip editor without note-creation, suggesting from any vault note.
  - Characters: a read-only roster scanned from `type: pc` notes, plus a "Create character note" form.
  - Focus-preserving re-renders: the plugin's own frontmatter/section writes take a "soft" path that skips rebuilding the active editor, and an external write to the open session note defers the rebuild until the field loses focus — the caret survives either way.
- Dashboard: the next-session card's primary action now opens the Prep board directly ("Continue prep"/"Prep session N") instead of the raw note, with 8-dot step progress; "Open note" stays as a secondary action.
