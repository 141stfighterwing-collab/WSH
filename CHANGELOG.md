# Changelog

All notable changes to the WSH (WeaveNote Self-Hosted) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.1.5] - 2026-04-10

### ✨ Added

- **Mathematically precise SVG logo (Logo.tsx)** — Completely rebuilt the logo mark from the ground up using exact geometric coordinates instead of raster images. The new SVG logo consists of four precisely defined layers: (1) a **regular hexagon frame** computed from 6 trigonometric vertices with flat-top orientation, (2) **8 radial spider-web lines** extending from center to edge, (3) **3 concentric web rings** drawn with **quadratic Bézier curves** whose control points are displaced downward to simulate realistic gravity-driven droop (not flat arcs or straight lines), and (4) a **fountain-pen nib** constructed from cubic Bézier curves for the flared outline, with a horizontal band, center slit, and breather hole rendered as separate sub-elements. A 3-stop linear gradient (`#0ea5e9` → `#0284c7` → `#0f172a`) flows top-to-bottom across all elements, matching the teal-to-navy brand identity.

- **Typography lockup in header** — The header now displays a proper brand lockup alongside the SVG logo mark: "WeaveNote" in `text-xl font-extrabold tracking-tight` with "Your Ideas, Connected." tagline in `text-[10px] font-bold uppercase tracking-[0.2em]` beneath it. The text and logo are wrapped in a flex container with `gap-3` for consistent vertical centering at any screen size.

### 🔧 Changed

- **Header height increased from h-16 (64px) to h-20 (80px)** — The taller header gives the logo mark and text lockup proper breathing room without crowding against the top and bottom edges. All header content (view toggles, navigation buttons, search, login, settings) remains properly centered within the increased height.

- **Sign-in page logo replaced with SVG component** — The `LockedOverlay` no longer renders a raster `logo.png` via `next/image` (which produced a visible checkered transparency pattern on the dark background). Instead it uses the inline `<Logo>` component at `size={160}`, which renders the SVG directly with no transparency artifacts. The sign-in page now shows the logo mark + "WeaveNote" text + tagline centered with an ambient glow effect behind it.

- **Sign-in welcome text upgraded** — The "Welcome to WSH" heading now uses `font-extrabold` and displays "WeaveNote" in a gradient (`from-pri-400 to-cyan-400`) instead of plain text. The subtitle paragraph now has `max-w-sm mx-auto` for better line length control.

- **logo.svg in public/ updated** — The SVG file used by README and Open Graph previews now matches the new mathematical design with hexagon, spider web, pen nib, and gradient.

---

## [4.1.4] - 2026-04-10

### 🔧 Changed

- **Logo background made transparent** — The WSH logo now has a fully transparent background (previously white/light gray). This was achieved using flood-fill edge detection from all four image edges with a 45-unit color distance threshold, followed by smooth alpha blending on border pixels for clean anti-aliased edges. The logo renders cleanly on any background color or gradient without visible white boxes or halos.

- **Logo resolution increased to 4× (2140×1732)** — The main logo has been upscaled from 535×433 to 2140×1732 pixels using Lanczos resampling for crisp rendering on high-DPI displays and large format display contexts. The favicon has also been upgraded to 180×180px, and a 32×32 favicon.ico has been generated for legacy browser support.

- **Header logo enlarged from 40px to 64px** — The logo in the top-left header has been increased from `h-10` (40px) to `h-16` (64px) height. This makes the logo text and emblem significantly more readable, especially on smaller screens where the WSH text label is hidden (`hidden sm:inline`).

- **Sign-in page logo dramatically enlarged** — The logo on the locked/sign-in overlay has been increased from a max of `28rem × 14rem` to `42rem × 20rem` on large screens. The container now uses responsive sizing: `w-80 h-48` (mobile) → `w-[28rem] h-64` (sm) → `w-[36rem] h-72` (md) → `w-[42rem] h-80` (lg). The background gradient and border have been removed from the container to let the transparent logo blend with the page. The glow effect behind the logo has been expanded (`-inset-6`, `blur-3xl`).

---

## [4.1.3] - 2026-04-10

### 🐛 Fixed

- **CRITICAL FIX — Notebook reader crashes with React Error #310 ("Objects are not valid as a React child")** — The `NotebookView` component (and `NoteDetailModal`, `NotesGrid`, `TrashModal`, `AnalyticsPanel`, `RightSidebar`) all had `typeColors` and `typeIcons` maps that only covered 6 note types (`quick`, `notebook`, `deep`, `code`, `project`, `document`) but the `NoteType` union includes `ai-prompts`. When a note with `type: 'ai-prompts'` was loaded, `typeIcons['ai-prompts']` returned `undefined` and `typeColors['ai-prompts']?.split(' ')[0]` returned `undefined`, causing cascading render failures. All 6 components now include `ai-prompts` in their type maps with a violet color scheme.

- **CRITICAL FIX — Missing `Brain` icon import in NotebookView** — The `NotebookView` component's `typeIcons` map referenced `<Brain>` for the `ai-prompts` type, but `Brain` was not imported from `lucide-react`. This caused a `ReferenceError: Brain is not defined` crash during server-side rendering, making the entire app fail to build once `ai-prompts` type notes existed. Added `Brain` to the lucide-react import.

- **Defensive type guards for content rendering** — Added `safeString()` and `safeTags()` helper functions to `NotebookView` and `NoteDetailModal`. These ensure that `note.content`, `note.rawContent`, and `note.tags` are always properly typed (string and string[] respectively) before processing. This prevents crashes when data from localStorage or the API contains unexpected types (e.g., ProseMirror JSON objects stored by MdxEditor instead of HTML strings, or non-string tag values).

- **favicon.ico 404 fixed** — Browsers automatically request `/favicon.ico` regardless of HTML metadata. Created a new API route at `/api/favicon` that serves the existing `favicon.png` file with `image/x-icon` content type. Also updated the layout metadata to declare both `/favicon.png` and `/favicon.ico` icon variants.

### ✨ Verified

- Production build passes with zero errors after all fixes
- All 7 note types render correctly across NotebookView, NoteDetailModal, NotesGrid, TrashModal, and AnalyticsPanel

---

## [4.1.2] - 2026-04-10

### 🐛 Fixed

- **CRITICAL FIX — PowerShell `update.ps1` throws `NativeCommandError` and stops** — The `update.ps1` script was missing `$ErrorActionPreference = "SilentlyContinue"`, which `install.ps1` already has. Both `git` and `docker` write progress/info text to **stderr** (not just errors). PowerShell interprets all stderr output from native commands as a `NativeCommandError`, displays it in red, and depending on context, may terminate the script. This caused the update script to show scary red errors from `git pull origin main 2>&1` on every Windows run, and in some PowerShell versions, the script would stop after Step 1. The fix adds `$ErrorActionPreference = "SilentlyContinue"` at the top of `update.ps1`, matching `install.ps1`'s behavior. Real failures are still detected via `$LASTEXITCODE` checks, which remain functional regardless of the ErrorActionPreference setting.

- **Improved error recovery messages in update.ps1** — When git pull fails, the script now shows specific possible causes (local changes, wrong branch, network issues) and provides two fix commands (`git stash && git pull && git stash pop` or `git checkout main && git pull`). Similarly, Docker build and container restart failures now suggest concrete next steps (`.\update.ps1 -NoCache` or `docker compose down && docker compose up -d`).

### 📝 Documentation

- **Added Troubleshooting section to README** — New section covering common update issues: NativeCommandError explanation and fix, git merge conflict resolution, Docker build failures, health check timing, and "already up to date" scenarios. Each issue includes symptom description, root cause explanation, and copy-paste fix commands.

### 🔧 Changed

- **All version references unified to 4.1.2** — Updated across 13 files: `package.json`, `Dockerfile` (header comment + both ARG defaults), `docker-compose.yml` (build arg + image tag), `docker-entrypoint.sh` (header + fallback version), `install.sh`, `install.ps1`, `update.sh`, `update.ps1`, `/api/health`, `/api/admin/system`, `VersioningSection.tsx`, and `README.md`.

---

## [4.1.1] - 2026-04-10

### 🐛 Fixed

- **CRITICAL FIX — Version mismatch across Docker and deployment scripts** — The `Dockerfile` was hardcoded to `BUILD_VERSION=3.9.4` while `docker-compose.yml` passed `BUILD_VERSION=4.0.1`. All install/update scripts (`install.sh`, `install.ps1`, `update.sh`, `update.ps1`) and the `docker-entrypoint.sh` displayed version `4.0.1` in their banners. Meanwhile, `package.json`, the health API, and the system API reported `4.1.0`. This inconsistency meant the Docker image reported a different version than the running application, the VersioningSection in Admin Panel could show conflicting version numbers depending on the data source, and the update script banner was misleading. All version references have been unified to `4.1.1` across every file: `package.json`, `Dockerfile` (both ARG defaults), `docker-compose.yml` (build arg and image tag), `docker-entrypoint.sh`, `install.sh`, `install.ps1`, `update.sh`, `update.ps1`, `/api/health`, `/api/admin/system`, `VersioningSection.tsx`, and `README.md`.

- **TypeScript type error — `NoteType` missing `ai-prompts` variant** — The `NoteType` union in `wshStore.ts` was defined as `'quick' | 'notebook' | 'deep' | 'code' | 'project' | 'document'`, but the `NoteEditor.tsx` component's tab system includes an `AI Prompts` tab that sets `activeNoteType` to `'ai-prompts'`. Since `setActiveNoteType` expects a `NoteType` argument, this created a type mismatch that could cause subtle runtime issues or fail under strict TypeScript compilation. The `ai-prompts` variant has been added to the `NoteType` union.

### 🔧 Changed

- **Docker image tag updated** — The `docker-compose.yml` image tag changed from `weavenote:4.0.1` to `weavenote:4.1.1`. The install scripts' image cleanup lists have been updated to match. Users updating from v4.0.x will get a fresh image build automatically via `update.ps1` / `update.sh`.
- **README image tag references updated** — All references to `weavenote:4.0.0` in the Docker Safety, Docker Configuration, and install script documentation sections have been updated to `weavenote:4.1.1` to reflect the current version.

### ✨ Verified

- **Production build verified** — Confirmed the application builds successfully with zero TypeScript and compilation errors after the type fix and version unification.

---

## [4.1.0] - 2026-04-10

### 🐛 Fixed

- **CRITICAL FIX — JSX syntax error preventing production build** — The `NoteEditor.tsx` status bar section was missing a closing `</div>` tag for the outer status bar container (line 519). This caused Turbopack to fail with "Unexpected token" during every production build, making deployment impossible. The missing `</div>` for the flex container that wraps the engine status indicator and the save/synthesis button group has been added.
- **CRITICAL FIX — `setActiveNoteId` crash when saving new notes** — The `setActiveNoteId` function was used in the `handleSave` callback (line 169) to associate a newly created note with the editor, but it was never destructured from the Zustand store. This caused a `ReferenceError: setActiveNoteId is not defined` crash every time a user tried to save a new note (clicking Save without an active note). The function is now properly included in the store destructuring.
- **Dead code cleanup in `page.tsx`** — Removed an unused `loginAnchorEl` reference in the `LockedOverlay` component that was attempting to read from `globalThis.__wshLoginAnchor` (a global variable that was never set anywhere in the codebase). Also removed the unused `setLoginOpen` destructuring from the same component.

### ✨ Verified

- **3 consecutive production builds passed** — Verified the build completes successfully across 3 independent iterations with zero errors after the JSX fix.
- **All 7 editor tabs render correctly** — Confirmed that Quick, Notebook, Deep, Code, Project, Document, and AI Prompts tabs all render within the NoteEditor component's tab bar. The AI Prompts tab is properly positioned alongside the other note type tabs as requested.
- **Header navigation buttons functional** — Map, Notebook, and Analytics buttons in the header toolbar are present and correctly styled with the unified `text-muted-foreground hover:text-foreground hover:bg-secondary` visual language.
- **Login/Sign Up widget accessible** — The Login button in the header properly opens the LoginWidget popover with tabbed Login/Sign Up modes.
- **Admin button visibility gated by role** — The Admin panel button only renders for users with `admin` or `super-admin` roles, as verified by the `isAdmin` computed property in `Header.tsx`.
- **DB health indicator polling** — The header's green/red DB status dot polls `/api/health` every 30 seconds and displays connection status with latency information.
- **App screenshots captured** — Generated screenshots showing the admin-logged-in state with the AI Prompts tab active and the Quick note editor tab active.

### 📝 Documentation

- Updated version references to 4.1.0 across package.json
- Updated CHANGELOG.md with v4.1.0 release notes
- README reflects current feature set including AI Prompt Library as editor tab

---

## [4.0.1] - 2026-04-10

### 🔧 Changed

- **Official WeaveNote logo and banner applied** — Replaced the auto-generated logo with the official WeaveNote brand assets. The new `logo.png` features the hexagonal spider-web and fountain-pen-nib design with the "WeaveNote" wordmark and "Your Ideas, Connected." tagline on a white background. A separate `banner.png` (transparent background variant) has also been added to the `public/` directory for use in marketing materials or wide-format display.
- **AI Prompts button relocated to navigation group** — The "Prompts" button has been moved from its standalone position in the header into the unified navigation group alongside Map, Notebook, and Analytics. All four buttons now share the same visual style (`text-muted-foreground hover:text-foreground hover:bg-secondary`) for a consistent, clean header layout.

### 📝 Documentation

- Updated version references to 4.0.1 across README and CHANGELOG

---

## [4.0.0] - 2026-04-10

### ✨ Added

- **AI Prompt Library** — A full-featured prompt management system that allows users to save, organize, search, and quickly copy AI prompts for reuse. The library is accessible via a new "Prompts" button in the header toolbar and opens as a full-screen overlay panel. Prompts are persisted to `localStorage` and include support for categories (General, Writing, Code, Analysis, Creative, Business, Research, Education), custom tags, favorites with star toggling, inline editing, one-click copy to clipboard, and sorting by newest, oldest, alphabetical, or recently updated. Five starter prompts are included by default (Summarize Text, Code Review Assistant, SWOT Analysis, Explain Like I'm 5, Blog Post Outline) to help users get started immediately.
- **New WSH logo and favicon** — Replaced the old SVG-only geometric logo with a newly designed, professionally generated app icon. The new logo features a hexagonal woven-thread neural network pattern with a gradient from deep indigo to cyan, reflecting the app's AI-powered knowledge management identity. Both the main `logo.png` (1024x1024) and `favicon.png` have been added to the `public/` directory, along with an updated `logo.svg` for vector use. The Logo component now uses `next/image` for optimized rendering with a rounded corner style.

### 🐛 Fixed

- **CRITICAL FIX — PDF text extraction completely broken** — The `extract-text` API route was passing the raw `Buffer` directly to the `PDFParse` constructor (`new PDFParse(buffer)`), but pdf-parse v2.4.5 expects a `LoadParameters` object (`new PDFParse({ data: buffer })`). This caused every PDF upload to fail with an initialization error, silently falling through to the regex-based fallback which produces very poor results for most PDFs. The fix passes the correct object structure and properly calls `parser.destroy()` after extraction to release resources. The fallback still exists as a safety net for unusual PDF formats.
- **CRITICAL FIX — DOCX text extraction non-functional** — The `extractDocxText()` function was attempting to match `<w:t>` XML tags with regex directly against the raw file buffer. However, DOCX files are ZIP archives — the XML content is compressed inside the archive and cannot be matched by regex on raw bytes. This meant every DOCX upload would either return empty text or garbage. The fix integrates the `mammoth` library, a purpose-built DOCX parser that properly unzips the archive and extracts text from `word/document.xml` with full Unicode support, paragraph structure preservation, and proper handling of embedded formatting. The old regex approach is retained as a last-resort fallback.

### 🔧 Changed

- **Logo component upgraded** — The `Logo.tsx` component now uses `next/image` for optimized, lazy-loaded image rendering instead of an inline SVG. The logo displays with a subtle rounded corner for a modern look.
- **Favicon updated** — The browser tab favicon has been changed from an emoji-based data URI to the new custom `favicon.png`, providing a professional branded appearance in browser tabs and bookmarks.
- **New `mammoth` dependency added** — Added `mammoth` to `package.json` for robust DOCX text extraction. This replaces the broken regex-based approach with a proper OOXML parser.
- **Prompt Library state added to Zustand store** — Added `promptLibraryOpen` and `setPromptLibraryOpen` to the global store for managing the Prompt Library overlay panel visibility.

### 📝 Documentation

- Updated README.md version reference to 4.0.0
- Updated CHANGELOG.md with v4.0.0 release notes

---

## [3.9.4] - 2026-04-09

### ✨ Added

- **Public User Registration (Sign Up)** — Added a full registration UI to the LoginWidget, allowing new users to create accounts directly from the login popover without needing admin intervention. The widget now features a tabbed interface with "Login" and "Sign Up" modes, matching the existing dark theme design language. The registration form includes username, email (optional), password, and confirm password fields with show/hide toggles for each password field. A password requirements hint is displayed below the form for user guidance.
- **Auto-login after registration** — The `/api/admin/users/register` endpoint now issues a JWT token upon successful registration. Users are automatically logged into their new account immediately after signing up, without needing to manually enter their credentials on the login form. If the token is not returned for any reason, the widget gracefully falls back to switching to the login form with the username pre-filled.
- **Password confirmation on registration** — Added `confirmPassword` field validation to the register API endpoint. When the client sends a `confirmPassword` value, the server validates that it matches the `password` field before proceeding with user creation. A clear error message is returned if the passwords do not match.
- **Show/hide password toggles** — Added eye icon toggles to both the login and registration password fields, allowing users to reveal or conceal their passwords as needed. This improves usability and reduces the likelihood of registration errors caused by mistyped passwords.
- **Default admin seed script** — Added `prisma/seed.ts` that creates a default super-admin user on first run using the `ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_EMAIL`, and `ADMIN_DEFAULT_PASSWORD` environment variables. The script is idempotent — it checks whether the admin user already exists before attempting creation, and also verifies that the admin email is not already in use by another user. Added `db:seed` script to `package.json` for manual seeding during development.
- **Automated admin seeding in Docker** — The `docker-entrypoint.sh` now runs the admin seed check during first-run database initialization (after `prisma db push`). This ensures that a default admin account is always available immediately after a fresh Docker deployment. The seeding step is non-fatal — if it fails for any reason, the server still starts and admins can be created manually.

### 🔧 Changed

- **LoginWidget redesigned as tabbed auth widget** — The popover now features a "Login" / "Sign Up" tab switcher at the top, replacing the previous login-only interface. The widget width has been increased from `w-72` to `w-80` to accommodate the additional registration fields. Both forms share a common error banner and loading state.
- **Header button text updated** — The header login button now displays "Login / Sign Up" when no user is authenticated (previously just "Login"), making the registration option discoverable without requiring the user to click the button first.
- **Register API response format** — The `/api/admin/users/register` response now includes a `token` field in addition to the existing `user` and `message` fields, enabling auto-login. The `message` has been updated to "Registration successful — logged in automatically".

### 🐛 Fixed

- **CRITICAL FIX — Default admin user never seeded in Docker** — The `docker-entrypoint.sh` seed script used `require('./src/lib/auth.js')` to import the password hashing function, but the Next.js standalone Docker build does not include the `src/` directory (only compiled `.next/standalone/` output is copied). This caused the seed to silently fail on every startup, leaving the User table empty. The fix replaces the import with direct usage of `bcryptjs.hash()` which is available as a production dependency in the Docker image.
- **Seed now runs on every startup** — The admin seed check was previously nested inside the first-run-only block (gated by `.db-initialized` marker). If the seed failed on the first run, it would never retry because the marker was already set. The seed is now gated by its own `.admin-seeded` marker and runs independently of the DB schema push. It also verifies the admin user exists on subsequent starts, and logs a warning if no admin is found.
- **`prisma/seed.ts` import fixed for Docker compatibility** — The development seed script also imported from `../src/lib/auth`, which would fail in environments where the source tree isn't available. Now uses `bcryptjs` directly.

---

## [3.9.3] - 2026-04-09

### 🐛 Fixed

- **pgAdmin email validation failure** — Changed the default `PGADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_EMAIL` from `admin@wsh.local` to `admin@example.com`. The `.local` TLD is a reserved special-use domain (RFC 2606) that is rejected by newer versions of pgAdmin4's email validator, causing a startup crash loop with the error: "The part after the @-sign is a special-use or reserved name that cannot be used with email." This affected both the `docker-compose.yml` defaults and the `.env.example` template.
- **Prisma CLI crash — `Cannot find module 'empathic/package'`** — The Dockerfile previously used manual `COPY` instructions for individual Prisma transitive dependencies (`effect`, `fast-check`, `pure-rand`). Prisma 6.11.1+ introduced new transitive deps (`empathic`, `c12`, `deepmerge-ts`, plus 12+ sub-dependencies of `c12`) that were not included, causing `prisma db push` and `prisma generate` to fail at container startup with `MODULE_NOT_FOUND`. The Dockerfile now uses `npm install --omit=dev` in the runner stage, which automatically resolves the full dependency tree — this is future-proof against further Prisma dependency changes.
- **Removed all remaining `wsh.local` references from application code** — Replaced `@wsh.local` fallback emails in 4 server routes (`db-test`, `admin/db-test`, `admin/users/register`) and 1 UI component (`UsersSection.tsx`) with `@example.com` (RFC 2606 sanctioned example domain). This ensures consistency with the pgAdmin email fix and prevents any future email validation issues with reserved TLDs.
- **UsersSection.tsx fake success on network error** — The `handleCreateUser` catch block previously added a fake user record to local state when the API call failed, misleading admins into thinking the user was created. Now correctly logs an error message without creating phantom records.

### 🐳 Docker

- **Rewrote Dockerfile Prisma dependency installation** — Replaced the fragile per-package `COPY` block (which required manually adding every new transitive dependency) with `npm install --omit=dev` in the runner stage. This installs all production dependencies including `prisma` and its complete transitive dependency tree in one step, with proper file ownership for the non-root `nextjs` user.
- Reordered runner stage: npm install now runs before the standalone Next.js copy, so the Prisma client can be properly regenerated after install
- Removed the manual `prisma` CLI wrapper symlinks (no longer needed — npm install creates them automatically)

### 📝 Documentation

- Updated all references to pgAdmin login credentials across README, DOCS, and CHANGELOG to reflect the new `admin@example.com` default
- Updated environment variable tables to show the new default email addresses
- Updated Docker Safety tables and version references to 3.9.3

### 🔧 Changed

- Changed default port from 3000 to 8883 across all files: `docker-compose.yml`, `install.sh`, `install.ps1`, `.env.example`, `README.md`, `DOCS.md`
- Bumped version from 3.9.2 to 3.9.3 across all files: `package.json`, `docker-compose.yml`, `Dockerfile`, `docker-entrypoint.sh`, `install.ps1`, `install.sh`, `update.ps1`, `update.sh`, health check endpoint, system info endpoint, VersioningSection component, and all documentation files

---

## [3.9.2] - 2026-04-08

### 🔒 Security

- **CRITICAL FIX — Docker cleanup now scoped to WSH only.** The install and update scripts (`install.sh`, `install.ps1`) previously used broad pattern matching (`grep -iE "postgres|pgadmin|adminer"`) and `docker system prune -af` which could destroy containers, images, volumes, and build cache belonging to other Docker Compose projects or standalone containers on the same host. This has been completely rewritten to use exact name matching and project-scoped cleanup.

### 🐳 Docker

#### What Changed

The cleanup logic in both install scripts was rewritten from the ground up. Here is a detailed comparison of the old and new behavior:

**Old behavior (DANGEROUS):**

| Phase | Old Command | Risk |
|-------|-------------|------|
| Container removal | `grep -iE "wsh\|weavenote\|pgadmin"` | Could match containers from other projects named with "pgadmin" |
| Image removal | `grep -iE "wsh\|weavenote\|adminer\|pgadmin\|postgres"` | Would delete ALL postgres, adminer, and pgadmin images on the system, including those used by other applications |
| Volume removal | `grep -iE "wsh\|weavenote\|postgres\|pgadmin"` | Would destroy database volumes from other projects that contain "postgres" in their name |
| Network removal | `grep -iE "wsh\|weavenote"` | Relatively safe but could match unintended networks |
| Build cache | `docker builder prune -af` | Wiped ALL build cache system-wide, not just WSH's |
| System prune | `docker system prune -af` | **Most dangerous** — removed ALL unused containers, images, networks, and volumes on the entire host |

**New behavior (SAFE):**

| Phase | New Command | Safety |
|-------|-------------|--------|
| Container removal | `docker compose down -v --remove-orphans` + exact name match for `wsh-postgres`, `weavenote-app`, `wsh-dbviewer`, `wsh-pgadmin` | Only touches containers defined in WSH's docker-compose.yml or by exact container_name |
| Image removal | Exact tag match for `weavenote:3.9.2` and `weavenote:latest` | Shared images (`postgres:16-alpine`, `adminer:latest`, `dpage/pgadmin4:latest`) are never touched |
| Volume removal | Exact name match for `postgres-data`, `weavenote-data`, `pgadmin-data` (with project prefix) | Only removes volumes that Docker Compose created for WSH |
| Network removal | Exact name match for `wsh-net` (with project prefix) | Only removes WSH's dedicated bridge network |
| Build cache | `docker builder prune -f --filter "label=com.docker.compose.project=<name>"` | Only prunes build cache tagged with WSH's project label |
| System prune | **REMOVED** | No longer runs. WSH no longer touches system-wide Docker resources |

#### Migration Notes

If you are upgrading from a previous version of WSH (3.9.1 or earlier), the new install scripts are fully backward compatible. Your existing WSH containers, volumes, and data will be cleaned up correctly by the new scripts. The only difference is that the new scripts will no longer destroy other projects' resources.

If you previously relied on the old scripts' aggressive cleanup behavior (e.g., you used `./install.sh` as a general Docker cleanup tool), you should switch to using `docker system prune` manually for that purpose instead.

### 📝 Documentation

- Added comprehensive **Docker Safety** section to README explaining exactly what resources are and are not removed
- Added detailed comparison table of old vs. new cleanup behavior in this CHANGELOG
- Created `DOCS.md` with detailed Docker management documentation, troubleshooting guide, and safety explanation
- Updated README Docker Deployment section to emphasize scoped cleanup behavior
- Clarified that `--clean-only` / `-CleanOnly` flags only affect WSH resources

---

## [3.9.1] - 2026-04-07

### ✨ Added

- Mind Map API endpoint (`GET /api/graph`) for external graph data consumption
- Notebook View — full-screen linear document reader for immersive reading
- Note Detail Modal — full metadata and content viewer for individual notes
- ENV Import/Export buttons in Admin Panel
- Quick Add Common Keys — one-click presets for popular environment variables
- Analytics Panel with Recharts-powered visual statistics
- Settings Panel with dark/light mode toggle and 15 color themes

### 🐛 Fixed

- Improved health check reliability with configurable start_period
- Fixed tag filtering to properly clear when clicking an active tag
- Resolved sidebar scroll tracking in Notebook View
- Fixed inline editing persistence in Web DB Viewer

### 🐳 Docker

- Added `docker-entrypoint.sh` for automated database initialization on first run
- Improved container dependency ordering with `condition: service_healthy`
- Added `start_period` to all health checks for proper initialization delays
- Version-tagged image as `weavenote:3.9.1`

---

## [3.9.0] - 2026-03-30

### ✨ Added

- Initial release of WSH (WeaveNote Self-Hosted)
- AI Synthesis Engine with 5 modes (Summarize, Expand, Improve, Generate Tags, Create Outline)
- Interactive SVG force-directed Mind Map visualization (no D3.js dependency)
- 6 note types: Quick, Notebook, Deep, Code, Project, Document
- Folders & Tags organizational system with drag-and-drop reordering
- Trash Modal with soft-delete and restore functionality
- Admin Panel with 6 sections (ENV, Versioning, Users, Cloud, DB, Logs)
- User Authentication with JWT tokens and role-based access control
- Web DB Viewer (Adminer) on port 5682
- Optional pgAdmin on port 5050 via Docker Compose profiles
- 15 hand-crafted color themes with instant switching
- Multi-stage Docker build (deps → builder → runner)
- Install scripts for Linux/macOS (`install.sh`) and Windows (`install.ps1`)
- Non-destructive update scripts (`update.sh`, `update.ps1`)
- Caddy reverse proxy configuration
- AlertTriangle ENV warning banner in Admin Panel

### 🏗️ Architecture

- Next.js 16 with App Router
- TypeScript 5 with strict mode
- Tailwind CSS 4 with custom theme system
- shadcn/ui + Radix UI component library
- Zustand 5 for global state management
- Prisma ORM with PostgreSQL 16
- Framer Motion for animations
- Lucide React for iconography
- @dnd-kit for drag-and-drop interactions
