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
