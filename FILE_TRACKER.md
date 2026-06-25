# WSH v4.4.16 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.16 |
| **Release Date** | 2026-06-25 |
| **Previous Version** | 4.4.15 |
| **Release Type** | Today checklist persistence fix, release metadata alignment |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `src/components/wsh/RightSidebar.tsx` | **Fix** | Reworked Things to do Today persistence to use date-scoped todo buckets instead of a fragile single-blob storage path |
| 2 | `package.json` | **Version** | Bumped package version to `4.4.16` |
| 3 | `Dockerfile` | **Version** | Updated Docker build metadata to `4.4.16` |
| 4 | `docker-compose.yml` | **Version** | Updated build arg and image tag to `weavenote:4.4.16` |
| 5 | `docker-entrypoint.sh` | **Version** | Updated entrypoint banner/version fallback to `4.4.16` |
| 6 | `src/app/api/health/route.ts` | **Version** | Updated runtime version fallback to `4.4.16` |
| 7 | `src/app/api/admin/system/route.ts` | **Version** | Updated system route version fallback to `4.4.16` |
| 8 | `README.md` | **Docs** | Updated user-facing version references to `4.4.16` |
| 9 | `RELEASE-NOTES-4.4.16.md` | **Docs** | Added dedicated release notes for the Today checklist persistence fix |
| 10 | `CHANGELOG.md` | **Release** | Added 4.4.16 entry |
| 11 | `CODING_CHANGES.md` | **Release** | Added technical record for the Today checklist persistence fix |
| 12 | `FILE_TRACKER.md` | **Release** | Updated file inventory for 4.4.16 |
| 13 | `RELEASE-CHECKLIST.md` | **Release** | Updated target release line to 4.4.16 |

---

## Verification Checklist

- [x] Things to do Today persistence logic updated
- [x] Runtime version metadata updated to `4.4.16`
- [x] Docker build/image metadata updated to `4.4.16`
- [x] Release notes, changelog, coding notes, and tracker updated
- [x] Local production build passed
- [ ] Live browser/manual smoke pass still recommended after deployment
