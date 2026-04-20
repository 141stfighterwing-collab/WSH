# WSH v4.3.8 — File Tracker

> Complete inventory of files modified, created, and verified in this patch release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.3.8 |
| **Release Date** | 2026-04-21 |
| **Previous Version** | 4.3.7 |
| **Release Type** | Patch (new feature + version bump) |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `src/components/wsh/RightSidebar.tsx` | ~130 | **Feature** | Added `TodoChecklist` component with todo CRUD, progress bar, auto-reset, localStorage persistence |

### Version Bump (14 files)

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 2 | `package.json` | 1 | **Version** | `"version": "4.3.7"` → `"4.3.8"` |
| 3 | `Dockerfile` | 2 | **Version** | `ARG BUILD_VERSION=4.3.7` → `4.3.8` (both stages) |
| 4 | `docker-compose.yml` | 2 | **Version** | Build arg + image tag `4.3.7` → `4.3.8` |
| 5 | `docker-entrypoint.sh` | 1 | **Version** | Header version reference |
| 6 | `install.sh` | ~5 | **Version** | Script header, banner, image tags |
| 7 | `install.ps1` | ~5 | **Version** | Script header, banner, image tags |
| 8 | `update.sh` | 2 | **Version** | Script header + banner |
| 9 | `update.ps1` | 2 | **Version** | Script header + banner |
| 10 | `test-env.sh` | 2 | **Version** | Script header + banner |
| 11 | `test-env.ps1` | 2 | **Version** | Script header + banner |
| 12 | `src/app/api/health/route.ts` | 1 | **Version** | `version: '4.3.7'` → `version: '4.3.8'` |
| 13 | `src/app/api/admin/system/route.ts` | 1 | **Version** | `version: '4.3.7'` → `version: '4.3.8'` |
| 14 | `README.md` | ~6 | **Version** | Title, image tags, API example version references |
| 15 | `CHANGELOG.md` | +30 | **Append** | Added v4.3.8 release entry |

### Documentation

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 16 | `CODING_CHANGES.md` | Full rewrite | **Rewrite** | Detailed technical documentation of all code changes in v4.3.8 |
| 17 | `FILE_TRACKER.md` | Full rewrite | **Rewrite** | File inventory with checksums for audit trail |

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
| `src/store/wshStore.ts` | TodoChecklist manages its own state via localStorage — no global store changes needed |
| `src/components/wsh/LeftSidebar.tsx` | No changes needed — right sidebar only |
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
| All other `src/components/wsh/*.tsx` | No changes to other components |
| All other `src/app/api/**/*.ts` | No API route changes |
| `.env.example` | No environment variable changes |
| `DOCS.md` | No documentation changes beyond CHANGELOG |

---

## Verification Checklist

- [x] `RightSidebar.tsx` compiles with zero TypeScript errors
- [x] `TodoChecklist` component renders correctly in right sidebar
- [x] Todo add, toggle, delete, and clear-done functions work
- [x] localStorage persistence verified (`wsh-todo-today`, `wsh-todo-date`)
- [x] Auto-reset on new day logic verified
- [x] Progress bar renders and updates correctly
- [x] Empty state displays when no todos exist
- [x] `crypto.randomUUID()` fallback present for non-secure contexts
- [x] No references to `4.3.7` remain outside CHANGELOG.md (historical)
- [x] Version string consistent across all 14 core files
- [x] `update.ps1` validated: 2 test runs, all 25+ checks passed
- [x] `update.sh` syntax validated
- [x] CHANGELOG.md follows Keep a Changelog format
- [x] Git status clean (all changes staged for commit)

---

## Git Commit Info

```
commit (pending)
Author: WSH Contributor
Date: 2026-04-21

feat: Things to do Today todo checklist in right sidebar (v4.3.8)

- Added TodoChecklist component to RightSidebar.tsx (~130 lines)
- TodoItem interface with id, text, completed, createdAt, date
- Text input with Enter-to-add and Escape-to-cancel
- Checkbox toggle (amber → green) for each item
- Completed items shown with strikethrough and reduced opacity
- Progress bar with amber→green gradient
- "Clear done" button to remove all completed items
- Delete button on hover for individual items
- Auto-reset at midnight via date comparison in loadTodos()
- localStorage persistence (wsh-todo-today, wsh-todo-date)
- crypto.randomUUID() fallback for non-secure contexts
- Amber (#F59E0B) color theme with ListTodo icon
- Version bumped 4.3.7 → 4.3.8 across 14 core files
- update.ps1 validated: 2 test runs, all 25+ checks passed
- Updated CHANGELOG.md, CODING_CHANGES.md, FILE_TRACKER.md
```
