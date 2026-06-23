# WSH 4.4.11 Release Notes

Date: 2026-06-23

## Highlights

This release focuses on release hardening, deployment safety, and startup/runtime validation on top of the recent performance improvements.

## Included
- Version alignment across runtime, Docker, and health/system metadata
- Hardened Docker Compose defaults for secrets and bootstrap admin values
- Safer Docker entrypoint behavior for Prisma helper scripts
- Clean handling when document search tables are not present yet
- Improved login error reporting for missing JWT secret conditions
- Release checklist added for 4.4.11 validation and rollout tracking

## Validation Summary
- Docker production build passed
- App container reached healthy state
- `/api/health` returned healthy status
- login endpoint returned `200 OK` with JWT token
- startup logs no longer show the earlier entrypoint syntax failures

## Operator Impact
- You must provide a real `JWT_SECRET` for deployments
- Docker Compose no longer falls back to insecure default admin/bootstrap values
- Startup now skips document search index creation cleanly when the `document_chunks` table is not present

## Recommended After Upgrade
- Run a manual browser smoke pass
- Review `RELEASE-CHECKLIST.md` before public announcement
- Set production secrets explicitly in `.env` or deployment config
