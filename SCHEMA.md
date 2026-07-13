# Lazy GM's campaign manager — data schema

**Status: FROZEN — contract 1.0 (2026-07-12, M14).** From here the schema is **additive-only** until a 2.0: new note types and new optional fields may be added, but no existing field may change meaning, type, or default. Every addition still lands in the same commit as its codec change.

All plugin state on a note lives under **one top-level frontmatter key: `lazyCampaign`** (a nested object). Notes are discovered by scanning `app.metadataCache` for `frontmatter.lazyCampaign?.type` — never by folder location. Folders are tidy defaults; a note moved anywhere in the vault keeps working.

General rules:

- **Writes** go through `fileManager.processFrontMatter` (state) or the managed-section helper (prose). Panels never edit frontmatter ad hoc — every note type has exactly one codec module.
- **Cleared = deleted.** Falsey flags and empty fields are removed on write; empty sub-objects are pruned. Absence is the false/empty state.
- **Wikilinks are join keys.** Child notes point at their campaign with `campaign: "[[<Campaign note>]]"`. Obsidian (≥1.4) rename-updates frontmatter links.
- **Stable ids.** Machine identities are short random base36 strings with a type prefix (`c-` campaign, `s-` secret). Display text can be reworded freely; ids never change.
- **Lenient readers, strict writers.** Codecs tolerate missing/extra/misordered fields on read and emit the canonical shape on write.

## Note types

### Campaign — `type: campaign`

Path default: `<campaignRoot>/<Name>/<Name>.md` (folder note).

```yaml
lazyCampaign:
  type: campaign
  id: c-4k2j9x          # stable; survives rename/move
  system: "5e"          # free string, advisory only (M10)
  status: active        # active | archived; absent = active
```

`system` is a free string with no parsing/validation and does **not** gate anything — the `dnd5e` feature toggle alone (`src/features.ts`) decides whether 5e UI shows, everywhere it appears, regardless of this field's value. Keeping `system` advisory avoids a second on/off signal to keep in sync with the feature toggle; a future major version could revisit auto-suggesting the toggle based on this field, but M10 does not.

Managed body sections (scaffolded once, then user-owned; parsed leniently, never rewritten wholesale):
`## Campaign pitch` · `## Six truths` (bullet list) · `## Fronts` (one `### <Front>` each: goal line, `- [ ]` grim portents, doom line) · `## House rules`.
Grim-portent pips on the dashboard toggle individual `- [ ]` lines via targeted line edits.

### Session — `type: session`

Path default: `<campaign folder>/Sessions/Session <N>.md`.

```yaml
lazyCampaign:
  type: session
  campaign: "[[Greenhollow]]"
  session: 4                    # authoritative ordering key; title is free
  date: 2026-07-18              # ISO date, optional
  status: prep                  # prep | played; absent = prep
  stepsDone: [characters, strong-start]   # only done step ids stored
  secrets:
    - id: s-8f3k2a
      text: The mayor is a doppelganger reporting to the Veiled Hand.
      revealed: true            # absent = false
      note: Kara recognized the ring   # optional "how they learned it", captured at reveal
    - id: s-1c9d4e
      text: The mill hides a shrine to Zargon.
      archived: true            # tombstone — never carries again
  npcs: ["[[Mayor Elba]]", "Krek the ferryman"]   # wikilinks or ad-hoc strings
  locations: ["[[The Sunken Mill]]"]
  monsters: ["4 × goblin", "[[Grib the Ogre]]"]
```

Step ids (frozen constants): `characters, strong-start, scenes, secrets, locations, npcs, monsters, rewards`.

Managed body sections: `## Strong start` · `## Scenes` (task-list bullets — `- [ ]`/`- [x]`, toggled one-tap in run mode; a plain `-` bullet reads as not-done) · `## Rewards` (bullets) · `## Notes` (free-form GM scratchpad, edited from run mode's Notes tab; added to the scaffold post-1.0 — older notes gain it lazily on first write) · `## Log` (run-mode timestamped bullets, `- HH:MM <text>`). The end-session flow appends `## Recap`.

Scene detail blocks: a `## Scenes` bullet may be followed by indented lines (spaces or tabs) — its detail block, shown by run mode's expand chevron and edited per-row in prep. Detail round-trips verbatim (common indent normalized to four spaces); indented sub-bullets belong to the detail, not the scene list.

### Session zero — `type: session-zero`

Path default: `<campaign folder>/Session zero.md`. One per campaign.

```yaml
lazyCampaign:
  type: session-zero
  campaign: "[[Greenhollow]]"
  done: [one-page-guide, safety-discussion]  # checked checklist item ids (src/content/session-zero.ts)
  lines: ["harm to children"]                # hard lines (never on screen)
  veils: ["torture"]                         # veils (off-screen/fade)
```

Checklist item ids are frozen constants: `one-page-guide, describe-theme, safety-discussion, choose-patron, build-characters, character-connections, short-adventure`.

Managed body sections (scaffolded once, then user-owned): `## Expectations` · `## Logistics`. Lines/veils feed run mode's safety card.

### Player character — `type: pc`

```yaml
lazyCampaign:
  type: pc
  campaign: "[[Greenhollow]]"
  player: Sarah
  role: wizard          # optional free string
  level: 4              # optional, 1-20; absent = unset (M10: sizes the 5e encounter benchmark)
```

Membership lives on the child: the party roster is a scan for `type: pc` + campaign link. There is no roster array on the campaign.

`level` is edited inline on the Characters step's roster rows (a stepper, not a text field) and read leniently (tolerates a numeric string, drops anything outside 1-20). It's advisory-only outside the 5e module: the benchmark card falls back to a manual party-size/level override in-memory when it's unset on some or all PCs.

### NPC — `type: npc`

```yaml
lazyCampaign:
  type: npc
  campaign: "[[Greenhollow]]"
  role: fence            # optional free string
  location: "[[The Docks]]"   # optional
  status: alive          # alive | dead; absent = alive
```

Body freeform; generators write archetype/connection lines into the body.

### Location — `type: location`

```yaml
lazyCampaign:
  type: location
  campaign: "[[Greenhollow]]"
```

Body carries the three fantastic aspects as bullets under `## Aspects`.

### Quest — `type: quest`

Path default: `<campaign folder>/Quests/<Title>.md`. Created by the quest generator's "Save as note" (M15); linkable from scenes and session chips like any note.

```yaml
lazyCampaign:
  type: quest
  campaign: "[[Greenhollow]]"
  status: open           # open | done; absent = open
```

Body freeform; the generator seeds it with the quest outline.

### Custom table — `type: table`

```yaml
lazyCampaign:
  type: table
  tableId: rumors-at-the-inn   # optional; defaults to filename slug. Same id as a
                               # built-in table SHADOWS (replaces) that built-in.
```

Rows are parsed from the body, first match wins:

1. **Die-range markdown table** — the first table whose first column parses as die ranges (`1`, `2-5`, `6-10`); range width = row weight.
2. **Bullet list** — each top-level `-` bullet is a uniform-weight row.

Row text may contain `{{...}}` placeholders: a dice expression (`{{1d4}}`) or another table id (`{{npc-names}}`). Expansion is recursive (depth cap 8, cycle-safe); unresolvable placeholders render literally.

## Secret carry-over semantics

- Sessions are the **sole source of truth**; every campaign-level secret view is a derived fold.
- A secret's identity is its `id`, copied forward verbatim. The **authoritative version** of an id is its copy in the highest-numbered session containing it (tie-break: `date`, then path, ascending).
- `carryForward(priorSessions)`: for each id take the authoritative version; carry `{id, text}` for every one that is neither `revealed` nor `archived`, ordered by first appearance. State flags never copy.
- Carry runs at session creation and via "Sync carried secrets", which is **strictly additive** — it inserts missing ids and never removes or overwrites rows.
- Deleting a carried secret writes `archived: true` (tombstone). True row removal is allowed only when the id appears in no earlier session (otherwise the prior copy would resurrect it).
- Duplicate ids within one session: readers dedupe keep-first and report a notice.
- Carried-count badges are derived at render time, never stored.

## Plugin-local storage (`data.json`)

Outside this compatibility contract; documented for completeness.

```jsonc
{
  "settings": { /* typed settings model, src/settings/settings.ts */ },
  "ui":       { "lastCampaignId": "c-4k2j9x", "lastMode": "prep",
                "lastSessionPath": "Campaigns/Greenhollow/Sessions/Session 4.md",
                "runTextSize": "md" },
  "hints":    { "dismissed": ["prep-board"] }
}
```

Written only through the single `loadPersisted`/`persist` pair in `main.ts`.
