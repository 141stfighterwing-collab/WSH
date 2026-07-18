# WSH v4.4.18 - Complete Feature File Tracker

> Release inventory and validation record for the unified latest build.

## Patch Information

| Field | Value |
|-------|-------|
| Version | 4.4.18 |
| Release Date | 2026-07-17 |
| Previous Docker Version | 4.5.6 (incorrect identity) |
| Canonical Release | 4.4.18 |
| Release Type | Release-line reconciliation and patch update |
| Branch | `TST-DEV` |

## Release Integration

| Area | Files | Result |
|------|-------|--------|
| Latest upstream data path | `QueryProvider.tsx`, `useInfiniteNotes.ts`, `useNoteDetail.ts`, `useVisibleNotes.ts`, `queryCache.ts`, notes/document APIs | Retained pagination, detail caching, virtualization, and reliable search |
| Dashboard and intelligence | `WSHKeepsDashboard.tsx`, synthesis API | Retained Full Intelligence Board graphs and local algorithm paths |
| Mobile workspace | `page.tsx`, `globals.css`, `MobileNavigation.tsx`, sidebars, header, footer | Retained compact dock, drawers, responsive framing, and touch navigation |
| Editor safety | `NoteEditor.tsx`, `quickReferenceFormat.ts` | Combined latest image/editor behavior with formatted templates and draft autosave |
| Supporting views | Notebook, DB Viewer, settings, project editor, notes grid | Retained responsive layouts and visible touch actions |
| Mind Map | `MindMap.tsx` | Retained the newer hybrid galaxy implementation with tap-capable controls |

## Version and Deployment Files

| Files | Result |
|-------|--------|
| `package.json`, `package-lock.json` | Version aligned to `4.4.18` |
| `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh` | Image and runtime metadata aligned to `weavenote:4.4.18` |
| `install.ps1`, `install.sh`, `test-env.ps1`, `test-env.sh` | User-facing version references aligned |
| `update.ps1`, `update.sh` | Current-branch fast-forward pull, runtime-version check, and non-destructive docs validation |
| Health and system APIs | Fallback version aligned to `4.4.18` |
| README, changelog, coding notes, worklog, release checklist, release notes | Unified release history documented |

## Verification Checklist

- [x] GitHub default branch and all remote branch versions inspected
- [x] `main` v4.4.18 ancestry merged into the v4.5 release line
- [x] Mobile and Quick Reference features reconciled with upstream application changes
- [x] Active version references aligned to `4.4.18`
- [x] Targeted ESLint passes across the release interaction and data surfaces
- [x] Production Next.js build passes with all 23 routes generated
- [x] Phone browser smoke test passes at `390x844` with no document overflow; desktop shell also loads cleanly
- [x] Login and Settings actions open and close correctly in the compact browser layout
- [x] PowerShell and shell updater syntax/documentation validation passes
- [ ] Docker host reports healthy `weavenote:4.4.18`

## Known Validation Notes

- Historical changelog and release-note versions intentionally remain unchanged.
- Application source has zero TypeScript diagnostics. Repository-wide checking still reports missing optional dependencies in standalone `examples/` and `skills/` scripts; production build and release-surface checks are authoritative for this patch.
