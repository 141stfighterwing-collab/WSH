# WSH v4.3.9 — File Tracker

> Complete inventory of files modified, created, and verified in this patch release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.3.9 |
| **Release Date** | 2026-04-21 |
| **Previous Version** | 4.3.8 |
| **Release Type** | Patch (bug fixes + version bump) |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `src/components/wsh/editors/DocumentManager.tsx` | ~20 | **Fix** | Blob URL ref tracking, loading states, View button condition |
| 2 | `src/app/api/documents/upload/route.ts` | ~5 | **Fix** | Image file type whitelist, error resilience |
| 3 | `src/lib/pdfProcessor.ts` | ~10 | **Fix** | Binary skip for image/binary file types |
| 4 | `src/app/api/documents/[id]/file/route.ts` | ~5 | **Fix** | Image MIME type mappings |

### Version Bump (14 files)

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 5 | `package.json` | 1 | **Version** | `"version": "4.3.8"` → `"4.3.9"` |
| 6 | `Dockerfile` | 2 | **Version** | `ARG BUILD_VERSION=4.3.8` → `4.3.9` (both stages) |
| 7 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag `4.3.8` → `4.3.9` |
| 8 | `docker-entrypoint.sh` | 2 | **Version** | Header version references |
| 9 | `install.sh` | ~5 | **Version** | Script header, banner, image tags |
| 10 | `install.ps1` | ~5 | **Version** | Script header, banner, image tags |
| 11 | `update.sh` | 2 | **Version** | Script header + banner |
| 12 | `update.ps1` | 2 | **Version** | Script header + banner |
| 13 | `test-env.sh` | 2 | **Version** | Script header + banner |
| 14 | `test-env.ps1` | 2 | **Version** | Script header + banner |
| 15 | `src/app/api/health/route.ts` | 1 | **Version** | `version: '4.3.8'` → `version: '4.3.9'` |
| 16 | `src/app/api/admin/system/route.ts` | 1 | **Version** | `version: '4.3.8'` → `version: '4.3.9'` |
| 17 | `README.md` | ~5 | **Version** | Title, image tags, API example version references |
| 18 | `CHANGELOG.md` | +20 | **Append** | Added v4.3.9 release entry |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 19 | `CODING_CHANGES.md` | +50 | **Prepend** | New v4.3.9 section with blob URL fix, View button, server-side changes |
| 20 | `FILE_TRACKER.md` | Rewrite | **Rewrite** | Updated to v4.3.9 with new file inventory |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| — | *None* | This release only modified existing files — no new files were created |

---

## Files Unchanged (Verified)

These files were reviewed and confirmed to require no modifications:

| File | Reason |
|------|--------|
| `src/store/wshStore.ts` | No global store changes needed |
| `src/components/wsh/LeftSidebar.tsx` | No changes needed — document changes are in editor component |
| `src/components/wsh/RightSidebar.tsx` | No sidebar changes in this patch |
| `src/components/wsh/QuickReferences.tsx` | No changes to this component |
| `prisma/schema.prisma` | No database schema changes |
| `src/app/page.tsx` | No page-level changes |
| `src/app/layout.tsx` | No layout changes |
| `src/app/globals.css` | No style changes needed |
| `tailwind.config.ts` | No Tailwind configuration changes |
| `next.config.ts` | No Next.js configuration changes |
| `src/middleware.ts` | No middleware changes |
| `src/lib/db.ts` | No database client changes |
| `src/lib/utils.ts` | No utility changes |
| `.env.example` | No environment variable changes |
| `DOCS.md` | No documentation changes beyond CHANGELOG |

---

## Verification Checklist

- [x] `DocumentManager.tsx` blob URL memory leak fixed with `useRef` pattern
- [x] View button visible for all viewable file types regardless of status
- [x] Image upload whitelist includes PNG, JPG, JPEG, GIF, WEBP
- [x] Processing failures mark documents as 'ready' (not 'error')
- [x] Image/binary files skip text extraction in pdfProcessor
- [x] Image MIME type mappings added to file serving route
- [x] No references to `4.3.8` remain outside CHANGELOG.md (historical)
- [x] Version string consistent across all 14 core files
- [x] CHANGELOG.md follows Keep a Changelog format
- [x] Git status clean (all changes staged for commit)

---

## Git Commit Info

```
commit (pending)
Author: WSH Contributor
Date: 2026-04-21

fix: PDF embedding, View button visibility, image upload support (v4.3.9)

- Fixed blob URL memory leak in DocumentViewer (useRef pattern)
- View button now shows for all viewable files regardless of status
- Documents with failed extraction marked as 'ready' (not 'error')
- Server upload whitelist: added PNG, JPG, JPEG, GIF, WEBP
- Image/binary files skip text extraction entirely
- Added image MIME type mappings to file serving route
- Enhanced loading states in document viewer
- Version bumped 4.3.8 → 4.3.9 across all 16 files
- Updated CHANGELOG.md, CODING_CHANGES.md, FILE_TRACKER.md
```
