# Changelog

All notable changes to WSH (WeaveNote Self-Hosted) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.1] - 2026-04-04

### Changed
- Refactored AdminPanel from 1,105-line monolith into 7 focused sub-components (AdminPanel, EnvSettingsSection, VersioningSection, UsersSection, CloudSetupSection, LogsSection, DBViewerSection)
- Calendar redesigned to compact layout (6px day cells, 9px font) to fix oversized calendar in right sidebar
- Right sidebar now matches WeaveNote layout: Calendar → Quick References → Folders → Popular Tags
- Added FarRightSidebar component with Today's Things, Ongoing Projects, Quick Stats (visible on xl+ screens)
- Page layout is now 4-column: LeftSidebar | RightSidebar | Main Content | FarRightSidebar

### Added
- Neon tag color system with 10 vibrant colors (cyan, fuchsia, lime, yellow, rose, violet, emerald, orange, sky, pink)
- Tag glow effect using box-shadow for bright neon appearance
- Deterministic tag color assignment based on name hash
- HTML sanitization for user-generated content (strips script/iframe/event handlers)

### Fixed
- **CRITICAL**: Fixed broken import paths in 4 admin sub-components (`'../types'` → `'./types'`)
- **CRITICAL**: Fixed render-phase side effects in UsersSection and VersioningSection (moved fetch calls from render body into useEffect)
- **CRITICAL**: Fixed XSS vulnerability via dangerouslySetInnerHTML in NoteDetailModal and NotebookView (added HTML sanitizer)
- **CRITICAL**: Fixed modal overlay states persisting to localStorage (adminPanelOpen, trashOpen, mindMapOpen, notebookOpen, dbViewerOpen now excluded from persistence)
- Removed unused `process.version` client-side reference in VersioningSection
- Removed unused imports (CheckCircle2, Plus, Minus) in FarRightSidebar
- Fixed redundant ternary in EnvSettingsSection new-key input
- Fixed stale `today` dependency breaking useMemo in FarRightSidebar
- Fixed `React.useState` inconsistency in NotebookView (now uses `useState` from imports)

## [3.2.0] - 2026-04-04

### Added
- Mind Map visualization with SVG force-directed graph (physics simulation, pan/zoom, node drag, tag-based connections)
- Trash Modal with soft-delete, restore, permanent delete, and empty trash functionality
- Notebook View as linear document reader with sidebar navigation and scroll tracking
- Note Detail Modal for viewing individual notes with full metadata
- Web DB Viewer for browsing notes/folders/users tables with inline editing
- Mind Map API endpoint (`/api/graph`) returning nodes and edges data
- AlertTriangle warning banner in Admin Panel ENV Settings
- ENV Import/Export buttons (upload/download `.env` files)
- Quick Add Common Keys buttons for one-click ENV variable addition
- AI Synthesis Engine with 5 modes (Summarize, Expand, Improve, Tags, Outline)
- Admin Panel with 6 sections (ENV Settings, Versioning, User Base, Cloud Setup, DB Viewer, System Logs)
- 15 switchable color themes
- 6 distinct note types (Quick, Notebook, Deep, Code, Project, Document)
- Docker support with multi-stage Dockerfile and docker-compose
- PowerShell installer script (`install-wsh.ps1`)
- User authentication with role-based access control (user, admin, super-admin)
- API routes: `/api/health`, `/api/synthesis`, `/api/graph`, `/api/admin/*`
- Rich text editor with formatting toolbar (bold, italic, underline, lists, alignment)
- Folder organization and tag management
- Analytics panel with note statistics
- Settings panel with dark/light mode toggle
- localStorage persistence for all application state

### Changed
- Project and Document note types now have distinct visual indicators (colored left borders, descriptions)
- Mind Map uses custom SVG force graph instead of D3.js for zero-dependency implementation

### Fixed
- Resolved double-render of TrashModal component (was rendered in both Footer and page root)
- Fixed React import ordering in NotebookView component

## [3.1.0] - 2025-01-15

### Added
- Initial WSH application build
- WeaveNote-inspired dark mode design
- 3-column responsive layout
- Note editor with contenteditable
- Notes grid with type badges
- Zustand state management with localStorage persistence
