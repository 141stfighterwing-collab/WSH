# WSH v4.4.1 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.1 |
| **Release Date** | 2026-04-21 |
| **Previous Version** | 4.4.0 |
| **Release Type** | Patch (note folder DnD + folder assignment fix + version bump) |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `prisma/schema.prisma` | ~5 | **Feature** | Added folderId relation to Document, documents to Folder |
| 2 | `src/app/api/documents/route.ts` | ~15 | **Feature** | Folder filtering, folder relation in response |
| 3 | `src/app/api/documents/[id]/route.ts` | ~20 | **Feature** | New PUT endpoint for folder/title updates |
| 4 | `src/app/api/folders/route.ts` | ~5 | **Feature** | Document unlink on folder delete |
| 5 | `src/components/wsh/editors/DocumentManager.tsx` | ~200 | **Feature** | Folder filter bar, drag-drop, assignment dropdown, badges |

### Version Bump (14 files)

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 6 | `package.json` | 1 | **Version** | `"version": "4.3.9"` → `"4.4.0"` |
| 7 | `package-lock.json` | 2 | **Version** | Root package version + lockfile entry |
| 8 | `Dockerfile` | 2 | **Version** | `ARG BUILD_VERSION=4.3.9` → `4.4.0` (both stages) |
| 9 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag `4.3.9` → `4.4.0` |
| 10 | `docker-entrypoint.sh` | 2 | **Version** | Header version references |
| 11 | `install.sh` | ~5 | **Version** | Script header, banner, image tags |
| 12 | `install.ps1` | ~5 | **Version** | Script header, banner, image tags |
| 13 | `update.sh` | 2 | **Version** | Script header + banner |
| 14 | `update.ps1` | 2 | **Version** | Script header + banner |
| 15 | `test-env.sh` | 2 | **Version** | Script header + banner |
| 16 | `test-env.ps1` | 2 | **Version** | Script header + banner |
| 17 | `src/app/api/health/route.ts` | 1 | **Version** | `version: '4.3.9'` → `version: '4.4.0'` |
| 18 | `src/app/api/admin/system/route.ts` | 1 | **Version** | `version: '4.3.9'` → `version: '4.4.0'` |
| 19 | `README.md` | ~5 | **Version** | Title, image tags, API example version references |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 20 | `CHANGELOG.md` | +20 | **Prepend** | Added v4.4.0 release entry |
| 21 | `CODING_CHANGES.md` | +72 | **Prepend** | New v4.4.0 section with schema, API, UI changes |
| 22 | `FILE_TRACKER.md` | Rewrite | **Rewrite** | Updated to v4.4.0 with new file inventory |

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
| `src/components/wsh/LeftSidebar.tsx` | No sidebar changes in this release |
| `src/components/wsh/RightSidebar.tsx` | No sidebar changes in this release |
| `src/components/wsh/QuickReferences.tsx` | No changes to this component |
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

- [x] Prisma schema updated with folderId relation on Document model
- [x] GET /api/documents supports ?folderId= query parameter
- [x] PUT /api/documents/[id] endpoint created for metadata updates
- [x] DELETE /api/folders unlinks documents before deletion
- [x] Folder filter bar renders in DocumentManager Library tab
- [x] Drag-and-drop document-to-folder assignment works
- [x] Folder assignment dropdown on document rows works
- [x] Folder badges display on documents with folders
- [x] No references to `4.3.9` remain outside CHANGELOG.md and CODING_CHANGES.md (historical)
- [x] Version string consistent across all 14 core files
- [x] CHANGELOG.md follows Keep a Changelog format
- [x] CODING_CHANGES.md documents all schema, API, and UI changes
- [x] Database migration ready: `npx prisma db push`

---

## Git Commit Info

```
commit (pending)
Author: WSH Contributor
Date: 2026-04-21

feat: document folder organization (v4.4.0)

- Added folderId relation to Document model (Prisma schema)
- GET /api/documents now supports ?folderId= filtering
- New PUT /api/documents/[id] endpoint for metadata updates
- DELETE /api/folders now unlinks documents before deletion
- Folder filter bar in DocumentManager Library tab
- Drag-and-drop documents to folder pills
- Folder assignment dropdown on document rows
- Folder badges on documents
- Version bumped 4.3.9 → 4.4.0 across all 14 core files
- Updated CHANGELOG.md, CODING_CHANGES.md, FILE_TRACKER.md
```
