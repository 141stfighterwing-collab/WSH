# WSH v4.4.2 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.2 |
| **Release Date** | 2026-04-21 |
| **Previous Version** | 4.4.1 |
| **Release Type** | Hotfix (Docker build failure — Prisma v7 npx download) |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `Dockerfile` | 2 | **Fix** | Replace `npx prisma generate` with `node node_modules/prisma/build/index.js generate` |

### Version Bump (14 files)

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 2 | `package.json` | 1 | **Version** | `"version": "4.4.1"` → `"4.4.2"` |
| 3 | `Dockerfile` | 2 | **Version** | `ARG BUILD_VERSION=4.4.1` → `4.4.2` (both stages) |
| 4 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag |
| 5 | `docker-entrypoint.sh` | 2 | **Version** | Header version references |
| 6 | `install.sh` | ~5 | **Version** | Script header, banner, image tags |
| 7 | `install.ps1` | ~5 | **Version** | Script header, banner, image tags |
| 8 | `update.sh` | 2 | **Version** | Script header + banner |
| 9 | `update.ps1` | 2 | **Version** | Script header + banner |
| 10 | `test-env.sh` | 2 | **Version** | Script header + banner |
| 11 | `test-env.ps1` | 2 | **Version** | Script header + banner |
| 12 | `src/app/api/health/route.ts` | 1 | **Version** | `version: '4.4.1'` → `version: '4.4.2'` |
| 13 | `src/app/api/admin/system/route.ts` | 1 | **Version** | `version: '4.4.1'` → `version: '4.4.2'` |
| 14 | `README.md` | ~5 | **Version** | Title, image tags, API example version references |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 15 | `CHANGELOG.md` | +10 | **Prepend** | Added v4.4.2 hotfix release entry |
| 16 | `CODING_CHANGES.md` | +50 | **Prepend** | New v4.4.2 section with Dockerfile fix details |
| 17 | `FILE_TRACKER.md` | Rewrite | **Rewrite** | Updated to v4.4.2 with new file inventory |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| — | *None* | This release only modified existing files — no new files were created |

---

## Verification Checklist

- [x] Dockerfile uses `node node_modules/prisma/build/index.js generate` (not `npx prisma generate`)
- [x] Build passes locally (3 iterations, all clean)
- [x] Prisma CLI version confirmed: v6.19.2 (from `^6.11.1` in package.json)
- [x] `npx prisma` confirmed to download v7.7.0 (the bug we fixed)
- [x] docker-entrypoint.sh already uses the correct pattern (no change needed)
- [x] No schema changes needed
- [x] No API changes needed
- [x] Version string consistent across all 14 core files

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | ✅ PASS | 6.8s | Compiled successfully, all 23 routes generated |
| 2 | ✅ PASS | 6.3s | Compiled successfully, all 23 routes generated |
| 3 | ✅ PASS | 6.4s | Compiled successfully, all 23 routes generated |
