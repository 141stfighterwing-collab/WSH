# WSH v4.4.12 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.12 |
| **Release Date** | 2026-06-25 |
| **Previous Version** | 4.4.11 |
| **Release Type** | Hybrid galaxy mind map upgrade, release metadata alignment, patch note refresh |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `src/components/wsh/MindMap.tsx` | ~300 | **Feature** | Reworked the WSH galaxy map into a hybrid orbital + graph layout with recentering, motion controls, and calmer static notes |
| 2 | `src/app/api/health/route.ts` | 1 | **Version** | Updated runtime version fallback to `4.4.12` |
| 3 | `src/app/api/admin/system/route.ts` | 1 | **Version** | Updated system route version fallback to `4.4.12` |

### Build / Deployment Metadata

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 4 | `package.json` | 1 | **Version** | Bumped package version to `4.4.12` |
| 5 | `Dockerfile` | Small | **Version** | Updated Docker build metadata to `4.4.12` |
| 6 | `docker-compose.yml` | Small | **Version** | Updated build arg and image tag to `weavenote:4.4.12` |
| 7 | `docker-entrypoint.sh` | Small | **Version** | Updated entrypoint banner/version fallback to `4.4.12` |
| 8 | `README.md` | Multi | **Docs** | Updated user-facing version and image-tag references to `4.4.12` |

### Documentation / Release Trail

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 9 | `RELEASE-NOTES-4.4.12.md` | New | **Docs** | Added dedicated release notes for the hybrid galaxy mind map patch |
| 10 | `CHANGELOG.md` | Prepend | **Release** | Added 4.4.12 patch notes |
| 11 | `CODING_CHANGES.md` | Prepend | **Release** | Added technical record for the hybrid mind map upgrade |
| 12 | `FILE_TRACKER.md` | Rewrite | **Release** | Updated file inventory for 4.4.12 |
| 13 | `RELEASE-CHECKLIST.md` | Small | **Release** | Updated target release line and release-hygiene tracking |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `RELEASE-NOTES-4.4.12.md` | Release summary and operator notes for the hybrid WSH galaxy mind map upgrade |

---

## Verification Checklist

- [x] WSH mind map upgraded to a hybrid graph + orbital layout
- [x] Major and minor orbiters are separated from calmer static notes
- [x] Users can pause orbiting independently from whole-galaxy rotation
- [x] Users can zoom in, zoom out, reset view, and double-click to recenter the map
- [x] Runtime version metadata updated to `4.4.12`
- [x] Docker build/image metadata updated to `4.4.12`
- [x] Release notes, changelog, coding notes, and tracker updated for the patch
- [ ] Local build verification still recommended before deployment
- [ ] Browser/manual smoke pass still recommended before public announcement

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | Metadata Updated | N/A | Package, Docker, runtime API, and docs aligned to `4.4.12` |
| 2 | Code Updated | N/A | Hybrid galaxy mind map integrated into WSH source |
| 3 | Release Trail Updated | N/A | Patch notes, changelog, coding notes, and tracker aligned |
