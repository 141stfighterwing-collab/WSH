# WSH v4.4.14 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.14 |
| **Release Date** | 2026-06-25 |
| **Previous Version** | 4.4.13 |
| **Release Type** | Full Intelligence Board dashboard redesign, release metadata alignment |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `src/components/wsh/WSHKeepsDashboard.tsx` | **Feature** | Reworked the dashboard into a Full Intelligence Board with command-center sections |
| 2 | `package.json` | **Version** | Bumped package version to `4.4.14` |
| 3 | `Dockerfile` | **Version** | Updated Docker build metadata to `4.4.14` |
| 4 | `docker-compose.yml` | **Version** | Updated build arg and image tag to `weavenote:4.4.14` |
| 5 | `docker-entrypoint.sh` | **Version** | Updated entrypoint banner/version fallback to `4.4.14` |
| 6 | `src/app/api/health/route.ts` | **Version** | Updated runtime version fallback to `4.4.14` |
| 7 | `src/app/api/admin/system/route.ts` | **Version** | Updated system route version fallback to `4.4.14` |
| 8 | `README.md` | **Docs** | Updated user-facing version references to `4.4.14` |
| 9 | `RELEASE-NOTES-4.4.14.md` | **Docs** | Added dedicated release notes for the Full Intelligence Board |
| 10 | `CHANGELOG.md` | **Release** | Added 4.4.14 entry |
| 11 | `CODING_CHANGES.md` | **Release** | Added technical record for the intelligence-board redesign |
| 12 | `FILE_TRACKER.md` | **Release** | Updated file inventory for 4.4.14 |
| 13 | `RELEASE-CHECKLIST.md` | **Release** | Updated target release line to 4.4.14 |

---

## Verification Checklist

- [x] Full Intelligence Board implemented
- [x] Runtime version metadata updated to `4.4.14`
- [x] Docker build/image metadata updated to `4.4.14`
- [x] Release notes, changelog, coding notes, and tracker updated
- [x] Local production build passed
- [ ] Live browser/manual smoke pass still recommended after deployment
