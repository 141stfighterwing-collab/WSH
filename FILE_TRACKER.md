# WSH v4.4.17 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.17 |
| **Release Date** | 2026-06-25 |
| **Previous Version** | 4.4.16 |
| **Release Type** | Today checklist race-condition fix, release metadata alignment |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `src/components/wsh/RightSidebar.tsx` | **Fix** | Added a load-complete guard so Today checklist persistence cannot overwrite saved items with an empty state during initial mount |
| 2 | `package.json` | **Version** | Bumped package version to `4.4.17` |
| 3 | `Dockerfile` | **Version** | Updated Docker build metadata to `4.4.17` |
| 4 | `docker-compose.yml` | **Version** | Updated build arg and image tag to `weavenote:4.4.17` |
| 5 | `docker-entrypoint.sh` | **Version** | Updated entrypoint banner/version fallback to `4.4.17` |
| 6 | `src/app/api/health/route.ts` | **Version** | Updated runtime version fallback to `4.4.17` |
| 7 | `src/app/api/admin/system/route.ts` | **Version** | Updated system route version fallback to `4.4.17` |
| 8 | `README.md` | **Docs** | Updated user-facing version references to `4.4.17` |
| 9 | `RELEASE-NOTES-4.4.17.md` | **Docs** | Added dedicated release notes for the Today checklist race-condition fix |
| 10 | `CHANGELOG.md` | **Release** | Added 4.4.17 entry |
| 11 | `CODING_CHANGES.md` | **Release** | Added technical record for the Today checklist race-condition fix |
| 12 | `FILE_TRACKER.md` | **Release** | Updated file inventory for 4.4.17 |
| 13 | `RELEASE-CHECKLIST.md` | **Release** | Updated target release line to 4.4.17 |

---

## Verification Checklist

- [x] Today checklist initial-load persistence guard added
- [x] Runtime version metadata updated to `4.4.17`
- [x] Docker build/image metadata updated to `4.4.17`
- [x] Release notes, changelog, coding notes, and tracker updated
- [x] Local production build passed
- [ ] Live browser/manual smoke pass still recommended after deployment
