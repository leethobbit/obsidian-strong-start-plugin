# Lazy GM's campaign manager — Agent Guide

## What this project is

TTRPG campaign manager built on the **Eight Steps of Lazy RPG Prep** (Lazy GM's Resource Document, CC-BY 4.0): guided session prep, secrets & clues that carry forward between sessions, rollable random tables (built-in + user-authored), a distraction-free run mode, and a settings-toggled 5e module. Plugin id `lazy-campaign`, desktop + mobile (`isDesktopOnly: false`). Markdown is the datastore — every entity is a real vault note under one `lazyCampaign` frontmatter namespace; the single host view is a lens, never a lock-in.

Full design plan (data model, UX, milestones): `docs/plan.md`. Frontmatter contract: `SCHEMA.md` (draft until 1.0, then frozen/additive-only).

**Status (2026-07-12): v1 milestones M0–M11 shipped and verified; an interaction-bug review pass is committed. NEXT UP: M12 (phone shell) → M13 (delight/flow) → M14 (release; blocked on the naming decision) → M15 (content/export) — full specs and the naming shortlist live in `docs/plan.md` → "Next milestone set".**

**Boundary**: `obsidian-draft-schemes-plugin` (sibling repo) is Draw Steel-specific bestiary/lorekeeper. This plugin stays system-agnostic prep-flow (+ optional 5e improv module); bestiary/statblock features belong there, not here.

## Stack reference

Obsidian plugin conventions (toolchain, Vault API rules, deferred views, mobile, release runbook, gotchas) → `~/.claude/docs/obsidian-plugin-dev.md`

**Community-store review rules apply to this repo** even pre-release: `npm run lint` is the local mirror of that review and gates every tag.

## Commands

| Task | Command |
|------|---------|
| Dev (watch build, auto-deploys to scratch vault) | `npm run dev` |
| Production build | `npm run build` (`tsc -noEmit` then esbuild) |
| Typecheck only | `npm run typecheck` |
| Lint (store-review mirror — run before every release) | `npm run lint` |
| Tests (pure logic only) | `npm test` |
| Reload plugin in vault | use the `obsidian-cli` skill, not a manual restart |
| Deploy target | `lazy-dev-vault/` in this repo (git-ignored; named uniquely so Obsidian's vault switcher/CLI can target it) — override with `LAZY_CAMPAIGN_VAULT`. Never a real user vault. |

## Architecture rules

- **Discovery**: query `app.metadataCache` for `frontmatter.lazyCampaign?.type` (`campaign | session | session-zero | pc | npc | location | table`). Never walk folders — folders are tidy defaults, a note dragged anywhere still works.
- **Frontmatter vs body**: state (ids, flags, link arrays, secrets) lives under the single `lazyCampaign` key via `processFrontMatter`; prose lives in the body under managed H2 sections edited only through `src/lib/sections.ts` (replace one section, never rewrite whole bodies). "Cleared = deleted": prune falsey flags/empty fields.
- **Joins**: wikilinks (`lazyCampaign.campaign: "[[Name]]"`) — Obsidian rename-updates them. Machine identity uses stable base36 ids (`s-8f3k2a`); never key logic off display text.
- **Secrets**: sessions are the sole source of truth; campaign-wide views are derived folds. Carry-forward is pure (`src/sessions/carryover.ts`), re-runnable, strictly additive; deletes of carried secrets are `archived: true` tombstones, never row removals.
- **data.json**: `{ settings, ui, hints }` through one `loadPersisted`/`persist` pair only. No note-describing data here.
- **View model**: one host `ItemView` (`src/views/lazy-view.ts`); every surface is a panel swapped inside it, driven by the declarative `src/views/nav-model.ts` (desktop rail + phone bottom bar from the same model). Never add a second view type.
- **Purity split**: `src/{sessions,tables,generators,dnd5e,content}/` core modules and `src/lib/{id,slug,rng,sections}.ts` must stay free of `obsidian` imports (vitest has no Obsidian runtime). Obsidian glue sits beside them (`*-files.ts`, `*-store.ts`, panels).
- **Rolls never auto-insert** — every inspiration roll renders a suggestion chip with Insert/Reroll/Dismiss; the GM stays the author.
- **Built-in content** is vendored TS in `src/content/` (CC-BY 4.0, attribution in `attribution.ts`, settings About, README). Never ship markdown into the vault. User tables shadow core tables by id — that IS the customization mechanism.

## Key files

| Path | Purpose |
|------|---------|
| `main.ts` | Plugin entry: settings load, view/command registration only; rest in `onLayoutReady` |
| `SCHEMA.md` | Frontmatter contract — every codec change updates it in the same commit |
| `src/sessions/` | Session codec, step registry, carry-over (pure) + session note ops |
| `src/tables/` | Dice + weighted roll engine + `{{...}}` expansion, user-table parser (pure) + table store |
| `src/content/` | Vendored CC-BY tables/checklists + attribution |
| `src/views/` | Host view, nav model, panels (home/, prep/, run, secrets, tables), phone shell |
| `src/lib/sections.ts` | Managed H2 body sections: parse / replace-one / heal |
| `src/settings/` | Settings tab + typed settings model |
| `styles.css` | All plugin CSS (`.lazy-campaign-` prefix, Obsidian CSS variables) |

## Common operations

| Task | Pattern |
|------|---------|
| Read/write entity state | Codec module (`*-schema.ts`) → `processFrontMatter`; never ad-hoc frontmatter edits in panels |
| Edit note prose programmatically | `src/lib/sections.ts` via `vault.process` — one section at a time |
| Add a rollable table | Core: new module in `src/content/` + registry entry. User-facing: table note with `lazyCampaign.type: table` |
| Add a prep step behavior | `src/sessions/steps.ts` registry + a renderer in `src/views/prep/steps/` |
| New dialog | Extend `src/lib/form-modal.ts`, fields from `form-fields.ts` |
| Surface an async vault-write failure | Wrap at the UI entry point with `tryFileOp` from `src/lib/notify.ts` |
| 5e-specific anything | Gate on the `dnd5e` feature toggle (`src/features.ts`); zero 5e UI when off |

## Adding or changing a frontmatter field (in order)

1. Update the codec (`src/sessions/session-schema.ts` or sibling) — lenient reader, strict writer.
2. Update `SCHEMA.md` in the same commit.
3. Add/extend a vitest case for the pure-logic part (codec round-trip + edge cases).
4. `npm run typecheck && npm test`, then reload via the `obsidian-cli` skill and verify the raw note in the dev vault matches SCHEMA.md.

## Versioning

Semver; pre-1.0 breaking changes bump MINOR. Keep `package.json`, `manifest.json`, `versions.json` in lockstep — never edit one by hand. Release runbook: `~/.claude/docs/obsidian-plugin-dev.md` → "Releasing a version (in order)". Tag = manifest version, **no `v` prefix**.

**Changelog discipline**: every user-facing change adds a line under `## [Unreleased]` in CHANGELOG.md in the same commit (Keep a Changelog). A PreToolUse hook blocks commits that stage source without a CHANGELOG entry; bypass with `[skip changelog]` only for genuinely non-user-facing work.

## Gotchas

1. `vault.process`'s callback receives the whole raw file (frontmatter + body) — `sections.ts`'s H2 helpers get away with treating that as "the body" because frontmatter always precedes the first heading, so it's never inside any section's span. A note type that doesn't use managed H2 sections (custom tables' free-form body) can't rely on that trick and must split/rejoin frontmatter explicitly — see `src/lib/body-split.ts`.
