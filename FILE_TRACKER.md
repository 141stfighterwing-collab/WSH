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
- [x] Docker host `10.30.1.15` reports healthy `weavenote:4.4.18`

## Deployment Result

| Check | Result |
|-------|--------|
| GitHub `TST-DEV` | Feature restore commit `74ad7e2` pushed successfully |
| Host checkout | Clean `TST-DEV` checkout at `74ad7e2` |
| Docker image | `weavenote:4.4.18` built successfully on the host |
| Container | `weavenote-app` running and Docker health status `healthy` |
| Health API | Version `4.4.18`, database `connected`, 2 ms observed latency, 4 users |
| Browser smoke test | Deployed guest shell, Login, Settings, and compact layout render without console errors |

## Authentication Hotfix

| Check | Result |
|-------|--------|
| Root cause | Host `.env` did not contain `JWT_SECRET`; Compose passed an empty value |
| Immediate repair | Generated a 64-character random host secret and recreated only `weavenote-app` |
| Prevention | Entrypoint now generates and persists a secure secret in `wsh-env` when required |
| Detection | Health API, update scripts, and environment tests now require authentication status `configured` |
| Data safety | PostgreSQL container, volume, users, notes, and documents were not modified |

## Known Validation Notes

- Historical changelog and release-note versions intentionally remain unchanged.
- Application source has zero TypeScript diagnostics. Repository-wide checking still reports missing optional dependencies in standalone `examples/` and `skills/` scripts; production build and release-surface checks are authoritative for this patch.
- The live browser session was unauthenticated, so data-changing workspace actions were not exercised against user data. Their release surfaces passed targeted lint and production build validation.
