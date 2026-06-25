# WSH v4.4.13 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.13 |
| **Release Date** | 2026-06-25 |
| **Previous Version** | 4.4.12 |
| **Release Type** | Mind map smoothness improvements, checklist/list behavior polish, release metadata alignment |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `src/components/wsh/MindMap.tsx` | Small/targeted | **Performance** | Reduced per-frame DOM churn for node motion and label counter-rotation to improve galaxy-map smoothness |
| 2 | `src/components/wsh/NoteEditor.tsx` | Moderate | **UX** | Added checklist insertion and normalized bullet/numbered list behavior to act more like a standard note app |
| 3 | `src/app/api/health/route.ts` | 1 | **Version** | Updated runtime version fallback to `4.4.13` |
| 4 | `src/app/api/admin/system/route.ts` | 1 | **Version** | Updated system route version fallback to `4.4.13` |

### Build / Deployment Metadata

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 5 | `package.json` | 1 | **Version** | Bumped package version to `4.4.13` |
| 6 | `Dockerfile` | Small | **Version** | Updated Docker build metadata to `4.4.13` |
| 7 | `docker-compose.yml` | Small | **Version** | Updated build arg and image tag to `weavenote:4.4.13` |
| 8 | `docker-entrypoint.sh` | Small | **Version** | Updated entrypoint banner/version fallback to `4.4.13` |
| 9 | `README.md` | Multi | **Docs** | Updated user-facing version and image-tag references to `4.4.13` |

### Documentation / Release Trail

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 10 | `RELEASE-NOTES-4.4.13.md` | New | **Docs** | Added dedicated release notes for the interaction polish patch |
| 11 | `CHANGELOG.md` | Prepend | **Release** | Added 4.4.13 patch notes |
| 12 | `CODING_CHANGES.md` | Prepend | **Release** | Added technical record for mind map and editor behavior improvements |
| 13 | `FILE_TRACKER.md` | Rewrite | **Release** | Updated file inventory for 4.4.13 |
| 14 | `RELEASE-CHECKLIST.md` | Small | **Release** | Updated target release line and release-hygiene tracking |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `RELEASE-NOTES-4.4.13.md` | Release summary and operator notes for the interaction polish patch |

---

## Verification Checklist

- [x] Mind map motion path updated for smoother interaction
- [x] Bullet and numbered lists normalize more cleanly after editor input
- [x] Checklist insertion added to the editor toolbar
- [x] Runtime version metadata updated to `4.4.13`
- [x] Docker build/image metadata updated to `4.4.13`
- [x] Release notes, changelog, coding notes, and tracker updated for the patch
- [x] Local production build passed
- [ ] Live browser/manual smoke pass still recommended after deployment

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | Code Updated | N/A | Mind map smoothness and editor list/checklist behaviors updated |
| 2 | Version Aligned | N/A | Package, Docker, runtime API, and docs aligned to `4.4.13` |
| 3 | Local Build Passed | N/A | `npm run build` completed successfully on `4.4.13` |
