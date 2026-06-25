# WSH v4.4.15 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.15 |
| **Release Date** | 2026-06-25 |
| **Previous Version** | 4.4.14 |
| **Release Type** | Intelligence board chart expansion, smoother chart animation, release metadata alignment |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `src/components/wsh/WSHKeepsDashboard.tsx` | **Feature** | Added new intelligence-board charts and smoother animation settings across the dashboard chart set |
| 2 | `package.json` | **Version** | Bumped package version to `4.4.15` |
| 3 | `Dockerfile` | **Version** | Updated Docker build metadata to `4.4.15` |
| 4 | `docker-compose.yml` | **Version** | Updated build arg and image tag to `weavenote:4.4.15` |
| 5 | `docker-entrypoint.sh` | **Version** | Updated entrypoint banner/version fallback to `4.4.15` |
| 6 | `src/app/api/health/route.ts` | **Version** | Updated runtime version fallback to `4.4.15` |
| 7 | `src/app/api/admin/system/route.ts` | **Version** | Updated system route version fallback to `4.4.15` |
| 8 | `README.md` | **Docs** | Updated user-facing version references to `4.4.15` |
| 9 | `RELEASE-NOTES-4.4.15.md` | **Docs** | Added dedicated release notes for graph expansion and smoother chart motion |
| 10 | `CHANGELOG.md` | **Release** | Added 4.4.15 entry |
| 11 | `CODING_CHANGES.md` | **Release** | Added technical record for the chart expansion and animation polish |
| 12 | `FILE_TRACKER.md` | **Release** | Updated file inventory for 4.4.15 |
| 13 | `RELEASE-CHECKLIST.md` | **Release** | Updated target release line to 4.4.15 |

---

## Verification Checklist

- [x] Intelligence board graph set expanded
- [x] Chart animations smoothed across the dashboard
- [x] Runtime version metadata updated to `4.4.15`
- [x] Docker build/image metadata updated to `4.4.15`
- [x] Release notes, changelog, coding notes, and tracker updated
- [x] Local production build passed
- [ ] Live browser/manual smoke pass still recommended after deployment
