# WSH v4.4.3 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.3 |
| **Release Date** | 2026-04-21 |
| **Previous Version** | 4.4.2 |
| **Release Type** | Hotfix (Docker build stale cache — prisma binary not found) |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `Dockerfile` | ~15 | **Fix** | Self-healing prisma generate with fallback npm install |

### Version Bump (14 files)

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 2 | `package.json` | 1 | **Version** | `"version": "4.4.2"` → `"4.4.3"` |
| 3 | `Dockerfile` | 2 | **Version** | `ARG BUILD_VERSION=4.4.2` → `4.4.3` (both stages) |
| 4 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag |
| 5 | `docker-entrypoint.sh` | 2 | **Version** | Header version references |
| 6 | `install.sh` | ~5 | **Version** | Script header, banner, image tags |
| 7 | `install.ps1` | ~5 | **Version** | Script header, banner, image tags |
| 8 | `update.sh` | 2 | **Version** | Script header + banner |
| 9 | `update.ps1` | 2 | **Version** | Script header + banner |
| 10 | `test-env.sh` | 2 | **Version** | Script header + banner |
| 11 | `test-env.ps1` | 2 | **Version** | Script header + banner |
| 12 | `src/app/api/health/route.ts` | 1 | **Version** | `version: '4.4.2'` → `version: '4.4.3'` |
| 13 | `src/app/api/admin/system/route.ts` | 1 | **Version** | `version: '4.4.2'` → `version: '4.4.3'` |
| 14 | `README.md` | ~5 | **Version** | Title, image tags, API example version references |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 15 | `CHANGELOG.md` | +12 | **Prepend** | Added v4.4.3 hotfix release entry |
| 16 | `CODING_CHANGES.md` | +40 | **Prepend** | New v4.4.3 section with Dockerfile fix details |
| 17 | `FILE_TRACKER.md` | Rewrite | **Rewrite** | Updated to v4.4.3 with new file inventory |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| — | *None* | This release only modified existing files |

---

## Verification Checklist

- [x] Dockerfile uses `./node_modules/.bin/prisma generate` (standard npm bin path)
- [x] Dockerfile has self-healing fallback (`npm install prisma@^6` if binary missing)
- [x] No `npx prisma` calls remain (prevents v7.x download)
- [x] Build passes locally (3 iterations, all clean)
- [x] Version string consistent across all 14 core files
- [x] CHANGELOG.md follows Keep a Changelog format

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | ✅ PASS | 6.3s | Compiled successfully, all 23 routes generated |
| 2 | ✅ PASS | 6.4s | Compiled successfully, all 23 routes generated |
| 3 | ✅ PASS | 6.6s | Compiled successfully, all 23 routes generated |
