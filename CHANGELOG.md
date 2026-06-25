# Changelog

All notable changes to the WSH (WeaveNote Self-Hosted) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.4.15] - 2026-06-25

### Added
- **Expanded intelligence-board graph set** — Added Creation Rhythm and Type Signal Radar chart surfaces to the Full Intelligence Board dashboard.
- **Release notes for chart/motion expansion** — Added `RELEASE-NOTES-4.4.15.md` documenting the intelligence-board animation and graph enhancements.

### Changed
- **Dashboard chart animations smoothed** — Tuned chart motion across area, line, pie, bar, and radar visualizations for a more fluid experience.
- **Version metadata bumped to 4.4.15** — Updated package metadata, Docker build/image tags, entrypoint banner text, README version references, and runtime health/system endpoint fallbacks to the new patch release.

### Validation
- **Production build passed** — `npm run build` completed successfully on the 4.4.15 tree after the chart expansion and animation updates.

## [4.4.14] - 2026-06-25

### Added
- **Full Intelligence Board dashboard** — Reworked the WSH dashboard into a command-center surface with new sections for What Matters Now, Operational Signals, Active Work Queue, and Recent Intelligence.
- **Release notes for the dashboard upgrade** — Added `RELEASE-NOTES-4.4.14.md` documenting the Full Intelligence Board release.

### Changed
- **Dashboard UX upgraded from passive analytics to actionable intelligence** — Existing activity, type, folder, tag, and review-age analytics were reorganized into a more tactical executive layout that highlights urgent/stale notes and higher-signal workspace content.
- **Version metadata bumped to 4.4.14** — Updated package metadata, Docker build/image tags, entrypoint banner text, README version references, and runtime health/system endpoint fallbacks to the new patch release.

### Validation
- **Production build passed** — `npm run build` completed successfully on the 4.4.14 tree after the Full Intelligence Board redesign.

## [4.4.13] - 2026-06-25

### Added
- **Editor checklist button** — Added a dedicated checklist insertion control so users can create checkbox-style note items directly from the toolbar.
- **Release notes for interaction polish** — Added `RELEASE-NOTES-4.4.13.md` documenting the mind map smoothness and note-list behavior improvements.

### Changed
- **Mind map animation path smoothed further** — Reduced per-frame DOM churn by moving orbit node updates to transform writes and throttling label counter-rotation updates.
- **Editor list behavior improved** — Bullet lists and numbered lists are now normalized after edits so spacing, indentation, and list rendering behave more like a conventional notes app.
- **Version metadata bumped to 4.4.13** — Updated package metadata for the next patch release focused on interaction quality.

### Validation
- **Production build passed** — `npm run build` completed successfully on the 4.4.13 tree after the editor and mind map interaction changes.

## [4.4.12] - 2026-06-25

### Added
- **Hybrid galaxy mind map controls** — Added explicit orbit pause/resume, galaxy rotation toggle, zoom controls, reset behavior, and double-click recentering for the WSH mind map overlay.
- **Hybrid relationship model for note constellations** — Added a graph-to-orbit layout that promotes multi-connected notes into orbital bands while leaving weaker/unconnected notes calmer and easier to read.
- **Standalone release notes for the hybrid mind map upgrade** — Added `RELEASE-NOTES-4.4.12.md` to document the WSH-specific galaxy-map upgrade and version rollout.

### Changed
- **WSH mind map experience upgraded** — Reworked `src/components/wsh/MindMap.tsx` from a simple rotating hub-spoke layout into a hybrid self-hosted galaxy view that uses shared tags, lightweight text similarity, center-star selection, major/minor orbit roles, and calmer static clusters.
- **Version metadata bumped to 4.4.12** — Updated package metadata, Docker build/image tags, entrypoint banner text, README version references, and runtime health/system endpoint fallbacks to the new patch release.

### Validation
- **Release metadata aligned** — WSH version strings now report `4.4.12` across package, Docker, runtime API, and documentation touchpoints.
- **Mind map release trail updated** — Changelog, coding notes, file tracker, and dedicated release notes now reflect the hybrid orbital WSH upgrade.

## [4.4.11] - 2026-06-22

### Added
- **Paginated note data pipeline** — Added cursor-based `/api/notes` pagination with recent-first loading, load-more support, and a shared visible-notes client path for list-style UI.
- **On-demand full note fetches** — Added single-note detail fetching for read and edit flows so note lists can stay lightweight while full bodies load only when needed.
- **Persistent recent-page cache** — Added versioned localStorage-backed caching for recent paged note results to speed reloads and warm starts.
- **Release notes for the performance series** — Added `RELEASE-NOTES-4.4.7.md` documenting the recent caching/performance work and validation summary.

### Changed
- **Notes grid performance path** — The main notes grid now prefetches additional pages on scroll, uses lightweight preview-first list rows, virtualizes rendering, and persists recent pages for faster warm reloads.
- **Notebook/detail rendering behavior** — Notebook and detail surfaces now use lazy/full fetch patterns instead of assuming the full note corpus is already resident in client state.
- **Editor hydration path** — Sidebar, detail, and mind-map entry points now load full notes into the editor through a centralized fetch-and-hydrate action.
- **Desktop mind map anchoring fixed** — SVG connections now render inside the same transformed coordinate space as the nodes, keeping lines attached to moving notes instead of drifting off-target.
- **Desktop mind map animation smoothed** — Rotation no longer triggers a full React rerender on every animation frame; the orbit layer and counter-rotating labels now update through direct transform writes for reduced lag/stutter.
- **Next.js runtime convention updated** — Deprecated `middleware` usage was migrated to the newer `proxy` convention to remove the Next.js 16 warning during builds.
- **Version bumped to 4.4.11** in package metadata and changelog to roll up the recent performance/caching series on top of the newer upstream release line.

### Validation
- **Production build passed** — `npm run build` completed successfully after each major performance refactor and again after the mind map anchoring/stutter fixes on the final 4.4.11 tree.
- **Live deployment verified on 10.30.1.15** — `/api/health` returned healthy on `4.4.11` with database connectivity preserved after app-only redeploy.
- **Lint status** — `eslint` did not return cleanly in this environment during release prep, so this release is validated primarily by repeated successful production builds rather than a completed lint run.

## [4.4.10] - 2026-06-15

### Fixed
- **Quick References now load into the editor correctly** — The Quick References sidebar was dispatching a `wsh:use-quick-ref` event, but the note editor was not listening for it. The editor now handles that event, loads the selected reference title/content into the current editor, and sets the note type appropriately.

### Cleanup
- Removed an unused `isAdding` state path in `QuickReferences.tsx` while fixing the event wiring.

### Changed
- **Version bumped to 4.4.10** for the Quick References integration fix.

---

## [4.4.9] - 2026-06-15

### Changed
- **Image guardrails for notes** — Added a hard cap of **4 images per note** and a **5 MB maximum per image attachment** in the note editor flow to keep note payloads responsive and reduce runaway image-heavy saves.

### UX
- When a user exceeds the image limit or file-size limit, the editor now surfaces a clear status message instead of silently accepting oversized content.

### Changed
- **Version bumped to 4.4.9** for the note-image limit enforcement patch.

---

## [4.4.8] - 2026-06-15

### Added
- **Resizable images in notes** — Images inserted into notes now support an explicit initial width control for URL-based inserts and are rendered with resize-friendly styling so users can make images smaller or larger directly inside note content.

### Changed
- **Image attachments in notes are compressed client-side before insertion** — Large attached images are resized down to a saner maximum dimension and re-encoded before being embedded into note HTML, reducing note payload size and making note load/save/render faster.
- **Version bumped to 4.4.8** for the image-handling performance and usability patch.

---

## [4.4.7] - 2026-06-15

### Security
- **CRITICAL FIX — JWT runtime now refuses insecure fallback secrets** — `src/lib/auth.ts` no longer falls back to the hardcoded placeholder `change-me-in-production`. The app now throws immediately if `JWT_SECRET` is missing or still set to the default placeholder value, preventing accidental deployment with a forgeable session secret.
- **CRITICAL FIX — Admin bootstrap seeding no longer falls back to `admin` / `admin123` defaults** — `docker-entrypoint.sh` now requires explicit `ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_EMAIL`, and `ADMIN_DEFAULT_PASSWORD` values for first-run admin seeding when no admin exists. If no admin exists and the bootstrap variables are not fully set, the entrypoint refuses to seed an insecure default account.

### Changed
- **Bootstrap behavior tightened** — If an admin or super-admin already exists, the entrypoint now skips bootstrap seeding cleanly without depending on hardcoded default credentials.
- **Version bumped to 4.4.7** for the first security-hardening patch in the WeaveNote public exposure remediation sequence.

---

## [4.4.6] - 2026-06-12

### Added
- **Algorithmic synthesis for Generate Tags** — The `/api/synthesis` route now supports a deterministic local tag-generation pipeline that strips editor HTML, removes stop words, ranks repeated keywords, detects technical terms/acronyms, and returns 4–8 relevant hashtags as a JSON array without requiring an LLM backend.
- **Algorithmic synthesis for Create Outline** — The `/api/synthesis` route now supports a deterministic local outline generator that scores sentences, extracts high-signal topics, and returns a structured markdown outline with `Overview`, `Key Topics`, and `Suggested Next Steps` sections when enough content is available.

### Changed
- **Hybrid synthesis architecture** — `tags` and `outline` now run as local algorithms and return `provider: local-algorithm` with `tokensUsed: 0`, while `summarize`, `expand`, and `improve` remain LLM-backed.
- **Daily AI limit scope tightened** — The AI daily limit now applies only to LLM-backed synthesis actions, not local algorithmic actions.
- **README updated** — Documented the hybrid synthesis behavior, local algorithm path, API response differences, and new version references.
- **Version bumped to 4.4.6** across core files and deployment metadata.

---

## [4.4.6] - 2026-04-21

### Fixed
- **CRITICAL FIX — Docker build fails silently (npm install error hidden by pipe)** — The Dockerfile piped `npm install` output through `tail -5` (`npm install 2>&1 | tail -5`). In shell, the exit code of a pipeline is the exit code of the LAST command, so when `npm install` failed (non-zero exit), `tail`'s success (exit 0) replaced it. The build continued with ZERO packages installed, causing every subsequent step to fail with confusing errors. Fixed by removing all `| tail` pipes on `npm install` commands so errors are visible and the build stops immediately on failure.
- **CRITICAL FIX — npm install fails: `react-devtools-inline@4.4.1` yanked from npm** — The `package-lock.json` pinned `react-devtools-inline` to version 4.4.1, which was yanked/unpublished from npm. This transitive dependency (of `@codesandbox/sandpack-react`) caused `npm install` to fail with `ETARGET No matching version found`. The lock file has been regenerated, resolving to `react-devtools-inline@4.4.0`.
- **docker-entrypoint.sh used non-existent prisma path** — The entrypoint still referenced `node /app/node_modules/prisma/build/index.js` (from the v4.4.2 fix) which doesn't exist in Docker. Updated to use `./node_modules/.bin/prisma` (standard npm bin path) consistent with the Dockerfile.

### Changed
- **Regenerated `package-lock.json`** — Old lock file had a yanked dependency version. Fresh generation resolves to valid versions.
- **Version bumped to 4.4.6** across all core files.
