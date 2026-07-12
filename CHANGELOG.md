# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: semver (pre-1.0, breaking changes bump MINOR).

Every user-facing change adds a line under `[Unreleased]` **in the same commit** — a pre-commit hook enforces this (`[skip changelog]` bypasses it for non-user-facing work).

## [Unreleased]

### Added

- Full in-plugin editing (M17) — prep a whole game without opening a raw note:
  - A shared entity editor for characters, NPCs, locations, and quests: every frontmatter field (player/role/level, NPC role/location/status, quest status) plus the whole note body, with rename-on-save that updates links everywhere and a guard against overwriting notes changed on disk mid-edit.
  - A new **World** tab on Home listing the campaign's party, NPCs, locations, and quests — row tap to edit, one-tap quest done/reopen toggle, and per-group "New …" creation with all fields up front.
  - Pencil buttons on the prep board's roster rows and NPC/location chips opening the same editor (chip label click still opens the note).
  - Session zero's Expectations and Logistics prose is now editable in place.
  - Foundation gains a House rules editor and a campaign details card for the advisory `system` label.
  - Sessions list rows gain "Edit date" (the session number stays the stable key).

- Starter campaign (M16): the "Create starter campaign" command builds the document's own CC-BY village of Whitesparrow and "The Night Blade" adventure — foundation, eight NPC notes, five location notes, a quest, and session 1 prepped through every step except your party.
- Stress effects (M16, with the 5e module): the document's stress-check procedure in the run-mode 5e drawer — consent caveat first — plus rollable trigger and result tables.
- Stars and wishes (M16): two optional prompts in the end-session flow, saved to their own section so player-facing recap exports never include table feedback.
- Phone shell (M12): bottom tab bar (Run · Prep · Home · More) replacing the desktop rail on phones, a native "More" sheet (quick roll, Tables, Secrets, Help), prep as a step-list → full-screen step editor drill-down with a back header, soft-keyboard handling so the run-mode log bar rides above the keyboard, and a compact run top bar on narrow widths.
- Prep timer (M13): a quiet "Prep: N min" toolbar counter (counts only while the board is visible) and a congratulatory toast when all eight steps are done under thirty minutes — never a guilt trip when over.
- Sessions sub-tab on Home (M13): every session with date, prep/played status, and recap presence at a glance, plus per-row continue-prep/run/rename/open actions.
- Rename session note (M13): the title is free text; the session number stays the stable key.
- Alt+R (M13): roll inspiration for the step you're working on, even while typing.
- Dice tumble on roll chips and a card-flip on secret reveals in run mode (M13) — both disabled under reduced-motion; advantage/disadvantage rolls now get the nat-20/nat-1 garnish when the kept die earns it.
- More first-use hints (M13): run-mode secret peeking, foundation editing, generator rerolls.
- Wilderness travel & exploration reference (M15): travel roles, group stealth, and the journey framework as a section in the run-mode 5e drawer.
- Lazy Solo 5e module (M15, feature-toggleable): the document's solo oracle tables (chamber events, monument effects, treasures) in the tables panel plus the full procedure in Help.
- "Copy player recap" command (M15): a shareable campaign recap built from played sessions' recaps and revealed secrets only — unrevealed and retired secrets are excluded by construction.
- "Copy session zero guide" command (M15): pitch, truths, expectations, and lines/veils as a hand-to-players page.
- Quest notes (M15): the quest generator's "Save as note" now creates a managed, linkable `type: quest` entity under the campaign's Quests folder.
- "Create demo campaign" command (M14): a fully populated example campaign (played session, mid-prep session with carried secrets, party, NPCs, locations, session zero) for first-run evaluation.

### Changed

- Navigation rail now shows a text label beside each destination icon (wider rail) instead of icons alone.
- SCHEMA.md is frozen at contract 1.0 — additive-only from here (M14).
- README rewritten with the weekly loop, feature overview, screenshots, and install instructions (M14).
- Feature toggles in settings now refresh open plugin views immediately instead of waiting for the next re-render.

### Fixed

- Switching to the prep board after an entity rename (or any external frontmatter change made while the board was hidden) showed stale chips/secrets from the previously cached session model (M17).
- Run mode's top bar no longer clips the End button behind a horizontal scrollbar in narrow panes.
- Icon buttons across the plugin rendered blank: Obsidian's default button padding squeezed the icon SVG to zero width inside fixed-size buttons.
- The 5e reference drawer closed itself when clicking the manual party size/level steppers.
- Campaign options menu was a stub — it now offers rename (link-safe, folder-aware), archive/unarchive, open note, and new campaign; archived campaigns are labeled in the switcher.
- Typing then switching sessions within the save window could write prose into the wrong session's note; writes are now pinned to the note they were typed against, and pending edits are flushed (not dropped) on any switch or view close.
- Tapping two grim-portent pips quickly (dashboard or foundation) silently reverted the first toggle; fronts writes are now serialized.
- Dashboard's "Continue prep" opened whatever session the prep board last had open instead of the session the card describes.
- Ctrl/Cmd+1–8 no longer switches prep steps while typing in a field.
- Enter while confirming an IME composition candidate no longer submits forms or commits rows early.

### Added (v1, M0–M11)

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
- Custom tables: a "New table" button and "My tables" group in the Tables panel — paste a plain list (optionally with `3x ` weight prefixes) or write a die-range markdown table into a note under `<campaignRoot>/Tables/`, and it rolls alongside the built-in tables. A user table whose id matches a built-in one shadows (replaces) it; the built-in row shows a muted "hidden — replaced by your table" badge with a peek-and-restore hint instead of disappearing outright.
- Table editor modal: name + one big textarea, a live "dN · N entries" footer, and a "Preview roll" button that rolls the draft in place (including any `{{...}}` references to real tables) before you save.
- Built-in tables: the remaining Lazy GM's Resource Document tranche — NPC generator's ancestry/worldview/appearance & mannerisms/profession lists; character/group connections (20 each); the ten quest templates; the "Core Adventure Generators" section's patron/quest/location/monument/item/condition/description/origin/chamber/discovery/wall-decoration/dungeon-monster/trap/treasure/spell tables; the treasure generator's consumable and magical item lists; random traps (flavor/type/trigger); random monuments (origin/condition/unusual effect/100 structures); random underground connectors; all fifteen "Random Chambers" dungeon-type room lists; random items (weapon/origin/condition/armor/mundane/spell effect/potions of healing); random town events (sentiment/mundane/weather/fantastic); and the ten CR-banded "Random Dungeon Monsters" lists — 80 core tables in total now, all rollable from the Tables panel.
- Generators: one-click NPC, Treasure, Quest, Trap, and Monument generators (`src/generators/`) that compose several core tables into a structured result, each line tracking its source table id for a per-line reroll.
- Tables panel: a Roll/Generators sub-tab strip — Generators shows a card per generator with a Generate button; the composed result card offers per-line reroll dice, Copy, Save as note (NPC → an NPC note with the roll under "Generator notes"; Trap/Monument → a location note with the aspects under "## Aspects"; Treasure/Quest → a plain note in the active campaign's folder), and a "Send to prep ▾" menu that inserts into whichever session Prep currently has selected.
- Prep board: NPCs step gains a "Generate NPC" button (preview card + "Use this name" fills the add-NPC input, same as "Roll a name"); Rewards step gains a "Roll treasure" one-liner chip; Locations step gains a "Roll a monument" one-liner chip.
- Run mode: replaces the placeholder — a read-optimized, big-type, at-the-table panel showing the same session Prep has selected (or the latest, or a "Go to prep" empty state with none prepped yet).
  - Top bar: session label, an elapsed timer (starts the first time the panel shows a session, in-memory only), a d20 quick-roll button with a chevron popover (d4/d6/d8/d10/d12/d100/2d6 presets plus advantage/disadvantage), a safety-tools button, and an End session button; an overflow menu holds a three-step text-size stepper (persisted).
  - Strong start renders as rendered Markdown at the largest read-aloud size.
  - Scenes: a one-tap checklist — tapping a scene toggles strikethrough/done and sinks it below the undone ones (visual order only); persists as `- [ ]`/`- [x]` task syntax. Scenes/Rewards' shared list editor in Prep now round-trips that done flag without ever exposing a checkbox itself.
  - Secrets: face-down cards (a redacted-pattern mask + lock icon, never low-contrast text) that peek open on tap, offer "Mark revealed" (writes `revealed: true` on the open session's copy, one-tap, no note), and show a transient ~5s Undo; revealed cards stay open with an unlock icon.
  - Glance column: collapsible NPCs/Locations/Monsters/Rewards sections — wikilinked entries open the note in a new leaf and show an NPC's `role` as a muted suffix when resolvable; Rewards is a read-only bullet list.
  - A d20 roll shows as a large transient toast (gold ring on a natural 20, a shake on a natural 1 — that toast only), respecting `prefers-reduced-motion`.
  - A full-screen safety-tools overlay (X-card explainer + the campaign's session-zero lines/veils, if any) closes on any tap.
  - The sticky log bar is the only editable surface: Enter appends a `- HH:MM <text>` bullet to `## Log`.
  - End session opens a modal with tallies, an optional recap (appended to `## Recap`), and a carry-forward notice, then marks the session `played` and returns to Home; "Keep running" cancels safely.
  - Bullet-list parsing gained task-row (`- [ ]`/`- [x]`) support; a new pure `run-derive.ts` computes end-session tallies and a `format-elapsed.ts` helper formats the timer/log timestamps.
- Built-in tables: campaign pitches (20), starting locations (10), campaign fronts (20), and local adventure locations (20) from the "Spiral Campaign Development" section, plus a composed (not verbatim) "Six truths inspiration" seed table.
- Home: a Dashboard/Foundation/Session zero sub-tab strip (Session zero still a placeholder — M9's); `setMode("home", subtab)` selects one.
- Guided campaign creation wizard: a full-body, five-step flow replacing the Home panel's content while active (Name & pitch → Six truths → Fronts → The party → Done), each step with inspiration-roll dice (never auto-inserting) and only the name required to finish. Reachable from the dashboard's zero-state CTA and the header's "New campaign…" option; the previous quick-create form stays available as a "Quick create" link on the wizard's first step. State is in-memory only — closing the view mid-wizard loses the draft (a deliberate deviation from the plan's persistent draft banner).
- Foundation sub-tab: a read/edit view of the campaign note's pitch/truths/fronts sections — a pitch card (rendered prose with a pencil-to-edit textarea + inspiration dice), a Six truths list editor (reusing the Scenes/Rewards list editor, now with an optional per-empty-row dice affordance) and a Fronts editor (name/goal/doom fields, tappable grim-portent checkboxes, add/remove front with a two-step confirm on delete).
- Dashboard: a Fronts card showing each front's name and grim-portent pips — tapping a pip toggles it, the dashboard's only editable element, via a new byte-preserving targeted-line toggle (`src/campaigns/fronts.ts`) that leaves every other line of the section untouched.
- Feature toggles: a lossless on/off registry (`src/features.ts`, every feature on by default until its id is switched off in Settings → Features) — registers `session-zero` (this release) and `dnd5e` (M10) ids.
- Home / Session zero sub-tab: replaces the placeholder — four collapsible sections (Pitch & expectations, Safety tools, Characters, Logistics) over a `Session zero.md` note created lazily on first edit. Pitch & expectations shows the campaign's pitch read-only with a link to the Foundation tab; Safety tools has reference cards (sensitive topics, hard lines & veils, "pause for a second") plus tappable-chip hard-lines/veils lists; Characters shows the party roster with an "Add character" form; Logistics has an "Open note" link for the freeform body. Every section also lists its share of the session zero checklist as tap-to-toggle rows, with a "N of 7 done" progress line up top. Hidden entirely when the `session-zero` feature is off.
- Dashboard: a quiet "Session zero: N of 7 →" line under the next-session card whenever a session-zero note exists and isn't finished yet.
- Run mode's safety card now reflects whatever lines/veils are added on the new Session zero sub-tab (it already read the same `sessionZeroOf` store lookup — M6's plumbing, M9's UI).
- 5e module (feature-gated on `dnd5e`, zero UI when off): the lazy encounter benchmark, improvised DCs/damage, quick monster statistics by CR, and monster difficulty dials, vendored verbatim from the Lazy GM's Resource Document's "Tools for 5e Improvisation" and "Lazy Combat Encounter Building for 5e" sections.
  - Prep board's Monsters step gains an encounter benchmark card: a party summary from PC notes' new optional `level` field (levels/level-range, or an empty-state prompt), a plain-English deadly-benchmark readout, and a manual party-size/level override (in-memory only) for campaigns without leveled PC notes.
  - Characters step: roster rows gain an inline level stepper (1-20), writing straight to that PC's own note.
  - Run mode gains a "5e reference" drawer (top-bar sword icon) — the same benchmark card plus collapsible Improvised DCs, Improvised damage, Quick monster stats, and Difficulty dials sections; closes on outside click or Escape, never steals focus from the log bar.
  - `campaign.system` stays advisory-only (SCHEMA.md) — it doesn't gate anything; the `dnd5e` feature toggle alone decides whether 5e UI shows.
- Welcome modal: a one-time first-run guide ("Prep less. Run better.") shown from `onLayoutReady` the first time the plugin loads — a positioning line, a card grid of the five rail destinations, the CC-BY attribution, and a "Get started" button that jumps straight to Home. Replayable any time via a new "Show welcome" command or the Help panel's "Replay welcome" link; dismissing it (any way — the CTA, Escape, backdrop click) records it once via the same `hints.dismissed` list every other tip uses.
- Dismissible hints framework (`src/help/hint.ts`): a subtle, closeable callout row that persists its dismissal through `hints.dismissed` and never reappears once closed. Wired to three spots: the prep board ("work top to bottom or skip around…"), the secrets ledger ("secrets are born in prep and revealed in run mode…"), and the Tables panel's Roll tab ("your own table notes shadow built-ins with the same id…"). Settings gains a "Reset tips and welcome" button (under Features) that clears `hints.dismissed` so every tip and the welcome modal show again.
- Help panel: replaces the placeholder — the weekly loop in five lines, the eight prep steps with one-line descriptions, a short keyboard-shortcuts list (Ctrl/Cmd+1–8, Enter-to-add-row), and links to the source attribution, "Replay welcome", and "Reset tips".
- "Copy session sheet": a pure `sessions/session-sheet.ts` builder plus a command and a Prep board toolbar overflow action, producing a clean one-page markdown prep sheet (strong start, scenes, secrets with unrevealed ones checkbox-marked, locations/NPCs/monsters, rewards) for the current session straight to the clipboard.
- Generator result lines (Tables → Generators) no longer overflow their card on long text — `lazy-campaign-generator-line-text` now wraps instead of forcing the card wider.
- Empty-state audit: Prep, Run, Secrets, Foundation, and Session zero all used to dead-end on a plain "Create a campaign from Home first." message with no way forward from that screen. All five now show the same "No campaign yet" card with a "Create your campaign" button that jumps to Home and opens the campaign creation wizard directly.
