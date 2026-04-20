# WSH v4.4.4 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.4 |
| **Release Date** | 2026-04-21 |
| **Previous Version** | 4.4.3 |
| **Release Type** | Hotfix (Docker build fails silently — npm install error hidden by pipe + yanked dependency) |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `Dockerfile` | ~8 | **Fix** | Removed `| tail` pipes that hid npm install errors; version bump |
| 2 | `docker-entrypoint.sh` | ~4 | **Fix** | Fixed prisma CLI path from `node /app/node_modules/prisma/build/index.js` to `./node_modules/.bin/prisma`; version bump |
| 3 | `package-lock.json` | Regenerated | **Fix** | Removed yanked `react-devtools-inline@4.4.1` dep; resolves to 4.4.0 |

### Version Bump (14 files)

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 4 | `package.json` | 1 | **Version** | `"version": "4.4.3"` → `"4.4.4"` |
| 5 | `Dockerfile` | 2 | **Version** | `ARG BUILD_VERSION=4.4.3` → `4.4.4` (both stages) |
| 6 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag |
| 7 | `docker-entrypoint.sh` | 1 | **Version** | Header version reference |
| 8 | `install.sh` | ~5 | **Version** | Script header, banner, image tags |
| 9 | `install.ps1` | ~5 | **Version** | Script header, banner, image tags |
| 10 | `update.sh` | 2 | **Version** | Script header + banner |
| 11 | `update.ps1` | 2 | **Version** | Script header + banner |
| 12 | `test-env.sh` | 2 | **Version** | Script header + banner |
| 13 | `test-env.ps1` | 2 | **Version** | Script header + banner |
| 14 | `src/app/api/health/route.ts` | 1 | **Version** | `version: '4.4.3'` → `version: '4.4.4'` |
| 15 | `src/app/api/admin/system/route.ts` | 1 | **Version** | `version: '4.4.3'` → `version: '4.4.4'` |
| 16 | `README.md` | ~5 | **Version** | Title, image tags, API example version references |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 17 | `CHANGELOG.md` | +20 | **Prepend** | Added v4.4.4 hotfix release entry |
| 18 | `CODING_CHANGES.md` | +70 | **Prepend** | New v4.4.4 section with three root cause fixes |
| 19 | `FILE_TRACKER.md` | Rewrite | **Rewrite** | Updated to v4.4.4 with new file inventory |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| — | *None* | This release only modified existing files |

---

## Verification Checklist

- [x] `package-lock.json` regenerated (no yanked dependencies)
- [x] Dockerfile has NO `| tail` pipes on `npm install` commands
- [x] Dockerfile uses `./node_modules/.bin/prisma generate` (standard npm bin path)
- [x] Dockerfile has self-healing fallback (`npm install prisma@^6` if binary missing)
- [x] `docker-entrypoint.sh` uses `./node_modules/.bin/prisma` (not internal path)
- [x] No `npx prisma` calls remain anywhere (prevents v7.x download)
- [x] `package-lock.json` version matches `package.json` (both 4.4.4)
- [x] Build passes locally (3 iterations, all clean)
- [x] Version string consistent across all 14 core files
- [x] CHANGELOG.md follows Keep a Changelog format

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | ✅ PASS | ~6s | Compiled successfully, all routes generated |
| 2 | ✅ PASS | ~6s | Compiled successfully, all routes generated |
| 3 | ✅ PASS | ~6s | Compiled successfully, all routes generated |
