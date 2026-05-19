# WSH v4.5.2 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.5.2 |
| **Release Date** | 2026-05-19 |
| **Previous Version** | 4.5.1 |
| **Release Type** | Dashboard analytics refinement, additional graphs, Docker version bump |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `src/components/wsh/WSHKeepsDashboard.tsx` | Rewrite | **Change** | Removed simulated realtime pulse and added expanded analytics graphs/stats |
| 2 | `src/components/wsh/Header.tsx` | ~12 | **Add** | Added dashboard toggle beside grid/focus controls |
| 3 | `src/app/page.tsx` | ~17 | **Change** | Renders dashboard view in place of editor/grid when selected |
| 4 | `src/store/wshStore.ts` | 1 | **Change** | Added `dashboard` to `ViewMode` |

### Version Bump

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 5 | `package.json` | 1 | **Version** | `4.5.1` → `4.5.2` |
| 6 | `package-lock.json` | 2 | **Version** | Root package metadata updated to `4.5.2` |
| 7 | `Dockerfile` | 3 | **Version** | Build args and header updated to `4.5.2` |
| 8 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag updated to `weavenote:4.5.2` |
| 9 | `docker-entrypoint.sh` | 2 | **Version** | Entrypoint banner fallback updated |
| 10 | `install.sh` | ~4 | **Version** | Banner, manifest, and image tags updated |
| 11 | `install.ps1` | ~4 | **Version** | Banner, manifest, and image tags updated |
| 12 | `update.sh` | 2 | **Version** | Script header + banner updated |
| 13 | `update.ps1` | 3 | **Version** | Script version and current version updated |
| 14 | `test-env.sh` | 2 | **Version** | Script header + banner updated |
| 15 | `test-env.ps1` | 2 | **Version** | Script header + banner updated |
| 16 | `src/app/api/health/route.ts` | 1 | **Version** | fallback version updated to `4.5.2` |
| 17 | `src/app/api/admin/system/route.ts` | 1 | **Version** | fallback version updated to `4.5.2` |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 18 | `README.md` | ~25 | **Docs** | Updated dashboard feature docs and Docker image/version references |
| 19 | `docs/WSH_UPDATE_RUNBOOK.md` | New | **Docs** | Added future update, PowerShell, and `TST-DEV` branch runbook |
| 20 | `CHANGELOG.md` | +15 | **Prepend** | Added v4.5.2 release entry |
| 21 | `CODING_CHANGES.md` | +30 | **Prepend** | Added implementation notes for v4.5.2 |
| 22 | `FILE_TRACKER.md` | Rewrite | **Rewrite** | Updated file inventory for v4.5.2 |
| 23 | `worklog.md` | +1 section | **Append** | Added task log for dashboard analytics refinement |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `src/components/wsh/WSHKeepsDashboard.tsx` | WSH Keeps analytics dashboard view |

---

## Verification Checklist

- [x] Dashboard component passes targeted ESLint
- [x] Header/page/store integration passes targeted ESLint
- [x] Dev server runs on `http://localhost:8883`
- [x] Browser smoke test found the dashboard toggle and no console errors
- [x] Docker image tag updated to `weavenote:4.5.2`
- [x] Health/system fallback versions updated to `4.5.2`
- [x] CHANGELOG.md follows Keep a Changelog format

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | PASS | ~13s | Targeted ESLint passed for dashboard integration files |
| 2 | PASS | Live | Dev server started with webpack mode at `http://localhost:8883` |
| 3 | BLOCKED | Existing repo issue | Full production build compiles frontend, then fails in existing `/api/admin/users/extract-text` due missing native `DOMMatrix`/canvas binding |
