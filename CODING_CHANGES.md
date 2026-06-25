# WSH v4.4.14 — Coding Changes

## Overview
v4.4.14 upgrades the dashboard into a Full Intelligence Board that emphasizes actionable workspace insight over passive chart review.

## 1. WSHKeepsDashboard.tsx — command-center intelligence board

**File:** `src/components/wsh/WSHKeepsDashboard.tsx`

### Problem
The prior dashboard was strong on analytics but weak on prioritization. It showed charts and totals well, but it did not guide the user toward what actually mattered now.

### Fix
- redesigned the dashboard as a command-center style intelligence board
- added a new What Matters Now section
- added an Operational Signals section
- added an Active Work Queue for likely next-action notes
- added a Recent Intelligence section for higher-signal notes
- preserved and reorganized existing chart surfaces so the board still carries analytical depth

### Effect
The dashboard now behaves more like an executive/operational intelligence surface instead of a passive analytics page.

## 2. Versioning / release metadata — patch bump to 4.4.14

**Files:**
- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `docker-entrypoint.sh`
- `src/app/api/health/route.ts`
- `src/app/api/admin/system/route.ts`
- `README.md`

## 3. Release trail updates

**Files:**
- `RELEASE-NOTES-4.4.14.md`
- `CHANGELOG.md`
- `CODING_CHANGES.md`
- `FILE_TRACKER.md`
- `RELEASE-CHECKLIST.md`

---

# WSH v4.4.13 — Coding Changes

## Overview
v4.4.13 focuses on interaction quality: smoother mind map rendering and more natural note-editing behavior for bullets, numbering, and checklists.

## 1. MindMap.tsx — smoother animation path

**File:** `src/components/wsh/MindMap.tsx`

### Problem
The hybrid galaxy map looked good, but it was still doing more per-frame DOM work than necessary, especially while rotating labels and moving orbiting nodes.

### Fix
- shifted moving note updates toward transform-based writes instead of repeated left/top layout changes
- throttled counter-rotation label updates so labels are not rewritten every frame unnecessarily
- kept the existing orbit/rotation behavior while reducing animation churn

### Effect
The map should feel smoother and less jittery, especially on dense note sets or when orbit and rotation are both active.

## 2. NoteEditor.tsx — checklist + cleaner list behavior

**Files:**
- `src/components/wsh/NoteEditor.tsx`

### Problem
The editor relied on raw browser execCommand behavior for lists, which can make bullets and numbering feel inconsistent compared with a modern notes app. It also lacked a dedicated checklist tool.

### Fix
- added a dedicated checklist toolbar button
- added post-input list normalization for bullet and numbered lists
- reinforced list spacing and indentation styling so rendered note content behaves more predictably

### Effect
Bullets, numbering, and checklists now behave more like expected note-taking primitives instead of fragile rich-text artifacts.

## 3. Versioning / release metadata — patch bump to 4.4.13

**Files:**
- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `docker-entrypoint.sh`
- `src/app/api/health/route.ts`
- `src/app/api/admin/system/route.ts`
- `README.md`

### Changed
- bumped release metadata from `4.4.12` to `4.4.13`
- aligned Docker build args, image tags, runtime version fallbacks, and README references

## 4. Release trail updates

**Files:**
- `RELEASE-NOTES-4.4.13.md`
- `CHANGELOG.md`
- `CODING_CHANGES.md`
- `FILE_TRACKER.md`
- `RELEASE-CHECKLIST.md`

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/components/wsh/MindMap.tsx` | Smoothed the hybrid galaxy animation path by reducing DOM churn during orbit/rotation updates |
| 2 | `src/components/wsh/NoteEditor.tsx` | Added checklist insertion and normalized bullet/numbered list behavior |
| 3 | `package.json` | Version bump to 4.4.13 |
| 4 | `Dockerfile` | Build version bump to 4.4.13 |
| 5 | `docker-compose.yml` | Build arg and image tag bump to 4.4.13 |
| 6 | `docker-entrypoint.sh` | Entrypoint version banner bump to 4.4.13 |
| 7 | `src/app/api/health/route.ts` | Runtime version fallback bump to 4.4.13 |
| 8 | `src/app/api/admin/system/route.ts` | System route version fallback bump to 4.4.13 |
| 9 | `README.md` | Updated user-facing version references to 4.4.13 |
| 10 | `RELEASE-NOTES-4.4.13.md` | Added patch notes for interaction polish release |
| 11 | `CHANGELOG.md` | Added 4.4.13 entry |
| 12 | `FILE_TRACKER.md` | Updated release inventory |
| 13 | `RELEASE-CHECKLIST.md` | Updated target release line |

---

# WSH v4.4.12 — Coding Changes

## Overview
v4.4.12 upgrades the WSH galaxy map into a hybrid graph + orbital interface inspired by the cloud Weavenote mind map model, while keeping the self-hosted implementation native to WSH and adding a full patch-release trail for deployment.

## 1. MindMap.tsx — hybrid graph + orbital galaxy UI

**File:** `src/components/wsh/MindMap.tsx`

### Problem
The previous WSH mind map was a clean ambient galaxy view, but it still treated the whole note set as a mostly uniform hub-and-spoke orbit. That made dense note collections feel flatter than the newer Weavenote relationship model and gave users limited control over motion.

### Fix
- replaced the single-style hub-spoke layout with a hybrid note graph model
- score note relationships using shared tags and lightweight text similarity
- select a center-star note automatically, with double-click recentering for any note
- assign notes into roles:
  - `center`
  - `orbiter-major`
  - `orbiter-minor`
  - `static`
- animate only the orbital roles while leaving less-connected notes calmer
- added direct UI controls for orbit pause/resume, galaxy rotation toggle, zoom in, zoom out, and reset

### Effect
The mind map is now more readable, more expressive, and closer to the cloud Weavenote relationship feel without forcing unrelated notes into constant motion.

## 2. Versioning / release metadata — patch bump to 4.4.12

**Files:**
- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `docker-entrypoint.sh`
- `src/app/api/health/route.ts`
- `src/app/api/admin/system/route.ts`
- `README.md`

### Changed
- bumped release metadata from `4.4.11` to `4.4.12`
- aligned Docker build args and image tags with the new patch version
- aligned health/system endpoint fallback versions
- aligned user-facing README release references

## 3. Release trail updates

**Files:**
- `RELEASE-NOTES-4.4.12.md`
- `CHANGELOG.md`
- `CODING_CHANGES.md`
- `FILE_TRACKER.md`
- `RELEASE-CHECKLIST.md`

### Changed
- added dedicated release notes for the hybrid orbital mind map upgrade
- documented the new patch release in the changelog
- updated file inventory and release-checklist target line to the new version

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/components/wsh/MindMap.tsx` | Reworked the WSH galaxy map into a hybrid orbital/graph layout with pause, rotation, zoom, reset, and recenter controls |
| 2 | `package.json` | Version bump to 4.4.12 |
| 3 | `Dockerfile` | Build version bump to 4.4.12 |
| 4 | `docker-compose.yml` | Build arg and image tag bump to 4.4.12 |
| 5 | `docker-entrypoint.sh` | Entrypoint version banner bump to 4.4.12 |
| 6 | `src/app/api/health/route.ts` | Runtime version fallback bump to 4.4.12 |
| 7 | `src/app/api/admin/system/route.ts` | System route version fallback bump to 4.4.12 |
| 8 | `README.md` | Updated user-facing version references to 4.4.12 |
| 9 | `RELEASE-NOTES-4.4.12.md` | Added patch notes for the hybrid mind map upgrade |
| 10 | `CHANGELOG.md` | Added 4.4.12 entry |
| 11 | `FILE_TRACKER.md` | Updated release inventory |
| 12 | `RELEASE-CHECKLIST.md` | Updated release target line and release-hygiene note |

---

# WSH v4.4.11 — Coding Changes

## Overview
v4.4.11 extends the recent note-performance work with mind map correctness, smoother animation behavior, safer deployment documentation, and a Next.js runtime convention update.

## 1. MindMap.tsx — line anchoring corrected

**File:** `src/components/wsh/MindMap.tsx`

### Problem
The desktop mind map drew SVG lines in a different coordinate space from the rendered note nodes. Once transforms/rotation were applied, edges could drift away from the nodes they were supposed to connect.

### Fix
- moved SVG edge rendering into the same transformed local layer as the nodes
- introduced a local hub node model at origin coordinates
- made edge endpoints use the same node offsets that drive note button placement
- preserved click-to-open behavior and the existing modal shell

### Effect
Connection lines now stay visually attached to the moving nodes instead of lagging behind or pointing at stale positions.

## 2. MindMap.tsx — animation stutter reduced

**File:** `src/components/wsh/MindMap.tsx`

### Problem
The rotating mind map view updated React state on every animation frame, forcing the whole component tree to rerender continuously. That is expensive for a dense node/edge overlay and causes lag or visible stutter.

### Fix
- removed per-frame React state updates for rotation
- updated the orbit layer transform directly through refs
- updated hub/node label counter-rotation through direct DOM style writes
- added `will-change: transform` hints on animated elements

### Effect
The ambient rotation path should feel noticeably smoother because animation no longer depends on full React rerenders every frame.

## 3. Runtime convention update — middleware to proxy

**File:** `src/proxy.ts` (renamed from `src/middleware.ts`)

### Changed
- migrated the app from deprecated Next.js `middleware` naming to the newer `proxy` convention
- preserved the same API auth enforcement behavior
- removed the build-time deprecation warning under Next.js 16

## 4. Deployment/runbook updates

**Files:**
- `docs/WSH_UPDATE_RUNBOOK.md`
- `RELEASE-NOTES-4.4.11.md`
- `CHANGELOG.md`
- `CODING_CHANGES.md`

### Changed
- added a concrete preflight → update → verify checklist for the Windows Docker host
- documented the safe app-only upgrade path for `10.30.1.15`
- recorded the mind map anchoring and animation fixes in the release trail

## 5. Validation

### Verified
- `npm run build` passed after the anchoring fix
- `npm run build` passed again after the animation/stutter fix
- live Docker deployment on `10.30.1.15` reports healthy on `4.4.11`
- database connectivity remained intact after app-only redeploy

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/components/wsh/MindMap.tsx` | Fixed edge/node anchoring and reduced animation rerender stutter |
| 2 | `src/proxy.ts` | Replaced deprecated middleware convention |
| 3 | `docs/WSH_UPDATE_RUNBOOK.md` | Added preflight/update/verify checklist |
| 4 | `RELEASE-NOTES-4.4.11.md` | Expanded 4.4.11 release notes |
| 5 | `CHANGELOG.md` | Added 4.4.11 deployment and mind map notes |
| 6 | `CODING_CHANGES.md` | Added this technical record |

---

# WSH v4.4.10 — Coding Changes

## Overview
v4.4.10 fixes the Quick References feature path so selecting a quick reference from the sidebar actually populates the note editor.

## 1. NoteEditor.tsx — add Quick Reference event listener

**File:** `src/components/wsh/NoteEditor.tsx`

### Problem
`QuickReferences.tsx` dispatched a browser event:
- `wsh:use-quick-ref`

But the note editor was not listening for that event, so clicking **Use** did nothing visible for the user.

### Fix
Added a `useEffect` listener in `NoteEditor.tsx` that:
- listens for `wsh:use-quick-ref`
- reads the selected reference payload
- sets the editor title
- sets the editor content
- sets raw text content
- sets the note type
- clears the active note ID so it behaves like loading a fresh editor draft
- shows a short status message confirming load

### Effect
Quick references now actually flow into the editor as intended.

## 2. QuickReferences.tsx — small cleanup

**File:** `src/components/wsh/QuickReferences.tsx`

### Changed
- removed unused `isAdding` state path left behind in the component

## 3. Versioning / release trail

**Files:**
- `package.json`
- `CHANGELOG.md`
- `CODING_CHANGES.md`

### Changed
- bumped version from `4.4.9` to `4.4.10`
- added changelog entry for the Quick References fix
- added this technical patch note entry

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/components/wsh/NoteEditor.tsx` | Added listener for quick-reference use events and editor population logic |
| 2 | `src/components/wsh/QuickReferences.tsx` | Removed unused state path during fix |
| 3 | `package.json` | Version bump to 4.4.10 |
| 4 | `CHANGELOG.md` | Added 4.4.10 release notes |
| 5 | `CODING_CHANGES.md` | Added technical record for the fix |

---

# WSH v4.4.9 — Coding Changes

## Overview
v4.4.9 adds simple but important image guardrails for note content:

1. **Maximum 4 images per note**
2. **Maximum 5 MB per image attachment**

This keeps image-heavy notes from turning into giant payloads and provides predictable limits for performance.

## 1. NoteEditor.tsx — image count and size enforcement

**File:** `src/components/wsh/NoteEditor.tsx`

### Added
- `MAX_IMAGES_PER_NOTE = 4`
- `MAX_IMAGE_BYTES = 5 * 1024 * 1024`
- helper to count images currently embedded in the editor

### Changed
- attached image files are rejected if they exceed 5 MB
- attached image files are rejected if the note already contains 4 images
- URL-based image insertion is also blocked once the note reaches 4 images
- user gets explicit editor status feedback when either limit is hit

### Effect
- prevents runaway image stuffing into a single note/post
- keeps note size and editor responsiveness more predictable

## 2. Versioning / release trail

**Files:**
- `package.json`
- `CHANGELOG.md`
- `CODING_CHANGES.md`

### Changed
- bumped version from `4.4.8` to `4.4.9`
- added changelog entry for image limits
- added this coding change record

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/components/wsh/NoteEditor.tsx` | Enforced max-image count and per-image file-size guardrails |
| 2 | `package.json` | Version bump to 4.4.9 |
| 3 | `CHANGELOG.md` | Added 4.4.9 release notes |
| 4 | `CODING_CHANGES.md` | Added technical record for the image-limit patch |

---

# WSH v4.4.8 — Coding Changes

## Overview
v4.4.8 improves image handling in the note editor so image-heavy notes feel lighter and more practical:

1. **Client-side image compression for note attachments** reduces embedded payload size before images are inserted into note HTML.
2. **Resizable note images / initial width controls** let users tune image size more naturally inside notes instead of being stuck with full-width inserts.

## 1. New helper: src/lib/imageUtils.ts

**File:** `src/lib/imageUtils.ts`

### Added
- browser-side image loading helper
- client-side resize + re-encode flow for note images
- HTML builder for resizable note-image markup

### Effect
This keeps large pasted/attached images from bloating the saved note content as badly as before.

## 2. NoteEditor.tsx — smarter image insertion

**File:** `src/components/wsh/NoteEditor.tsx`

### Changed
- attached image files now go through optimization before insertion
- inserted images use resizable-friendly markup and width styling
- URL-based image inserts now allow the user to choose an initial width percentage
- editor status briefly reports compression savings after optimization succeeds

### Effect
- faster note save/load on image-heavy notes
- better visual control over image size directly in the note flow

## 3. Versioning / release trail

**Files:**
- `package.json`
- `CHANGELOG.md`
- `CODING_CHANGES.md`

### Changed
- bumped version from `4.4.7` to `4.4.8`
- added changelog entry for image compression/resizing improvements
- added this technical patch note entry

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/lib/imageUtils.ts` | New note-image optimization helpers |
| 2 | `src/components/wsh/NoteEditor.tsx` | Client-side image compression + resizable image insertion |
| 3 | `package.json` | Version bump to 4.4.8 |
| 4 | `CHANGELOG.md` | Added 4.4.8 release notes |
| 5 | `CODING_CHANGES.md` | Added technical record for the image-handling patch |

---

# WSH v4.4.7 — Coding Changes

## Overview
v4.4.7 addresses the top two publicly exposed security risks identified in the first WeaveNote security audit:

1. **Insecure JWT fallback secret** — `src/lib/auth.ts` previously allowed runtime operation with the known placeholder `change-me-in-production`, making session/token integrity dependent on a public default.
2. **Insecure admin bootstrap fallback** — `docker-entrypoint.sh` previously seeded a super-admin using hardcoded defaults (`admin` / `admin@example.com` / `admin123`) whenever no matching user existed.

This patch intentionally hardens only those two items first so the deployment can move in controlled security increments.

## 1. src/lib/auth.ts — Fail closed on JWT secret configuration

**File:** `src/lib/auth.ts`

### Problem
The JWT helper used:
```ts
const secret = process.env.JWT_SECRET || 'change-me-in-production';
```
That meant a public deployment could continue running with a known fallback secret if configuration drift or a missing env variable occurred.

### Fix
`getJWTSecret()` now:
- requires `process.env.JWT_SECRET` to exist
- rejects the placeholder value `change-me-in-production`
- throws immediately instead of silently accepting an insecure fallback

### Security effect
- removes token-signing with a public/default secret
- forces deployment correctness instead of tolerating insecure runtime state

## 2. docker-entrypoint.sh — Remove default admin bootstrap credentials

**File:** `docker-entrypoint.sh`

### Problem
The admin seeding logic previously used:
```js
const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
const email = process.env.ADMIN_DEFAULT_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
```
This allowed default bootstrap credentials to remain latent in a public deployment.

### Fix
The seeding logic now:
- first checks whether any `admin` or `super-admin` user already exists
- skips bootstrap seeding if one exists
- requires explicit `ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_EMAIL`, and `ADMIN_DEFAULT_PASSWORD` only when no admin exists yet
- refuses to seed an insecure default account when those values are missing
- logs a clear operator-facing message explaining why seeding was skipped

### Security effect
- removes hardcoded fallback admin credentials from bootstrap behavior
- preserves first-run bootstrap capability without accepting unsafe defaults
- keeps startup idempotent while failing safer

## 3. Versioning and release notes

**Files:**
- `package.json`
- `CHANGELOG.md`
- `CODING_CHANGES.md`

### Changes
- bumped version from `4.4.6` to `4.4.7`
- added a security-focused changelog entry documenting the two critical fixes
- added this coding changes entry so the remediation history is explicit and auditable

## Files Changed
| # | File | Description |
|---|------|-------------|
| 1 | `src/lib/auth.ts` | Removed insecure JWT fallback and enforced fail-closed secret checks |
| 2 | `docker-entrypoint.sh` | Removed default bootstrap admin fallbacks and required explicit bootstrap config |
| 3 | `package.json` | Version bump to 4.4.7 |
| 4 | `CHANGELOG.md` | Added 4.4.7 security release notes |
| 5 | `CODING_CHANGES.md` | Added technical record for the security patch |

---

# WSH v4.4.4 — Coding Changes

## Overview
v4.4.4 fixes THREE cascading issues that caused the Docker build to fail:

1. **`react-devtools-inline@4.4.1` was yanked from npm** — The `package-lock.json` pinned this transitive dependency to a version that no longer exists, causing `npm install` to fail with `ETARGET No matching version found`.
2. **`| tail -5` pipe hid the npm install error** — The Dockerfile piped `npm install` output through `tail`. Since shell returns the exit code of the LAST command in a pipeline, `tail`'s exit code (0) replaced `npm install`'s non-zero exit code. The build silently continued with 0 packages installed.
3. **`docker-entrypoint.sh` used stale prisma path** — Still referenced `node /app/node_modules/prisma/build/index.js` which doesn't exist in Docker.

## 1. package-lock.json — Regenerated

**File:** `package-lock.json`

### Problem
The lock file pinned `react-devtools-inline` to `4.4.1` (a transitive dependency of `@codesandbox/sandpack-react`). This version was yanked/unpublished from npm, causing:
```
npm error code ETARGET
npm error notarget No matching version found for react-devtools-inline@4.4.1.
```

### Fix
Deleted and regenerated the lock file. It now resolves to `react-devtools-inline@4.4.0` (the latest available version). Also fixes the version field mismatch (was `4.4.2`, now matches `package.json` at `4.4.4`).

## 2. Dockerfile — Removed error-hiding pipes

**File:** `Dockerfile`

### Problem
Three RUN commands piped npm output to `tail`:
```dockerfile
# deps stage (line 23):
npm install 2>&1 | tail -5

# runner stage (line 79):
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3

# runner stage prisma (line 92):
./node_modules/.bin/prisma generate 2>&1 | tail -1
```

When `npm install` fails, `tail` succeeds (exit 0). The shell `&&` chain sees success and continues. This means the build proceeds with NO `node_modules`, causing every subsequent step to fail with confusing errors like `chown: node_modules: No such file or directory`.

### Fix
Removed ALL `| tail` pipes. Now `npm install` errors are fully visible and cause the build to stop immediately:
```dockerfile
npm install 2>&1 && \
    echo "[2/6] ✓ npm install complete"
```

## 3. docker-entrypoint.sh — Fixed prisma CLI path

**File:** `docker-entrypoint.sh`

### Problem
Still used `PRISMA_CLI="node /app/node_modules/prisma/build/index.js"` from the v4.4.2 fix. This internal path doesn't exist in the Docker container's node_modules.

### Fix
```diff
-PRISMA_CLI="node /app/node_modules/prisma/build/index.js"
+PRISMA_CLI="./node_modules/.bin/prisma"
```
Also updated the pre-flight check from `-f` (file exists) to `-x` (executable exists).

## Files Changed
| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `package-lock.json` | Regenerated | Removed yanked dep version, updated to v4.4.4 |
| 2 | `Dockerfile` | ~8 | Removed `| tail` pipes, version bump to 4.4.4 |
| 3 | `docker-entrypoint.sh` | ~4 | Fixed prisma CLI path, version bump |

---

# WSH v4.4.3 — Coding Changes

## Overview
v4.4.3 improves the Docker build's resilience to stale layer cache. The v4.4.2 fix used an internal prisma path (`node_modules/prisma/build/index.js`) that doesn't exist when Docker reuses cached layers from a previous build. This version switches to the standard npm bin path and adds a self-healing fallback.

## 1. Dockerfile — Self-healing Prisma generate

**File:** `Dockerfile`

### Problem
v4.4.2 changed `npx prisma generate` to `node node_modules/prisma/build/index.js generate`. While this prevents npx from downloading Prisma v7.x, it fails when Docker's layer cache is stale — the cached `npm install` layer may not have the prisma package properly installed, causing `Cannot find module '/app/node_modules/prisma/build/index.js'`.

### Fix
Changed both prisma generate steps (builder stage + runner stage) to:
```dockerfile
if [ ! -x ./node_modules/.bin/prisma ]; then \
  echo "  [prisma] CLI missing from cache, installing prisma@^6..." && \
  npm install prisma@^6 --no-audit --no-fund 2>&1; \
fi && \
./node_modules/.bin/prisma generate 2>&1
```

This approach:
1. Checks if `node_modules/.bin/prisma` exists and is executable
2. If missing (stale cache), installs `prisma@^6` (matches package.json range)
3. Runs `./node_modules/.bin/prisma generate` (standard npm bin path)
4. Never uses `npx` (prevents v7.x download)

### Why ./node_modules/.bin/prisma
This is the standard path that npm creates for all CLI packages. On Alpine Linux, it's a shell script wrapper that correctly resolves the prisma binary. It's more robust than the internal `build/index.js` path because it's the officially supported way to invoke locally-installed npm CLIs.

## Files Changed
| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `Dockerfile` | ~15 | Self-healing prisma generate with fallback install |

---

# WSH v4.4.2 — Coding Changes

## Overview
v4.4.2 is a critical hotfix for a Docker build failure. The Dockerfile used `npx prisma generate` in two places (builder stage and runner stage). Since Prisma 7.x was released to npm, `npx` downloads v7.7.0 instead of using the locally-installed v6.x. Prisma 7 removed the `datasource.url` property from schema files, causing error P1012 and a failed Docker build.

## 1. Dockerfile — Replace npx with direct node invocation

**File:** `Dockerfile`

### Root Cause
`npx prisma generate` does NOT use the local `node_modules/prisma`. Instead, it checks npm and downloads the latest version. With Prisma 7.7.0 released, this downloads a breaking version that rejects `url = env("DATABASE_URL")` in `datasource db`.

### Fix
Both `npx prisma generate` calls replaced with `node node_modules/prisma/build/index.js generate`:
- **Line 42 (builder stage):** `npx prisma generate` → `node node_modules/prisma/build/index.js generate`
- **Line 81 (runner stage):** `npx prisma generate` → `node node_modules/prisma/build/index.js generate`

### Why This Works
The entrypoint (`docker-entrypoint.sh`) already used this exact pattern: `PRISMA_CLI="node /app/node_modules/prisma/build/index.js"`. This ensures the locally-installed Prisma CLI (v6.19.2 per package.json `^6.11.1`) is always used.

### No Other Changes
- No schema changes
- No API changes
- No UI changes
- The `prisma` npm package version range (`^6.11.1`) still resolves to v6.x — the issue was specifically with `npx` downloading independently

## Files Changed
| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `Dockerfile` | 2 | Replace `npx prisma generate` with direct node invocation |

---

# WSH v4.4.1 — Coding Changes

## Overview
v4.4.1 enables drag-and-drop folder organization for all note types (Quick, Code, Deep, Notebook, Project, Documents, AI Prompts). Previously, only Documents could be organized into folders via the DocumentManager. Now notes can be dragged onto folder pills in the grid or sidebar folders to organize them. Also fixes a bug where new notes were never assigned to the active folder.

## 1. NoteEditor — Fix Folder Assignment on Create
**File:** `src/components/wsh/NoteEditor.tsx`

### Bug
The `handleSave` function hardcoded `folderId: null` when creating new notes, ignoring the currently selected folder (`activeFolderId`).

### Fix
Changed line 315 from:
```
folderId: null,
```
to:
```
folderId: useWSHStore.getState().activeFolderId || null,
```

## 2. NotesGrid — Draggable Note Cards + Folder Drop Targets
**File:** `src/components/wsh/NotesGrid.tsx`

### Changes
- **NoteCard** is now `draggable` — added `onDragStart` prop that sets note ID in dataTransfer
- **Folder filter pills** are drop targets — `onDragOver`, `onDragLeave`, `onDrop` handlers on each pill
- **Visual feedback** — Dragged-over pills show dashed border + highlight; "Drop on a folder to move" hint text
- **Drag state tracking** — `draggedNoteId` and `dragOverFolderId` state variables
- **Folder assignment** — On drop, calls `updateNote(noteId, { folderId })` via existing store function
- **Folder badges** — Notes with a folderId show a small folder name badge in the card header
- **Drag handle** — Subtle `GripVertical` icon on hover at top-left of cards

## 3. Folders Sidebar — Drop Targets
**File:** `src/components/wsh/Folders.tsx`

### Changes
- **All Notes** button is a drop target — dropping a note here sets `folderId: null` (unfiles it)
- **Each folder button** is a drop target — dropping a note assigns it to that folder
- **Visual feedback** — Dashed border + highlight on drag-over; "drop to move" hint in section header
- **Drop handler** calls `updateNote(noteId, { folderId })`

## 4. No API Changes
The existing `PUT /api/notes` endpoint already supports `folderId` updates via the `updateNote` store function. No new endpoints or schema changes were needed.

## Files Changed
| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `src/components/wsh/NoteEditor.tsx` | 1 | Fix folderId on new note creation |
| 2 | `src/components/wsh/NotesGrid.tsx` | ~80 | Draggable cards, folder drop targets, badges |
| 3 | `src/components/wsh/Folders.tsx` | ~40 | Sidebar folder drop targets |

---

# WSH v4.4.0 — Coding Changes

## Overview
v4.4.0 adds full folder organization to the Documents tab. Documents can be assigned to folders (shared with the Notes folder system), filtered by folder in the Library tab, and organized via drag-and-drop or a dropdown menu. The feature reuses the existing Folder model from the Notes system.

## 1. Prisma Schema Changes
**File:** `prisma/schema.prisma`

### Document model — added folder relation
```
folderId     String?
folder       Folder?          @relation(fields: [folderId], references: [id])
@@index([folderId])
```

### Folder model — added documents relation
```
documents Document[]
```

### Migration required
Run `npx prisma db push` or create a migration to add the `folderId` column to the `Document` table.

## 2. API Changes

### GET /api/documents — Folder filtering
Added `?folderId=` query parameter:
- No param: return all documents
- `?folderId=<id>`: return documents in that folder
- `?folderId=none`: return documents with no folder (unfiled)
- Response now includes `folderId` and `folder` fields

### PUT /api/documents/[id] — New endpoint
Accepts JSON body with `folderId` and/or `title` to update document metadata.

### DELETE /api/folders — Document cleanup
Now also unlinks documents (`folderId → null`) before deleting a folder.

## 3. DocumentManager UI Overhaul
**File:** `src/components/wsh/editors/DocumentManager.tsx`

### New Folder Filter Bar
- "All" pill shows all documents
- "Unfiled" pill shows documents without a folder
- Folder pills for each existing folder (loaded from /api/folders)
- Active folder highlighted with primary color
- New folder creation with inline input

### Drag-and-Drop
- Documents are draggable (HTML5 drag API)
- Folder pills are drop targets
- Visual feedback: dashed border + "Drop here" hint when dragging over a folder
- Dropping a document on a folder pill assigns it via PUT API

### Folder Assignment Dropdown
- Click the folder icon on any document to open a dropdown
- Choose any folder or "Unfiled" to assign/unassign
- Click-outside dismissal

### Folder Badges
- Documents with a folder show a small folder name badge in the title row
- Folder pill color in the DocumentViewer overlay header

### Files Changed
| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `prisma/schema.prisma` | Schema | Added folderId relation to Document, documents to Folder |
| 2 | `src/app/api/documents/route.ts` | API | Folder filtering, folder relation in response |
| 3 | `src/app/api/documents/[id]/route.ts` | API | New PUT endpoint for folder/title updates |
| 4 | `src/app/api/folders/route.ts` | API | Document unlink on folder delete |
| 5 | `src/components/wsh/editors/DocumentManager.tsx` | UI | Folder filter bar, drag-drop, assignment dropdown, badges |

---

# WSH v4.3.9 — Coding Changes

## Overview
v4.3.9 fixes critical PDF embedding issues in the Documents tab. The DocumentViewer component had a blob URL memory leak that could cause viewing failures. Additionally, documents with failed text extraction were inaccessible — this fix ensures all uploaded files remain viewable regardless of processing status.

## 1. DocumentViewer Blob URL Fix
**File:** `src/components/wsh/editors/DocumentManager.tsx`

### Problem
The `useEffect` cleanup in `DocumentViewer` referenced the stale `blobUrl` state variable from the initial closure (always `null`). This meant `URL.revokeObjectURL()` was never called on the actual blob URL, causing:
- Memory leaks on repeated document viewing
- Potential browser instability with large files

### Fix
Introduced a `blobUrlRef` (useRef) to track the current blob URL independently of React state:
```tsx
const blobUrlRef = useRef<string | null>(null);
// ... in useEffect:
blobUrlRef.current = url;
setBlobUrl(url);
// ... in cleanup:
if (blobUrlRef.current) {
  URL.revokeObjectURL(blobUrlRef.current);
  blobUrlRef.current = null;
}
```

### Files Changed
| # | File | Lines Changed | Type | Description |
|---|------|---------------|------|-------------|
| 1 | `src/components/wsh/editors/DocumentManager.tsx` | ~20 | **Fix** | Blob URL ref tracking, loading states, View button condition |

## 2. View Button Always Visible for Viewable Files
**File:** `src/components/wsh/editors/DocumentManager.tsx`

### Problem
The "View" button was gated behind `doc.status === 'ready'`. If text extraction failed (status='error'), users couldn't view their uploaded PDFs.

### Fix
Changed the View button condition from `doc.status === 'ready' && isViewableFile(...)` to just `isViewableFile(...)`, so viewable files (PDF, images, text) always show the View button regardless of processing status.

## 3. Server-Side Changes
**Files:** `src/app/api/documents/upload/route.ts`, `src/lib/pdfProcessor.ts`, `src/app/api/documents/[id]/file/route.ts`

### Changes
- **Upload whitelist**: Added `png, jpg, jpeg, gif, webp` to allowed file types
- **Error resilience**: Processing failures now set status to 'ready' (not 'error') with errorMessage for reference
- **Binary skip**: Image and binary file types skip text extraction entirely in pdfProcessor
- **MIME types**: Added image MIME type mappings to file serving route

---

# WSH v4.3.8 — Coding Changes

> Patch release: "Things to do Today" todo checklist and version unification

---

## Summary

v4.3.8 adds a manual "Things to do Today" todo checklist to the right sidebar, allowing users to quickly add, check off, and manage daily tasks. Also unifies version references across all deployment scripts.

---

## 1. RightSidebar.tsx — TodoChecklist Component Added

**File:** `src/components/wsh/RightSidebar.tsx`
**Change Type:** Feature addition (~130 lines)
**Severity:** New feature

### What Changed

A new `TodoChecklist` function component was added to the RightSidebar, providing users with a daily interactive task checklist. The component appears as the second panel in the right sidebar (after Live Clock, before Today's Things).

### Detailed Changes

#### A. TodoItem Interface

```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  date: string;
}
```

#### B. Helper Functions

| Function | Purpose |
|----------|---------|
| `generateTodoId()` | Generates unique IDs using `crypto.randomUUID()` with a fallback to `Date.now().toString(36) + Math.random().toString(36)` for non-secure contexts |
| `getTodayDateStr()` | Returns today's date as `YYYY-MM-DD` string for day tracking and auto-reset comparison |
| `loadTodos()` | Loads todos from `localStorage` (`wsh-todo-today` key). Compares stored date against today's date — if they differ, clears the list (new day auto-reset). Updates `wsh-todo-date` key |
| `saveTodos()` | Serializes the todos array to JSON and writes to `localStorage` under `wsh-todo-today` key |

#### C. React Hooks Used

| Hook | Purpose |
|------|---------|
| `useState` | Manages `todos` array and `newTodoText` input state |
| `useEffect` | Loads todos from localStorage on mount; auto-saves to localStorage on every todos change |
| `useCallback` | Memoizes `addTodo`, `toggleTodo`, `deleteTodo`, `clearCompleted` handlers |
| `useRef` | References the text input for auto-focus after adding a todo |

#### D. Lucide Icons Imported

```typescript
import { CheckSquare, Square, Plus, X, Trash2, ListTodo } from 'lucide-react';
```

| Icon | Usage |
|------|-------|
| `ListTodo` | Section header icon (amber #F59E0B) |
| `Plus` | Add todo button |
| `Square` | Unchecked todo checkbox (amber border) |
| `CheckSquare` | Completed todo checkbox (green fill) |
| `X` | Delete individual item (shown on hover) |
| `Trash2` | "Clear done" button icon |

#### E. localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `wsh-todo-today` | `TodoItem[]` (JSON) | Stores the current day's todo items |
| `wsh-todo-date` | `string` | Stores the date (`YYYY-MM-DD`) when todos were last saved; used for auto-reset |

#### F. Auto-Clear on New Day

The `loadTodos()` function compares the stored date in `wsh-todo-date` against today's date. If they differ (it's a new day), it clears the stored todos and starts fresh:

```typescript
function loadTodos(): TodoItem[] {
  const storedDate = localStorage.getItem('wsh-todo-date');
  const today = getTodayDateStr();
  if (storedDate && storedDate !== today) {
    localStorage.removeItem('wsh-todo-today');
    localStorage.setItem('wsh-todo-date', today);
    return [];
  }
  // ... load from storage
}
```

#### G. Progress Bar

- Shows completion percentage as a filled bar
- CSS gradient: amber (#F59E0B) → green (#22C55E) based on percentage
- Updates in real-time as items are checked/unchecked
- Hidden when todo list is empty

#### H. UI Behavior

| Interaction | Behavior |
|-------------|----------|
| Type in input + press Enter | Adds new todo item (trimmed, non-empty validation) |
| Type in input + press Escape | Clears input text and blurs focus |
| Click checkbox | Toggles `completed` state (amber ↔ green) |
| Completed item | Renders with `line-through` and `opacity-50` |
| Hover over item | Shows red `X` delete button |
| Click `X` | Removes individual item |
| Click "Clear done" | Removes all items where `completed: true` |
| Empty state | Shows centered `ListTodo` icon with "No tasks yet. Add one above!" text |

#### I. RightSidebar Export Updated

The main `RightSidebar` component now includes `<TodoChecklist />` as the second panel:

```tsx
export default function RightSidebar() {
  return (
    <aside>
      <LiveClock />
      <TodoChecklist />
      {/* ... other panels */}
    </aside>
  );
}
```

---

## 2. Version Bump (4.3.7 → 4.3.8)

**Change Type:** Search-and-replace across 14 files
**Files Modified:**

| # | File | Locations Changed |
|---|------|-------------------|
| 1 | `package.json` | `version` field |
| 2 | `Dockerfile` | `ARG BUILD_VERSION` (stage 1 + stage 3) |
| 3 | `docker-compose.yml` | `BUILD_VERSION` arg + `image` tag |
| 4 | `docker-entrypoint.sh` | Header comment version reference |
| 5 | `install.sh` | Script header comment + banner + image tags |
| 6 | `install.ps1` | Script header comment + banner + image tags |
| 7 | `update.sh` | Script header comment + banner |
| 8 | `update.ps1` | Script header comment + banner |
| 9 | `test-env.sh` | Script header comment + banner |
| 10 | `test-env.ps1` | Script header comment + banner |
| 11 | `src/app/api/health/route.ts` | `version` in response JSON |
| 12 | `src/app/api/admin/system/route.ts` | `version` in response JSON |
| 13 | `CHANGELOG.md` | New v4.3.8 release entry |
| 14 | `README.md` | Title, image tags, health API example |

---

## 3. CHANGELOG.md

**Change Type:** Prepended new version entry
**Location:** Top of file (after header, before v4.3.6 entry)

Added a comprehensive v4.3.8 section documenting the new TodoChecklist feature, version bump, and sidebar layout update.

---

## 4. update.ps1 Validation

**Change Type:** Static analysis testing
**Status:** All 25+ checks passed across 2 test runs

The update script was validated with two independent test runs using static analysis (no Docker execution). Every check passed, confirming:
- Version string consistency across all 14 files
- Script syntax validity (PowerShell)
- Correct git pull, Docker build, and health check logic
- Proper error handling and recovery messages
