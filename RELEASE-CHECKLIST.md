# WSH Release Checklist

Target release line: `4.4.15`

This checklist is split into:
- **MUST fixes** — blockers for calling a release ready
- **SHOULD fixes** — strongly recommended before broader/public rollout
- **Verification** — practical release gate checks

---

## MUST fixes

### 1) Version consistency
- [x] Align `package.json` version to the intended release line
- [x] Align `Dockerfile` build version metadata
- [x] Align `docker-compose.yml` image/build tags
- [x] Align `/api/health` version fallback
- [x] Align `/api/admin/system` version fallback
- [x] Align README version-tagged image references

Notes:
- Runtime/build metadata validated at `4.4.11`

### 2) Secure deployment defaults
- [x] Remove insecure Docker Compose fallback for `JWT_SECRET`
- [x] Remove insecure Docker Compose fallback for `ADMIN_DEFAULT_USERNAME`
- [x] Remove insecure Docker Compose fallback for `ADMIN_DEFAULT_EMAIL`
- [x] Remove insecure Docker Compose fallback for `ADMIN_DEFAULT_PASSWORD`
- [x] Remove embedded fallback for `GEMINI_API_KEY`
- [x] Preserve explicit bootstrap-only admin creation behavior

Notes:
- Local validation used a real `.env` JWT secret
- `.env` was **not** committed to GitHub

### 3) Startup/runtime hardening
- [x] Fix Docker entrypoint Prisma shell escaping
- [x] Remove startup `SyntaxError` failures in entrypoint helper scripts
- [x] Handle missing `document_chunks` table safely during startup
- [x] Avoid noisy relation-missing startup failure for search indexes
- [x] Verify app still becomes healthy after startup hardening

Notes:
- Current startup behavior logs a clean skip when `document_chunks` is absent

### 4) Core auth/runtime validation
- [x] `/api/health` returns healthy
- [x] login endpoint returns `200 OK`
- [x] JWT signing works with a real secret
- [x] login error path no longer mislabels auth-secret issues as DB outages

### 5) Docker release gate
- [x] Docker image builds successfully
- [x] Postgres service becomes healthy
- [x] App container becomes healthy
- [x] App serves HTTP after container startup

---

## SHOULD fixes

### 1) Browser/manual smoke pass
- [ ] Load app in browser
- [ ] Confirm login screen/UI flow works end-to-end
- [ ] Confirm notes list loads correctly
- [ ] Confirm note detail opens correctly
- [ ] Confirm edit/save works in primary note flow
- [ ] Confirm refresh persistence works
- [ ] Confirm notebook view behaves correctly
- [ ] Confirm mind-map/editor entry flow works if release-critical

### 2) Lint/code health triage
- [ ] Run `npm run lint` to completion and capture the remaining issue list
- [ ] Fix highest-risk core-path issues first
- [ ] Triage React effect/state warnings in actively used UI paths
- [ ] Triage variable-order / import-style issues that affect maintainability

### 3) Release hygiene / docs polish
- [x] Add/update release notes for `4.4.15`
- [ ] Summarize hardening changes in changelog/release notes
- [ ] Confirm README deployment/security wording matches current behavior
- [ ] Confirm first-run bootstrap instructions match hardened defaults

### 4) Framework cleanup
- [ ] Replace deprecated Next `middleware` convention with `proxy` when ready

### 5) Dependency/security hygiene
- [ ] Review `npm audit` findings
- [ ] Decide whether any high-severity items are release-relevant
- [ ] Upgrade Prisma / dependencies only if tested safely

---

## Verification gate

Use this as the practical release gate:

### Required before calling release-ready
- [x] Build succeeds
- [x] Container startup succeeds
- [x] Health endpoint succeeds
- [x] Login succeeds
- [x] Startup logs are free of syntax failures
- [x] Startup no longer hard-fails when search tables are absent
- [x] Secure runtime secret behavior is enforced

### Recommended before public announcement
- [ ] Browser smoke pass complete
- [ ] Lint triage complete or consciously waived
- [ ] Release notes/changelog reviewed
- [ ] Operator setup instructions reviewed once more

---

## Current status summary

### MUST fixes
All targeted MUST-fix items above are complete.

### SHOULD fixes
Still recommended before a polished public announcement, but not required for a functioning release candidate.

---

## GitHub validation history

Recent hardening/validation commits:
- `78b3345` — Align WSH 4.4.7 docs/build tags and fix ProjectEditor render component
- `b8bc657` — Fix docker entrypoint Prisma shell escaping
- `5d2db6b` — Harden 4.4.11 release config and fix startup/login validation
