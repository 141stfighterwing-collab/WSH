# WSH 4.4.12 Release Notes

Date: 2026-06-25

## Highlights

This release upgrades WSH's galaxy mind map from a simple hub-and-spoke visual to a hybrid graph + orbital experience inspired by the cloud Weavenote project while keeping the self-hosted implementation native to WSH.

## Included
- Hybrid orbital mind map in `src/components/wsh/MindMap.tsx`
- Center-star note model with multi-connected notes orbiting the current center
- Calmer static placement for less-connected notes instead of forcing every note into motion
- Relationship scoring based on shared tags plus lightweight text similarity
- Runtime controls for:
  - stop/start orbiting
  - stop/start galaxy rotation
  - zoom in
  - zoom out
  - reset view
- Double-click recentering so any note can become the active galaxy center
- Version alignment across package metadata, Docker metadata, and runtime health/system endpoints
- Release trail updates for changelog, coding changes, and file tracking

## Validation Summary
- WSH source updated for release version `4.4.12`
- Runtime/version metadata updated in:
  - `package.json`
  - `Dockerfile`
  - `docker-compose.yml`
  - `docker-entrypoint.sh`
  - `/api/health`
  - `/api/admin/system`
  - `README.md`
- Release documentation updated for the hybrid mind map upgrade

## Operator Impact
- Mind map users now get a more readable relationship layout with less visual chaos
- Orbiting and whole-galaxy rotation can be paused independently
- The release version exposed by health/system endpoints should report `4.4.12` after rebuild/redeploy

## Recommended After Upgrade
- Run `npm run build` in the WSH repo before deployment if local deps are available
- Smoke-test the mind map overlay with a realistic note set
- Confirm `/api/health` reports `4.4.12`
- Confirm the deployed container image tag is `weavenote:4.4.12`
