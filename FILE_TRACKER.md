# WSH v4.5.4 — File Tracker

> Complete inventory of files modified, created, and verified in this release.

---

## Patch Information

| Field | Value |
|-------|-------|
| **Version** | 4.4.11 |
| **Release Date** | 2026-06-24 |
| **Previous Version** | 4.4.10 |
| **Release Type** | Mind map anchoring fix, animation smoothing, deployment/runbook updates |
| **Git Remote** | `github.com/141stfighterwing-collab/WSH.git` |
| **Branch** | `main` |

---

## Modified Files

### Core Application Code

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 1 | `src/components/wsh/MindMap.tsx` | ~120 | **Change** | Fixed line/node anchoring and reduced per-frame animation rerender stutter |
| 2 | `src/proxy.ts` | Rename/new | **Runtime** | Replaced deprecated Next.js middleware convention with proxy |

### Documentation / Release Trail

| # | File | Lines Changed | Change Type | Description |
|---|------|---------------|-------------|-------------|
| 3 | `docs/WSH_UPDATE_RUNBOOK.md` | +61 | **Docs** | Added preflight/update/verify checklist for Windows Docker host updates |
| 4 | `RELEASE-NOTES-4.4.11.md` | Expanded | **Docs** | Added mind map, deployment, and proxy convention notes |
| 5 | `CHANGELOG.md` | Expanded | **Release** | Added 4.4.11 mind map/deployment validation notes |
| 6 | `CODING_CHANGES.md` | Prepend | **Release** | Added technical record for anchoring/stutter/proxy work |
| 7 | `FILE_TRACKER.md` | Rewrite | **Release** | Updated file inventory for 4.4.11 |

---

## New Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `src/proxy.ts` | Next.js 16 replacement for deprecated middleware naming |
| 2 | `RELEASE-NOTES-4.4.11.md` | Release summary and operator notes for 4.4.11 |

---

## Verification Checklist

- [x] Mind map connections remain anchored to moving nodes in the shared transform layer
- [x] Mind map animation path no longer depends on per-frame React state rerenders
- [x] Next.js build no longer emits the middleware deprecation warning
- [x] `npm run build` passes after anchoring fix
- [x] `npm run build` passes after animation smoothing fix
- [x] Remote Docker deployment on `10.30.1.15` reports healthy on `4.4.11`
- [x] Database connectivity survived remote app-only redeploy

---

## Build Verification

| Iteration | Result | Time | Notes |
|-----------|--------|------|-------|
| 1 | PASS | ~43s | Local production build passed after middleware → proxy fix |
| 2 | PASS | ~35s | Local production build passed after mind map anchoring fix |
| 3 | PASS | ~33s | Local production build passed after animation smoothing fix |
| 4 | PASS | Remote | `10.30.1.15` healthy on `4.4.11` with DB connected after app-only redeploy |
