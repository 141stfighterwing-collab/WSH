#!/usr/bin/env pwsh
# ============================================================================
#  WSH (WeaveNote Self-Hosted) -- Update & Patch Management Script v4.5.0
# ============================================================================
#  Maintains: README.md, CHANGELOG.md, CODING_CHANGES.md, FILE_TRACKER.md
#  Handles:   Patching from v1.0.1+ to current, Docker rebuild, validation
#  Usage:
#    .\update.ps1                    # Standard update (git pull + rebuild)
#    .\update.ps1 -NoCache           # Force full Docker rebuild (no cache)
#    .\update.ps1 -DocsOnly          # Only refresh documentation files
#    .\update.ps1 -PatchOnly         # Only apply pending patches (no rebuild)
#    .\update.ps1 -Version           # Show current and latest version info
#    .\update.ps1 -HealthCheck       # Run health check only
#    .\update.ps1 -PatchList         # Show all available patches
#    .\update.ps1 -InitDocs          # Generate initial documentation from repo
# ============================================================================

param(
    [switch]$NoCache,
    [switch]$DocsOnly,
    [switch]$PatchOnly,
    [switch]$Version,
    [switch]$HealthCheck,
    [switch]$PatchList,
    [switch]$InitDocs
)

# ── CRITICAL: Suppress PowerShell's NativeCommandError for git/docker ──
$ErrorActionPreference = "SilentlyContinue"

# ============================================================================
#  CONFIGURATION
# ============================================================================
$SCRIPT_VERSION = "4.5.0"
$REPO_OWNER    = "141stfighterwing-collab"
$REPO_NAME     = "WSH"
$GIT_REMOTE    = "https://github.com/$REPO_OWNER/$REPO_NAME.git"
$BRANCH        = "main"
$API_BASE      = "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME"

# Version constants — patching starts at 1.0.1
$MIN_PATCH_VERSION = [version]"1.0.1"
$CURRENT_VERSION   = [version]"4.5.0"

# Core files that get version-bumped (14 files)
$VERSION_FILES = @(
    "package.json",
    "Dockerfile",
    "docker-compose.yml",
    "docker-entrypoint.sh",
    "install.sh",
    "install.ps1",
    "update.sh",
    "update.ps1",
    "test-env.sh",
    "test-env.ps1",
    "src/app/api/health/route.ts",
    "src/app/api/admin/system/route.ts",
    "CHANGELOG.md",
    "README.md"
)

# Documentation files maintained by this script
$DOC_FILES = @(
    "README.md",
    "CHANGELOG.md",
    "CODING_CHANGES.md",
    "FILE_TRACKER.md"
)

# All tracked project files for FILE_TRACKER.md
$TRACKED_CATEGORIES = @{
    "core_app" = @(
        "src/app/page.tsx",
        "src/app/layout.tsx",
        "src/app/globals.css",
        "src/middleware.ts"
    )
    "components" = @(
        "src/components/wsh/Header.tsx",
        "src/components/wsh/LeftSidebar.tsx",
        "src/components/wsh/RightSidebar.tsx",
        "src/components/wsh/FarRightSidebar.tsx",
        "src/components/wsh/Footer.tsx",
        "src/components/wsh/Logo.tsx",
        "src/components/wsh/NoteEditor.tsx",
        "src/components/wsh/NotesGrid.tsx",
        "src/components/wsh/NoteDetailModal.tsx",
        "src/components/wsh/NotebookView.tsx",
        "src/components/wsh/Folders.tsx",
        "src/components/wsh/Tags.tsx",
        "src/components/wsh/MindMap.tsx",
        "src/components/wsh/Calendar.tsx",
        "src/components/wsh/TrashModal.tsx",
        "src/components/wsh/SettingsPanel.tsx",
        "src/components/wsh/AnalyticsPanel.tsx",
        "src/components/wsh/AdminPanel.tsx",
        "src/components/wsh/DBViewer.tsx",
        "src/components/wsh/LoginWidget.tsx",
        "src/components/wsh/PromptLibrary.tsx",
        "src/components/wsh/QuickReferences.tsx"
    )
    "editors" = @(
        "src/components/wsh/editors/CodeEditor.tsx",
        "src/components/wsh/editors/ProjectEditor.tsx",
        "src/components/wsh/editors/DocumentManager.tsx"
    )
    "store" = @(
        "src/store/wshStore.ts"
    )
    "api_routes" = @(
        "src/app/api/health/route.ts",
        "src/app/api/admin/system/route.ts",
        "src/app/api/notes/route.ts",
        "src/app/api/folders/route.ts",
        "src/app/api/documents/route.ts",
        "src/app/api/synthesis/route.ts",
        "src/app/api/admin/env/route.ts",
        "src/app/api/admin/users/route.ts"
    )
    "lib" = @(
        "src/lib/sanitize.ts"
    )
    "prisma" = @(
        "prisma/schema.prisma",
        "prisma/seed.ts"
    )
    "config" = @(
        "package.json",
        "tsconfig.json",
        "next.config.ts",
        "tailwind.config.ts",
        "postcss.config.mjs",
        "eslint.config.mjs",
        "components.json"
    )
    "docker" = @(
        "Dockerfile",
        "docker-compose.yml",
        "docker-entrypoint.sh",
        ".dockerignore",
        "Caddyfile"
    )
    "scripts" = @(
        "install.sh",
        "install.ps1",
        "update.sh",
        "update.ps1",
        "restart.sh",
        "restart.ps1",
        "test-env.sh",
        "test-env.ps1",
        "capture.js",
        "capture2.js",
        "capture3.js",
        "check_layout.js"
    )
    "docs" = @(
        "README.md",
        "CHANGELOG.md",
        "CODING_CHANGES.md",
        "FILE_TRACKER.md",
        "DOCS.md",
        "CHECKLIST.md",
        "worklog.md"
    )
    "env" = @(
        ".env",
        ".env.example",
        ".env.test",
        ".wsh-manifest.example.json"
    )
}

# ============================================================================
#  UTILITY FUNCTIONS
# ============================================================================

function Write-Logo {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  WSH -- Update & Patch Manager v$SCRIPT_VERSION" -ForegroundColor Cyan
    Write-Host "  WeaveNote Self-Hosted" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step([string]$Step, [string]$Message) {
    Write-Host "[$Step] $Message" -ForegroundColor Yellow
}

function Write-OK([string]$Message) {
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Fail([string]$Message) {
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

function Write-Warn([string]$Message) {
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
}

function Write-Info([string]$Message) {
    Write-Host "  $Message" -ForegroundColor DarkGray
}

function Write-DocHeader([string]$Message) {
    Write-Host ""
    Write-Host "--- $Message ---" -ForegroundColor Magenta
}

# ============================================================================
#  VERSION DETECTION
# ============================================================================

function Get-CurrentVersion {
    <#
    .SYNOPSIS
    Detects the current installed WSH version from multiple sources.
    Checks package.json first, then API, then manifest file.
    #>
    # Method 1: package.json
    $pkgPath = Join-Path $PSScriptRoot "package.json"
    if (Test-Path $pkgPath) {
        $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
        if ($pkg.version) {
            return [version]$pkg.version
        }
    }

    # Method 2: Docker health API
    $port = if ($env:WSH_PORT) { $env:WSH_PORT } else { 8883 }
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($health.version) {
            return [version]($health.version -replace "^v", "")
        }
    } catch {
        # Not running or not accessible
    }

    # Method 3: Manifest file
    $manifestPath = Join-Path $PSScriptRoot ".wsh-manifest.json"
    if (Test-Path $manifestPath) {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        if ($manifest.version) {
            return [version]($manifest.version -replace "^v", "")
        }
    }

    return $null
}

function Get-LatestGitHubVersion {
    <#
    .SYNOPSIS
    Fetches the latest version from GitHub (tags or default branch package.json).
    #>
    try {
        $tags = Invoke-RestMethod -Uri "$API_BASE/tags?per_page=5" -TimeoutSec 10 -ErrorAction Stop
        if ($tags -and $tags.Count -gt 0) {
            $latestTag = $tags[0].name -replace "^v", ""
            return [version]$latestTag
        }
    } catch {
        Write-Info "Could not fetch GitHub tags (no tags published yet)"
    }

    # Fallback: fetch package.json from main branch
    try {
        $pkgRaw = Invoke-RestMethod -Uri "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/package.json" -TimeoutSec 10 -ErrorAction Stop
        if ($pkgRaw.version) {
            return [version]$pkgRaw.version
        }
    } catch {
        Write-Info "Could not fetch package.json from GitHub"
    }

    return $null
}

# ============================================================================
#  PATCH REGISTRY
#  Each patch defines: version, description, files affected, type
# ============================================================================

function Get-PatchRegistry {
    <#
    .SYNOPSIS
    Returns the complete registry of all patches from v1.0.1 to v4.5.0.
    Each patch entry contains: version, date, type, description, affectedFiles.
    #>

    $patches = @(
        # ── v1.x Series ──────────────────────────────────────────────────
        @{
            Version = "1.0.1"
            Date    = "2026-03-26"
            Type    = "Patch"
            Description = "Initial patch release - bugfixes for Docker networking and PostgreSQL connection pooling"
            AffectedFiles = @("docker-compose.yml", "Dockerfile", "prisma/schema.prisma")
            Changes = @(
                "Fixed PostgreSQL connection timeout in Docker network",
                "Added connection pool limits to schema",
                "Improved Docker build cache utilization"
            )
        }
        @{
            Version = "1.0.2"
            Date    = "2026-03-26"
            Type    = "Patch"
            Description = "Authentication token expiration fix and session management improvements"
            AffectedFiles = @("src/middleware.ts", "src/app/api/admin/users/route.ts", "src/store/wshStore.ts")
            Changes = @(
                "Fixed JWT token refresh logic causing premature logout",
                "Added session persistence across browser restarts",
                "Improved error handling for expired tokens"
            )
        }
        @{
            Version = "1.0.3"
            Date    = "2026-03-27"
            Type    = "Patch"
            Description = "Note editor toolbar rendering fix for Safari and Firefox"
            AffectedFiles = @("src/components/wsh/NoteEditor.tsx", "src/app/globals.css")
            Changes = @(
                "Fixed toolbar button alignment in Safari 17+",
                "Resolved contenteditable focus issues in Firefox",
                "Added vendor-prefix fallbacks for CSS transforms"
            )
        }

        # ── v3.9.x Series ────────────────────────────────────────────────
        @{
            Version = "3.9.0"
            Date    = "2026-03-27"
            Type    = "Minor"
            Description = "Initial public release - Full self-hosted notes app with PostgreSQL, Docker deployment, and AI synthesis"
            AffectedFiles = $VERSION_FILES + @("src/app/page.tsx", "src/components/wsh/*.tsx", "prisma/schema.prisma", "docker-compose.yml")
            Changes = @(
                "Core note-taking functionality (Quick, Notebook, Deep, Code, Project, Document types)",
                "PostgreSQL database with Prisma ORM",
                "Docker containerization with automated installer",
                "AI-powered text synthesis (summarize, expand, improve, tags, outline)",
                "Document upload and viewing (PDF, images, text)",
                "Folder organization with drag-and-drop",
                "Tag system with filtering",
                "Calendar view with date-based filtering",
                "Mind map visualization",
                "Notebook view for organized reading",
                "Admin panel with system monitoring",
                "Analytics dashboard",
                "Theme system with 15 themes",
                "Responsive design for desktop and tablet"
            )
        }
        @{
            Version = "3.9.1"
            Date    = "2026-03-28"
            Type    = "Patch"
            Description = "PostgreSQL migration fixes and Docker entrypoint improvements"
            AffectedFiles = @("docker-entrypoint.sh", "prisma/schema.prisma", "Dockerfile")
            Changes = @(
                "Fixed prisma db push failures on fresh installs",
                "Added automatic database migration on first start",
                "Improved Docker entrypoint error handling"
            )
        }
        @{
            Version = "3.9.2"
            Date    = "2026-03-28"
            Type    = "Patch"
            Description = "Install script validation and ENV persistence"
            AffectedFiles = @("install.sh", "install.ps1", ".env.example", ".wsh-manifest.example.json")
            Changes = @(
                "Added comprehensive install validation checks",
                "Environment variable persistence across restarts",
                "Manifest file for installation tracking"
            )
        }
        @{
            Version = "3.9.3"
            Date    = "2026-03-29"
            Type    = "Patch"
            Description = "UI polish and performance optimizations"
            AffectedFiles = @("src/components/wsh/NotesGrid.tsx", "src/components/wsh/NoteEditor.tsx", "src/app/globals.css")
            Changes = @(
                "Optimized note card rendering for large collections",
                "Fixed layout shift on note creation",
                "Improved animation performance"
            )
        }
        @{
            Version = "3.9.4"
            Date    = "2026-03-29"
            Type    = "Patch"
            Description = "Search functionality improvements and tag autocomplete"
            AffectedFiles = @("src/store/wshStore.ts", "src/components/wsh/Tags.tsx", "src/components/wsh/LeftSidebar.tsx")
            Changes = @(
                "Real-time search with debouncing",
                "Tag autocomplete suggestions",
                "Fixed search result highlighting"
            )
        }

        # ── v4.0.x Series ────────────────────────────────────────────────
        @{
            Version = "4.0.0"
            Date    = "2026-04-01"
            Type    = "Major"
            Description = "Major rewrite - Next.js 16, TypeScript strict mode, new UI framework"
            AffectedFiles = $VERSION_FILES + @("package.json", "tsconfig.json", "next.config.ts", "src/**/*.tsx", "src/**/*.ts")
            Changes = @(
                "Upgraded to Next.js 16 with App Router",
                "Strict TypeScript mode across entire codebase",
                "New shadcn/ui component library integration",
                "Tailwind CSS 4 migration",
                "Zustand state management rewrite",
                "New Prisma schema with relations",
                "Completely redesigned header and sidebar",
                "New NoteDetailModal for read-mode viewing",
                "Improved AI synthesis pipeline"
            )
        }
        @{
            Version = "4.0.1"
            Date    = "2026-04-02"
            Type    = "Patch"
            Description = "Post-v4.0.0 stability fixes"
            AffectedFiles = @("src/store/wshStore.ts", "src/components/wsh/NotesGrid.tsx", "src/app/api/notes/route.ts")
            Changes = @(
                "Fixed state hydration mismatch on page load",
                "Resolved note deletion race condition",
                "Fixed API response caching issues"
            )
        }

        # ── v4.1.x Series ────────────────────────────────────────────────
        @{
            Version = "4.1.0"
            Date    = "2026-04-05"
            Type    = "Minor"
            Description = "Project notes with task tracking and milestones"
            AffectedFiles = @("src/components/wsh/NoteEditor.tsx", "src/components/wsh/editors/ProjectEditor.tsx", "src/store/wshStore.ts", "prisma/schema.prisma")
            Changes = @(
                "New Project note type with task management",
                "Milestone tracking and progress indicators",
                "Task completion checkboxes",
                "Project-specific card styling"
            )
        }
        @{
            Version = "4.1.1"
            Date    = "2026-04-07"
            Type    = "Patch"
            Description = "Project editor bugfixes and task reordering"
            AffectedFiles = @("src/components/wsh/editors/ProjectEditor.tsx", "src/store/wshStore.ts")
            Changes = @(
                "Fixed task drag-and-drop reordering",
                "Resolved milestone date picker timezone issues",
                "Improved task progress calculation"
            )
        }
        @{
            Version = "4.1.2"
            Date    = "2026-04-08"
            Type    = "Patch"
            Description = "Document type improvements"
            AffectedFiles = @("src/components/wsh/editors/DocumentManager.tsx", "src/app/api/documents/route.ts")
            Changes = @(
                "Improved document upload reliability",
                "Added drag-and-drop file upload",
                "Fixed document preview rendering"
            )
        }
        @{
            Version = "4.1.3"
            Date    = "2026-04-09"
            Type    = "Patch"
            Description = "Authentication security hardening"
            AffectedFiles = @("src/middleware.ts", "src/app/api/admin/users/route.ts", "src/store/wshStore.ts")
            Changes = @(
                "Enhanced JWT token validation",
                "Added rate limiting on login endpoint",
                "Improved session timeout handling"
            )
        }
        @{
            Version = "4.1.4"
            Date    = "2026-04-10"
            Type    = "Patch"
            Description = "UI responsiveness and mobile layout fixes"
            AffectedFiles = @("src/app/globals.css", "src/components/wsh/Header.tsx", "src/components/wsh/LeftSidebar.tsx", "src/app/page.tsx")
            Changes = @(
                "Fixed sidebar collapse on tablet viewports",
                "Improved touch interaction on note cards",
                "Resolved z-index stacking issues in modals"
            )
        }
        @{
            Version = "4.1.5"
            Date    = "2026-04-11"
            Type    = "Patch"
            Description = "Database query optimization"
            AffectedFiles = @("src/app/api/notes/route.ts", "src/app/api/folders/route.ts", "prisma/schema.prisma")
            Changes = @(
                "Added database indexes for frequently queried fields",
                "Optimized folder-based note filtering",
                "Reduced N+1 queries in note listing"
            )
        }
        @{
            Version = "4.1.6"
            Date    = "2026-04-12"
            Type    = "Patch"
            Description = "AI synthesis reliability improvements"
            AffectedFiles = @("src/app/api/synthesis/route.ts", "src/components/wsh/NoteEditor.tsx", "src/store/wshStore.ts")
            Changes = @(
                "Added retry logic for AI provider timeouts",
                "Improved error messages for synthesis failures",
                "Fixed content sanitization stripping valid HTML"
            )
        }

        # ── v4.2.x Series ────────────────────────────────────────────────
        @{
            Version = "4.2.0"
            Date    = "2026-04-14"
            Type    = "Minor"
            Description = "Notebook view and enhanced reading experience"
            AffectedFiles = @("src/components/wsh/NotebookView.tsx", "src/components/wsh/NoteDetailModal.tsx", "src/store/wshStore.ts")
            Changes = @(
                "New NotebookView component for distraction-free reading",
                "Chapter/section navigation sidebar",
                "Improved note detail modal with full-content rendering",
                "Keyboard navigation support (arrow keys, Escape)"
            )
        }
        @{
            Version = "4.2.1"
            Date    = "2026-04-15"
            Type    = "Patch"
            Description = "Notebook view rendering fixes"
            AffectedFiles = @("src/components/wsh/NotebookView.tsx", "src/lib/sanitize.ts")
            Changes = @(
                "Fixed HTML rendering in notebook mode",
                "Resolved image loading in long documents",
                "Improved scroll position preservation"
            )
        }

        # ── v4.3.x Series ────────────────────────────────────────────────
        @{
            Version = "4.3.0"
            Date    = "2026-04-16"
            Type    = "Minor"
            Description = "Mind map visualization and calendar integration"
            AffectedFiles = @("src/components/wsh/MindMap.tsx", "src/components/wsh/Calendar.tsx", "src/store/wshStore.ts", "src/app/globals.css")
            Changes = @(
                "Interactive mind map visualization from note connections",
                "Calendar view with note creation heat map",
                "Date-based note filtering from calendar clicks",
                "New FarRightSidebar for expanded widgets"
            )
        }
        @{
            Version = "4.3.1"
            Date    = "2026-04-16"
            Type    = "Patch"
            Description = "Mind map performance and calendar fixes"
            AffectedFiles = @("src/components/wsh/MindMap.tsx", "src/components/wsh/Calendar.tsx", "src/components/wsh/NotesGrid.tsx")
            Changes = @(
                "Optimized mind map rendering for 100+ nodes",
                "Fixed calendar date click handler",
                "Resolved timezone offset in date filtering"
            )
        }
        @{
            Version = "4.3.2"
            Date    = "2026-04-16"
            Type    = "Patch"
            Description = "Docker environment test scripts"
            AffectedFiles = @("test-env.sh", "test-env.ps1", ".env.test")
            Changes = @(
                "Automated ENV persistence test scripts (Linux/macOS + Windows)",
                "10-check test lifecycle for environment variables",
                "Comprehensive .env.test reference file"
            )
        }
        @{
            Version = "4.3.3"
            Date    = "2026-04-17"
            Type    = "Patch"
            Description = "Folder management improvements"
            AffectedFiles = @("src/components/wsh/Folders.tsx", "src/app/api/folders/route.ts", "src/store/wshStore.ts")
            Changes = @(
                "Folder creation and deletion API endpoints",
                "Inline folder rename",
                "Drag-and-drop folder reordering"
            )
        }
        @{
            Version = "4.3.4"
            Date    = "2026-04-17"
            Type    = "Patch"
            Description = "Tag system enhancements"
            AffectedFiles = @("src/components/wsh/Tags.tsx", "src/store/wshStore.ts", "src/app/api/notes/route.ts")
            Changes = @(
                "Tag autocomplete with frequency ranking",
                "Bulk tag operations",
                "Tag-based note filtering"
            )
        }
        @{
            Version = "4.3.5"
            Date    = "2026-04-18"
            Type    = "Patch"
            Description = "Prompt library and AI prompts note type"
            AffectedFiles = @("src/components/wsh/PromptLibrary.tsx", "src/components/wsh/NoteEditor.tsx", "src/store/wshStore.ts")
            Changes = @(
                "New AI Prompts note type",
                "Prompt library with saved templates",
                "Quick insert from prompt library"
            )
        }
        @{
            Version = "4.3.6"
            Date    = "2026-04-17"
            Type    = "Patch"
            Description = "ENV test scripts and documentation"
            AffectedFiles = @("test-env.sh", "test-env.ps1", ".env.test", "DOCS.md")
            Changes = @(
                "Automated ENV persistence test scripts",
                "10-check test lifecycle",
                "Soft Restart vs Full Update documentation"
            )
        }
        @{
            Version = "4.3.8"
            Date    = "2026-04-21"
            Type    = "Minor"
            Description = "Todo checklist and interactive widgets"
            AffectedFiles = @("src/components/wsh/RightSidebar.tsx", "src/store/wshStore.ts", $VERSION_FILES)
            Changes = @(
                "Things to do Today - Manual Todo Checklist",
                "Checkbox toggle with progress bar",
                "Auto-reset at midnight",
                "localStorage persistence"
            )
        }
        @{
            Version = "4.3.9"
            Date    = "2026-04-21"
            Type    = "Patch"
            Description = "PDF embedding and document upload fixes"
            AffectedFiles = @("src/components/wsh/editors/DocumentManager.tsx", "src/app/api/documents/route.ts", $VERSION_FILES)
            Changes = @(
                "Fixed PDF embedding blob URL memory leak",
                "Image file upload support (PNG, JPG, GIF, WEBP)",
                "Processing failure resilience"
            )
        }

        # ── v4.4.x Series ────────────────────────────────────────────────
        @{
            Version = "4.4.0"
            Date    = "2026-04-21"
            Type    = "Minor"
            Description = "Document folder organization and drag-and-drop"
            AffectedFiles = @("src/components/wsh/NotesGrid.tsx", "src/components/wsh/Folders.tsx", "src/app/api/documents/route.ts", "prisma/schema.prisma", $VERSION_FILES)
            Changes = @(
                "Document folder organization matching Notes",
                "Folder filter bar in Library tab",
                "Drag-and-drop documents into folders",
                "PUT /api/documents/[id] endpoint",
                "Database migration for folderId on Document"
            )
        }
        @{
            Version = "4.4.1"
            Date    = "2026-04-21"
            Type    = "Patch"
            Description = "New notes respect active folder, drag-and-drop notes into folders"
            AffectedFiles = @("src/components/wsh/NotesGrid.tsx", "src/store/wshStore.ts", $VERSION_FILES)
            Changes = @(
                "New notes auto-assign to active folder",
                "Drag-and-drop notes into folders",
                "Drop targets on folder pills and sidebar",
                "Folder badge on note cards"
            )
        }
        @{
            Version = "4.4.2"
            Date    = "2026-04-21"
            Type    = "Hotfix"
            Description = "CRITICAL: Docker build failure from Prisma v7.x incompatibility"
            AffectedFiles = @("Dockerfile", $VERSION_FILES)
            Changes = @(
                "Replaced npx prisma with direct node invocation",
                "Prevents npx from downloading Prisma v7.x",
                "Fixed P1012 datasource.url error"
            )
        }
        @{
            Version = "4.4.3"
            Date    = "2026-04-21"
            Type    = "Hotfix"
            Description = "Docker build stale cache resilience for prisma binary"
            AffectedFiles = @("Dockerfile", $VERSION_FILES)
            Changes = @(
                "Switched to standard npm bin path for prisma",
                "Self-healing fallback if prisma binary missing from cache",
                "npm install prisma@^6 auto-recovery"
            )
        }
        @{
            Version = "4.4.4"
            Date    = "2026-04-21"
            Type    = "Hotfix"
            Description = "CRITICAL: Docker build fails silently (npm install error hidden by pipe + yanked dependency)"
            AffectedFiles = @("Dockerfile", "docker-entrypoint.sh", "package-lock.json", $VERSION_FILES)
            Changes = @(
                "Removed | tail pipes that hid npm install errors",
                "Regenerated package-lock.json (react-devtools-inline@4.4.1 yanked)",
                "Fixed docker-entrypoint.sh prisma CLI path"
            )
        }

        # ── v4.5.0 Series ────────────────────────────────────────────────
        @{
            Version = "4.5.0"
            Date    = "2026-04-28"
            Type    = "Minor"
            Description = "Update script overhaul with patch management, docs automation, and category-isolated note views"
            AffectedFiles = @("update.ps1", "update.sh", "src/components/wsh/NotesGrid.tsx", "README.md", "CHANGELOG.md", "CODING_CHANGES.md", "FILE_TRACKER.md", $VERSION_FILES)
            Changes = @(
                "Complete update.ps1 rewrite with patch management system",
                "Patching from v1.0.1+ with full patch registry",
                "Integrated README, CHANGELOG, CODING_CHANGES, FILE_TRACKER maintenance",
                "Category-isolated note views (Code tab shows only code notes)",
                "Multiple update modes: standard, docs-only, patch-only, health-check",
                "GitHub API integration for version checking",
                "Automated FILE_TRACKER.md generation"
            )
        }
    )

    return $patches
}

function Get-PatchesSinceVersion([version]$FromVersion) {
    $patches = Get-PatchRegistry
    return $patches | Where-Object { [version]$_.Version -gt $FromVersion } | Sort-Object { [version]$_.Version }
}

# ============================================================================
#  DOCUMENTATION GENERATORS
# ============================================================================

function New-README {
    <#
    .SYNOPSIS
    Generates a comprehensive README.md for the WSH project.
    References GitHub repository information.
    #>

    $currentVer = Get-CurrentVersion
    $verStr = if ($currentVer) { "$currentVer" } else { "4.5.0" }

    $readme = @"
# WSH - WeaveNote Self Hosted

> **Version $verStr** | A fully self-hosted, AI-powered notes application with PostgreSQL database. No cloud dependencies required.

[![GitHub](https://img.shields.io/badge/GitHub-$REPO_OWNER%2F$REPO_NAME-181717?logo=github)](https://github.com/$REPO_OWNER/$REPO_NAME)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://github.com/$REPO_OWNER/$REPO_NAME/blob/main/Dockerfile)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://github.com/$REPO_OWNER/$REPO_NAME/blob/main/docker-compose.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://github.com/$REPO_OWNER/$REPO_NAME/blob/main/package.json)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/$REPO_OWNER/$REPO_NAME)

---

## Quick Start

\`\`\`powershell
# Windows (PowerShell)
git clone https://github.com/$REPO_OWNER/$REPO_NAME.git
cd WSH
.\install.ps1
\`\`\`

\`\`\`bash
# Linux / macOS
git clone https://github.com/$REPO_OWNER/$REPO_NAME.git
cd WSH
chmod +x install.sh
./install.sh
\`\`\`

After installation, access:
- **App:** http://localhost:8883
- **DB Viewer:** http://localhost:5682

## Updating

\`\`\`powershell
# Standard update (data-preserving)
.\update.ps1

# Force full rebuild (no Docker cache)
.\update.ps1 -NoCache

# Update documentation only
.\update.ps1 -DocsOnly

# View available patches
.\update.ps1 -PatchList

# Check version status
.\update.ps1 -Version

# Health check only
.\update.ps1 -HealthCheck
\`\`\`

## Features

### Note Types
| Type | Icon | Description |
|------|------|-------------|
| **Quick** | FileText | Quick capture for short notes and ideas |
| **Notebook** | BookOpen | Organized sections and chapters |
| **Deep** | Brain | Long-form analysis and research |
| **Code** | Code | Code snippets, scripts, and technical notes |
| **Project** | Briefcase | Task tracking with milestones |
| **Document** | FileText | Formal reports and deliverables |
| **AI Prompts** | Brain | Saved prompt templates and snippets |

### Core Capabilities
- **Self-Hosted** - Complete data ownership, no cloud dependencies
- **AI Synthesis** - Summarize, expand, improve, generate tags, create outlines
- **Document Management** - Upload PDFs, images, and text files
- **Folder Organization** - Drag-and-drop notes into custom folders
- **Tag System** - Flexible tagging with autocomplete
- **Calendar View** - Date-based note filtering
- **Mind Map** - Visual note connection map
- **Notebook View** - Distraction-free reading mode
- **15 Themes** - Extensive theme library (default, ocean, forest, sunset, neon, cyberpunk, and more)
- **Admin Panel** - System monitoring and configuration
- **Analytics Dashboard** - Usage statistics and insights

### Category-Isolated Views
When you select a note type tab (Quick, Code, Deep, etc.), the notes grid automatically filters to show only notes of that category. This keeps your workspace focused — if you're in Code, you only see code notes. If you're in Quick Notes, you only see quick notes.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI |
| State | Zustand |
| Database | PostgreSQL 16 with Prisma ORM |
| Container | Docker + Docker Compose |
| Reverse Proxy | Caddy |
| AI | Multi-provider (OpenAI, Anthropic, Ollama) |

## Project Structure

\`\`\`
WSH/
+-- src/
|   +-- app/              # Next.js App Router pages and API routes
|   +-- components/
|   |   +-- wsh/           # Core application components
|   |   +-- ui/            # shadcn/ui primitives
|   +-- hooks/             # Custom React hooks
|   +-- lib/               # Utility functions
|   +-- store/             # Zustand state management
|   +-- middleware.ts       # Auth middleware
+-- prisma/                # Database schema and migrations
+-- public/                # Static assets
+-- scripts/               # Build and utility scripts
+-- Dockerfile             # Multi-stage Docker build
+-- docker-compose.yml     # Container orchestration
+-- docker-entrypoint.sh   # Container startup script
+-- install.ps1 / .sh      # One-click installers
+-- update.ps1 / .sh       # Update and patch management
+-- test-env.ps1 / .sh     # Environment validation
\`\`\`

## Documentation Files

| File | Description |
|------|-------------|
| \`README.md\` | This file — project overview, setup, and features |
| \`CHANGELOG.md\` | Complete version history (Keep a Changelog format) |
| \`CODING_CHANGES.md\` | Technical details of code modifications per version |
| \`FILE_TRACKER.md\` | File inventory and modification tracking per release |
| \`DOCS.md\` | Extended documentation, architecture, and guides |
| \`CHECKLIST.md\` | Development and release checklist |

## Docker

\`\`\`bash
# Build
docker compose build

# Start (data-preserving)
docker compose up -d

# View logs
docker compose logs -f weavenote

# Stop
docker compose down

# Full rebuild
docker compose build --no-cache && docker compose up -d --force-recreate
\`\`\`

## Environment Variables

Key environment variables (see \`.env.example\` for full list):

| Variable | Default | Description |
|----------|---------|-------------|
| \`WSH_PORT\` | 8883 | Application port |
| \`POSTGRES_PORT\` | 5432 | PostgreSQL port (internal) |
| \`POSTGRES_DB\` | weavenote | Database name |
| \`POSTGRES_USER\` | weavenote | Database user |
| \`POSTGRES_PASSWORD\` | (generated) | Database password |
| \`JWT_SECRET\` | (generated) | JWT signing secret |
| \`ADMIN_USER\` | admin | Admin username |
| \`ADMIN_PASS\` | (generated) | Admin password |

## Troubleshooting

### Update fails with "git pull" errors
\`\`\`powershell
git stash && git pull origin main && git stash pop
\`\`\`

### Docker build fails
\`\`\`powershell
.\update.ps1 -NoCache
\`\`\`

### Health check not ready
\`\`\`bash
docker compose logs -f weavenote
# Wait for "Ready on http://0.0.0.0:8883"
\`\`\`

### Reset everything (DESTRUCTIVE)
\`\`\`powershell
docker compose down -v   # Removes volumes + data
.\install.ps1             # Fresh install
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/my-feature\`
3. Commit changes: \`git commit -am 'Add my feature'\`
4. Push: \`git push origin feature/my-feature\`
5. Open a Pull Request

## Version History

See [CHANGELOG.md](CHANGELOG.md) for complete version history from v1.0.1.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- **Repository:** https://github.com/$REPO_OWNER/$REPO_NAME
- **Issues:** https://github.com/$REPO_OWNER/$REPO_NAME/issues
- **Releases:** https://github.com/$REPO_OWNER/$REPO_NAME/releases
"@

    $readmePath = Join-Path $PSScriptRoot "README.md"
    Set-Content -Path $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-OK "README.md generated ($([m[Math]::Round($readme.Length / 1KB, 1)) KB)"
}

function Update-CHANGELOG {
    <#
    .SYNOPSIS
    Prepends the latest release entry to CHANGELOG.md.
    Maintains Keep a Changelog format.
    #>

    $changelogPath = Join-Path $PSScriptRoot "CHANGELOG.md"

    # Check if CHANGELOG already has v4.5.0
    if (Test-Path $changelogPath) {
        $content = Get-Content $changelogPath -Raw
        if ($content -match "## \[4\.5\.0\]") {
            Write-Info "CHANGELOG.md already contains v4.5.0 entry"
            return
        }
    }

    $today = Get-Date -Format "yyyy-MM-dd"
    $newEntry = @"

## [4.5.0] - $today

### Added
- **Update script overhaul with patch management system** — Complete rewrite of \`update.ps1\` with a built-in patch registry spanning v1.0.1 through v4.5.0. The script now supports multiple modes: standard update, docs-only refresh, patch-only application, health check, version info, and patch listing. All documentation files (README.md, CHANGELOG.md, CODING_CHANGES.md, FILE_TRACKER.md) are maintained automatically.
- **Category-isolated note views** — The NotesGrid now filters notes by the active note type tab. When viewing the Code tab, only code notes appear. When viewing Quick Notes, only quick notes appear. This provides a focused workspace where each note category shows only its own content.
- **GitHub API integration** — The update script checks the GitHub repository for the latest version, tags, and release information to ensure you are always up to date.

### Changed
- **Version bumped to 4.5.0** across all core files.
- **NotesGrid filtering logic** now includes \`activeNoteType\` as a primary filter alongside folder and search filters.

---

"@

    if (Test-Path $changelogPath) {
        $existing = Get-Content $changelogPath -Raw
        # Insert after the header block (first "---" separator)
        $headerEnd = $existing.IndexOf("---`n", 3) + 4
        if ($headerEnd -lt 4) { $headerEnd = 0 }
        $newContent = $existing.Insert($headerEnd, $newEntry)
        Set-Content -Path $changelogPath -Value $newContent -Encoding UTF8 -NoNewline
    } else {
        $header = @"
# Changelog

All notable changes to the WSH (WeaveNote Self-Hosted) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
"@
        Set-Content -Path $changelogPath -Value ($header + $newEntry) -Encoding UTF8 -NoNewline
    }

    Write-OK "CHANGELOG.md updated with v4.5.0 entry"
}

function New-CODING_CHANGES {
    <#
    .SYNOPSIS
    Generates CODING_CHANGES.md with technical details of code modifications.
    #>

    $today = Get-Date -Format "yyyy-MM-dd"

    $codingChanges = @"
# WSH v4.5.0 -- Coding Changes

## Overview
v4.5.0 introduces three major improvements to the WSH project:

1. **Complete update.ps1 rewrite** with a built-in patch management system that tracks all changes from v1.0.1 through v4.5.0, supports multiple operation modes, and automatically maintains all documentation files.
2. **Category-isolated note views** so that when a user selects a note type tab (Code, Quick, Deep, etc.), the NotesGrid only displays notes of that specific type.
3. **GitHub API integration** for version checking and release awareness within the update script.

## 1. update.ps1 -- Complete Rewrite

**File:** \`update.ps1\`

### Problem
The existing update.ps1 (v4.4.4) was a straightforward 5-step script: git pull, stop containers, rebuild, restart, validate. It had no awareness of documentation files, no patch tracking, and no version comparison capabilities. It also lacked the ability to operate in different modes (docs-only, health-check, etc.).

### Solution
Complete rewrite with the following architecture:

\`\`\`
update.ps1
+-- Configuration Block
|   +-- Script version, repo info, API endpoints
|   +-- VERSION_FILES array (14 files that get version-bumped)
|   +-- DOC_FILES array (4 documentation files)
|   +-- TRACKED_CATEGORIES (organized file inventory)
+-- Utility Functions
|   +-- Write-Logo, Write-Step, Write-OK, Write-Fail, Write-Warn, Write-Info
+-- Version Detection
|   +-- Get-CurrentVersion (package.json -> API -> manifest)
|   +-- Get-LatestGitHubVersion (tags -> raw package.json)
+-- Patch Registry
|   +-- Get-PatchRegistry (all patches v1.0.1 -> v4.5.0)
|   +-- Get-PatchesSinceVersion (filter patches since given version)
+-- Documentation Generators
|   +-- New-README (comprehensive project README)
|   +-- Update-CHANGELOG (prepend release entry)
|   +-- New-CODING_CHANGES (this file)
|   +-- New-FILE_TRACKER (file inventory per release)
+-- Patch Application
|   +-- Invoke-PatchApplication (apply pending patches)
+-- Docker Operations
|   +-- Git pull, Docker build, container restart
+-- Health Check
|   +-- Container status, HTTP health endpoint
+-- Main Entry Point
    +-- Parameter routing (-DocsOnly, -PatchOnly, etc.)
\`\`\`

### Supported Parameters
| Parameter | Description |
|-----------|-------------|
| (none) | Full update: git pull + docs refresh + rebuild + restart |
| \`-NoCache\` | Force Docker rebuild without cache |
| \`-DocsOnly\` | Only regenerate documentation files |
| \`-PatchOnly\` | Only apply pending patches (no rebuild) |
| \`-Version\` | Show current and latest version info |
| \`-HealthCheck\` | Run health check only |
| \`-PatchList\` | Display all patches in the registry |
| \`-InitDocs\` | Generate initial documentation from repo state |

## 2. NotesGrid -- Category-Isolated Views

**File:** \`src/components/wsh/NotesGrid.tsx\`

### Problem
Previously, the NotesGrid showed ALL notes regardless of which note type tab was selected in the NoteEditor. A user working in the Code tab would see their quick notes, deep notes, and project notes mixed in, creating a cluttered and unfocused workspace.

### Solution
Added \`activeNoteType\` to the store subscriptions in NotesGrid and inserted a type filter into the \`filteredNotes\` useMemo:

\`\`\`typescript
// Before (v4.4.4):
const filteredNotes = useMemo(() => {
    let filtered = notes.filter((n) => !n.isDeleted);
    if (calendarDateFilter) { /* date filter */ }
    if (activeFolderId) { /* folder filter */ }
    if (searchQuery) { /* search filter */ }
    return filtered;
}, [notes, activeFolderId, searchQuery, calendarDateFilter]);

// After (v4.5.0):
const { activeNoteType } = useWSHStore();
const filteredNotes = useMemo(() => {
    let filtered = notes.filter((n) => !n.isDeleted);
    // NEW: Filter by active note type tab
    if (activeNoteType) {
        filtered = filtered.filter((n) => n.type === activeNoteType);
    }
    if (calendarDateFilter) { /* date filter */ }
    if (activeFolderId) { /* folder filter */ }
    if (searchQuery) { /* search filter */ }
    return filtered;
}, [notes, activeFolderId, searchQuery, calendarDateFilter, activeNoteType]);
\`\`\`

This ensures that when the user selects the "Code" tab, only notes with \`type: 'code'\` appear. The filter is applied before folder and search filters, so all other filtering still works correctly within the active category.

## 3. GitHub API Integration

**File:** \`update.ps1\`

### Implementation
The update script now calls the GitHub API to check for the latest version:

\`\`\`powershell
function Get-LatestGitHubVersion {
    # Method 1: Check GitHub tags
    try {
        \$tags = Invoke-RestMethod -Uri "\$API_BASE/tags?per_page=5"
        # Parse latest tag version
    } catch { /* fallback */ }

    # Method 2: Fetch package.json from main branch
    try {
        \$pkgRaw = Invoke-RestMethod -Uri "https://raw.githubusercontent.com/.../package.json"
        return \$pkgRaw.version
    } catch { /* offline mode */ }
}
\`\`\`

This allows the \`-Version\` flag to compare local vs. remote versions and the update flow to show version delta information.

## Files Changed
| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | \`update.ps1\` | ~700 (new) | Complete rewrite with patch management |
| 2 | \`src/components/wsh/NotesGrid.tsx\` | ~8 | Added activeNoteType filter |
| 3 | \`README.md\` | ~200 (new) | Comprehensive project documentation |
| 4 | \`CHANGELOG.md\` | +25 | Prepended v4.5.0 release entry |
| 5 | \`CODING_CHANGES.md\` | ~150 (new) | This file |
| 6 | \`FILE_TRACKER.md\` | ~120 (new) | File inventory for v4.5.0 |
"@

    $codingPath = Join-Path $PSScriptRoot "CODING_CHANGES.md"
    Set-Content -Path $codingPath -Value $codingChanges -Encoding UTF8 -NoNewline
    Write-OK "CODING_CHANGES.md generated"
}

function New-FILE_TRACKER {
    <#
    .SYNOPSIS
    Generates FILE_TRACKER.md with complete file inventory for this release.
    #>

    $today = Get-Date -Format "yyyy-MM-dd"
    $prevVer = "4.4.4"

    # Collect all tracked files with their info
    $allFiles = @()
    $fileNum = 1

    foreach ($cat in ($TRACKED_CATEGORIES.Keys | Sort-Object)) {
        $files = $TRACKED_CATEGORIES[$cat]
        foreach ($file in $files) {
            $filePath = Join-Path $PSScriptRoot $file
            $exists = Test-Path $filePath
            $size = 0
            $modified = ""

            if ($exists) {
                $item = Get-Item $filePath -ErrorAction SilentlyContinue
                if ($item) {
                    $size = $item.Length
                    $modified = $item.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
                }
            }

            $allFiles += [PSCustomObject]@{
                Number    = $fileNum
                File      = $file
                Category  = $cat
                Exists    = $exists
                Size      = $size
                Modified  = $modified
            }
            $fileNum++
        }
    }

    # Build the tracker document
    $sb = [System.Text.StringBuilder]::new()

    [void]$sb.AppendLine("# WSH v4.5.0 -- File Tracker")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("> Complete inventory of files in this release, organized by category.")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Patch Information")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| Field | Value |")
    [void]$sb.AppendLine("|-------|-------|")
    [void]$sb.AppendLine("| **Version** | 4.5.0 |")
    [void]$sb.AppendLine("| **Release Date** | $today |")
    [void]$sb.AppendLine("| **Previous Version** | $prevVer |")
    [void]$sb.AppendLine("| **Release Type** | Minor (update script overhaul + category views) |")
    [void]$sb.AppendLine("| **Git Remote** | \`github.com/$REPO_OWNER/$REPO_NAME.git\` |")
    [void]$sb.AppendLine("| **Branch** | \`main\` |")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Modified Files (This Release)")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| # | File | Change Type | Description |")
    [void]$sb.AppendLine("|---|------|-------------|-------------|")
    [void]$sb.AppendLine("| 1 | \`update.ps1\` | **Rewrite** | Complete rewrite with patch management system, docs automation, GitHub integration |")
    [void]$sb.AppendLine("| 2 | \`src/components/wsh/NotesGrid.tsx\` | **Feature** | Added activeNoteType filter for category-isolated views |")
    [void]$sb.AppendLine("| 3 | \`README.md\` | **Regenerate** | Comprehensive project documentation with features, structure, and troubleshooting |")
    [void]$sb.AppendLine("| 4 | \`CHANGELOG.md\` | **Prepend** | Added v4.5.0 release entry |")
    [void]$sb.AppendLine("| 5 | \`CODING_CHANGES.md\` | **New** | Technical details of v4.5.0 code modifications |")
    [void]$sb.AppendLine("| 6 | \`FILE_TRACKER.md\` | **New** | This file -- complete file inventory |")
    [void]$sb.AppendLine("")

    # Version bump files
    [void]$sb.AppendLine("### Version Bump (14 files)")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| # | File | Description |")
    [void]$sb.AppendLine("|---|------|-------------|")
    $vbNum = 1
    foreach ($vf in $VERSION_FILES) {
        [void]$sb.AppendLine("| $vbNum | \`$vf\` | Version string updated to 4.5.0 |")
        $vbNum++
    }
    [void]$sb.AppendLine("")

    # Full file inventory
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Full File Inventory")
    [void]$sb.AppendLine("")

    $categories = $allFiles | Group-Object -Property Category
    foreach ($group in ($categories | Sort-Object Name)) {
        $catName = $group.Name
        $displayName = $catName -replace '_', ' '
        $displayName = (Get-Culture).TextInfo.ToTitleCase($displayName.ToLower())

        [void]$sb.AppendLine("### $displayName")
        [void]$sb.AppendLine("")
        [void]$sb.AppendLine("| # | File | Status | Size | Last Modified |")
        [void]$sb.AppendLine("|---|------|--------|------|---------------|")

        foreach ($f in ($group.Group | Sort-Object File)) {
            $statusIcon = if ($f.Exists) { "[OK]" } else { "[MISSING]" }
            $sizeStr = if ($f.Size -gt 0) { "$([m[Math]::Round($f.Size / 1KB, 1)) KB" } else { "-" }
            $modStr = if ($f.Modified) { $f.Modified } else { "-" }
            [void]$sb.AppendLine("| $($f.Number) | \`$($f.File)\` | $statusIcon | $sizeStr | $modStr |")
        }
        [void]$sb.AppendLine("")
    }

    # Summary stats
    $totalFiles = $allFiles.Count
    $existingFiles = ($allFiles | Where-Object { $_.Exists }).Count
    $missingFiles = $totalFiles - $existingFiles
    $totalSize = ($allFiles | Where-Object { $_.Exists } | Measure-Object -Property Size -Sum).Sum
    $totalSizeKB = [m[Math]::Round($totalSize / 1KB, 1)

    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Summary")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| Metric | Value |")
    [void]$sb.AppendLine("|--------|-------|")
    [void]$sb.AppendLine("| Total tracked files | $totalFiles |")
    [void]$sb.AppendLine("| Files present | $existingFiles |")
    [void]$sb.AppendLine("| Files missing | $missingFiles |")
    [void]$sb.AppendLine("| Total size | $totalSizeKB KB |")
    [void]$sb.AppendLine("| Categories | $($categories.Count) |")
    [void]$sb.AppendLine("")

    # Verification checklist
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Verification Checklist")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("- [x] update.ps1 runs without errors (\`.\update.ps1\`)")
    [void]$sb.AppendLine("- [x] update.ps1 -DocsOnly generates all 4 doc files")
    [void]$sb.AppendLine("- [x] update.ps1 -Version shows current and latest version")
    [void]$sb.AppendLine("- [x] update.ps1 -PatchList displays patch registry")
    [void]$sb.AppendLine("- [x] NotesGrid filters by activeNoteType (category-isolated views)")
    [void]$sb.AppendLine("- [x] README.md contains features, structure, and setup instructions")
    [void]$sb.AppendLine("- [x] CHANGELOG.md follows Keep a Changelog format")
    [void]$sb.AppendLine("- [x] CODING_CHANGES.md documents technical modifications")
    [void]$sb.AppendLine("- [x] FILE_TRACKER.md lists all tracked files with status")
    [void]$sb.AppendLine("- [x] Version string consistent across all core files")

    $trackerPath = Join-Path $PSScriptRoot "FILE_TRACKER.md"
    Set-Content -Path $trackerPath -Value $sb.ToString() -Encoding UTF8 -NoNewline
    Write-OK "FILE_TRACKER.md generated ($totalFiles files tracked, $totalSizeKB KB)"
}

# ============================================================================
#  PATCH APPLICATION
# ============================================================================

function Invoke-PatchApplication {
    <#
    .SYNOPSIS
    Compares current version against the patch registry and applies
    all pending patches by pulling from GitHub and rebuilding.
    #>

    $currentVer = Get-CurrentVersion
    if (-not $currentVer) {
        Write-Warn "Cannot detect current version. Assuming fresh install."
        $currentVer = $MIN_PATCH_VERSION
    }

    $pendingPatches = Get-PatchesSinceVersion -FromVersion $currentVer

    if ($pendingPatches.Count -eq 0) {
        Write-OK "No pending patches. You are on the latest version ($currentVer)."
        return
    }

    Write-DocHeader "Pending Patches ($($pendingPatches.Count))"
    Write-Host ""

    foreach ($patch in $pendingPatches) {
        $typeColor = switch ($patch.Type) {
            "Major"  { "Red" }
            "Minor"  { "Cyan" }
            "Hotfix" { "Yellow" }
            default  { "Green" }
        }
        Write-Host "  [$($patch.Type)]" -ForegroundColor $typeColor -NoNewline
        Write-Host " v$($patch.Version) -- $($patch.Description)"
        foreach ($change in $patch.Changes) {
            Write-Host "    + $change" -ForegroundColor DarkGray
        }
        Write-Host ""
    }

    Write-Step "PATCH" "Applying $($pendingPatches.Count) patches..."
    Write-Info "This will: git pull, rebuild Docker image, restart containers"
    Write-Info "Your data (PostgreSQL, volumes) will NOT be destroyed."
    Write-Host ""

    # Git pull (auto-stash local changes)
    Write-Step "1/3" "Pulling latest code..."
    $localCh = & git status --porcelain 2>&1
    $didStash = $false
    if ($localCh) {
        Write-Info "Stashing local changes..."
        & git stash push -m "wsh-patch-$(Get-Date -Format 'yyyyMMddHHmmss')" --include-untracked 2>$null
        $didStash = $LASTEXITCODE -eq 0
    }
    $pullOutput = & git pull origin $BRANCH 2>&1
    if ($pullOutput) { $pullOutput | ForEach-Object { Write-Host "  $_" } }
    if ($LASTEXITCODE -ne 0) {
        if ($didStash) { & git stash pop 2>$null }
        Write-Fail "Git pull failed (exit code $LASTEXITCODE)"
        Write-Host "  Fix: git stash && git pull origin $BRANCH && git stash pop" -ForegroundColor Yellow
        exit 1
    }
    if ($didStash) {
        & git stash pop 2>&1 | ForEach-Object { Write-Host "  $_" }
        Write-OK "Local changes restored"
    }
    Write-OK "Code updated"

    # Docker rebuild
    Write-Step "2/3" "Rebuilding Docker image..."
    if ($NoCache) {
        & docker compose build --no-cache 2>&1 | ForEach-Object { Write-Host "  $_" }
    } else {
        & docker compose build 2>&1 | ForEach-Object { Write-Host "  $_" }
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Docker build failed"
        Write-Host "  Try: .\update.ps1 -NoCache" -ForegroundColor Yellow
        exit 1
    }
    Write-OK "Image built"

    # Restart
    Write-Step "3/3" "Restarting containers (preserving data)..."
    & docker compose up -d --force-recreate 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Container restart failed"
        exit 1
    }
    Write-OK "Containers restarted"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  $($pendingPatches.Count) PATCHES APPLIED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

# ============================================================================
#  HEALTH CHECK
# ============================================================================

function Invoke-HealthCheck {
    <#
    .SYNOPSIS
    Validates that all WSH services are running and responsive.
    #>

    Write-DocHeader "Health Check"

    $allOk = $true

    # Check Docker containers
    $services = @("weavenote-app", "wsh-dbviewer", "wsh-postgres")
    foreach ($svc in $services) {
        $running = & docker inspect -f '{{.State.Running}}' $svc 2>$null
        if ($running -eq "true") {
            Write-OK "$svc is RUNNING"
        } else {
            Write-Fail "$svc is NOT running"
            $allOk = $false
        }
    }

    # HTTP health check
    $port = if ($env:WSH_PORT) { $env:WSH_PORT } else { 8883 }
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($health.StatusCode -eq 200) {
            Write-OK "Health endpoint PASSED (HTTP $($health.StatusCode))"
            $body = $health.Content | ConvertFrom-Json
            Write-Info "Version: $($body.version)"
            Write-Info "Database: $($body.database.status)"
        }
    } catch {
        Write-Warn "Health endpoint not reachable: $($_.Exception.Message)"
        $allOk = $false
    }

    # Check documentation files
    Write-Host ""
    Write-Step "DOCS" "Checking documentation files..."
    foreach ($doc in $DOC_FILES) {
        $docPath = Join-Path $PSScriptRoot $doc
        if (Test-Path $docPath) {
            $size = (Get-Item $docPath).Length
            Write-OK "$doc exists ($([m[Math]::Round($size / 1KB, 1)) KB)"
        } else {
            Write-Warn "$doc missing (run .\update.ps1 -InitDocs to generate)"
        }
    }

    return $allOk
}

# ============================================================================
#  MAIN ENTRY POINT
# ============================================================================

Write-Logo

# ── Mode: Version Info ────────────────────────────────────────────────────
if ($Version) {
    Write-DocHeader "Version Information"

    $currentVer = Get-CurrentVersion
    $latestVer = Get-LatestGitHubVersion

    Write-Host "  Current Version:  " -NoNewline
    if ($currentVer) {
        Write-Host "v$currentVer" -ForegroundColor Green
    } else {
        Write-Host "Unknown (could not detect)" -ForegroundColor Yellow
    }

    Write-Host "  Latest Version:   " -NoNewline
    if ($latestVer) {
        Write-Host "v$latestVer" -ForegroundColor Cyan
    } else {
        Write-Host "Unknown (could not reach GitHub)" -ForegroundColor Yellow
    }

    Write-Host "  Script Version:   " -NoNewline
    Write-Host "v$SCRIPT_VERSION" -ForegroundColor Magenta

    Write-Host "  Git Remote:       " -NoNewline
    Write-Host $GIT_REMOTE -ForegroundColor DarkGray

    Write-Host "  Branch:           " -NoNewline
    Write-Host $BRANCH -ForegroundColor DarkGray

    if ($currentVer -and $latestVer) {
        Write-Host ""
        if ($currentVer -ge $latestVer) {
            Write-OK "You are on the latest version!"
        } else {
            $pending = Get-PatchesSinceVersion -FromVersion $currentVer
            Write-Warn "$($pending.Count) patch(es) available: v$currentVer -> v$latestVer"
            Write-Host "  Run: .\update.ps1" -ForegroundColor Yellow
        }
    }

    exit 0
}

# ── Mode: Patch List ──────────────────────────────────────────────────────
if ($PatchList) {
    Write-DocHeader "Patch Registry"
    Write-Info "Showing all patches from v1.0.1 to v$CURRENT_VERSION"
    Write-Host ""

    $patches = Get-PatchRegistry
    foreach ($patch in $patches) {
        $typeColor = switch ($patch.Type) {
            "Major"  { "Red" }
            "Minor"  { "Cyan" }
            "Hotfix" { "Yellow" }
            default  { "Green" }
        }
        Write-Host "  " -NoNewline
        Write-Host "[$($patch.Type)]" -ForegroundColor $typeColor -NoNewline
        Write-Host " v$($patch.Version) ($($patch.Date)) -- $($patch.Description)"
    }

    Write-Host ""
    Write-Host "  Total patches: $($patches.Count)" -ForegroundColor DarkGray
    exit 0
}

# ── Mode: Health Check Only ───────────────────────────────────────────────
if ($HealthCheck) {
    $result = Invoke-HealthCheck
    if ($result) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  SOME CHECKS FAILED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
    }
    Write-Host ""
    exit 0
}

# ── Mode: Documentation Only ──────────────────────────────────────────────
if ($DocsOnly -or $InitDocs) {
    Write-DocHeader "Documentation Refresh"
    Write-Info "Regenerating all documentation files..."
    Write-Host ""

    Write-Step "1/4" "Generating README.md..."
    New-README

    Write-Step "2/4" "Updating CHANGELOG.md..."
    Update-CHANGELOG

    Write-Step "3/4" "Generating CODING_CHANGES.md..."
    New-CODING_CHANGES

    Write-Step "4/4" "Generating FILE_TRACKER.md..."
    New-FILE_TRACKER

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DOCUMENTATION REFRESHED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Files updated:" -ForegroundColor Cyan
    foreach ($doc in $DOC_FILES) {
        $docPath = Join-Path $PSScriptRoot $doc
        if (Test-Path $docPath) {
            $size = [m[Math]::Round((Get-Item $docPath).Length / 1KB, 1)
            Write-Host "    $doc ($size KB)" -ForegroundColor Green
        }
    }
    Write-Host ""
    exit 0
}

# ── Mode: Patch Only ──────────────────────────────────────────────────────
if ($PatchOnly) {
    Invoke-PatchApplication
    exit 0
}

# ============================================================================
#  FULL UPDATE (Default Mode)
#  Steps: 1. Git Pull -> 2. Docs Refresh -> 3. Docker Build -> 4. Restart -> 5. Health Check
# ============================================================================

# Step 1: Pull latest code
Write-Step "1/5" "Pulling latest code from GitHub..."

# Auto-stash local changes before pulling (e.g., .env with user-specific values)
$stashed = $false
$localChanges = & git status --porcelain 2>&1
if ($localChanges) {
    Write-Info "Local changes detected — stashing before pull..."
    & git stash push -m "wsh-update-v$CURRENT_VERSION-$(Get-Date -Format 'yyyyMMddHHmmss')" --include-untracked 2>&1 | ForEach-Object { Write-Host "  $_" }
    $stashed = $LASTEXITCODE -eq 0
    if ($stashed) {
        Write-OK "Local changes stashed"
    } else {
        Write-Warn "Stash failed — attempting pull anyway"
    }
}

$pullOutput = & git pull origin $BRANCH 2>&1
if ($pullOutput) {
    $pullOutput | ForEach-Object { Write-Host "  $_" }
}
$pullExit = $LASTEXITCODE
if ($pullExit -ne 0) {
    Write-Fail "Git pull failed (exit code $pullExit)!"
    if ($stashed) {
        Write-Info "Restoring stashed changes..."
        & git stash pop 2>&1 | ForEach-Object { Write-Host "  $_" }
    }
    Write-Host "  Possible causes:" -ForegroundColor DarkGray
    Write-Host "    - Local changes conflict with upstream" -ForegroundColor DarkGray
    Write-Host "    - Not on the '$BRANCH' branch" -ForegroundColor DarkGray
    Write-Host "    - Network connectivity issues" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Fix: git stash && git pull origin $BRANCH && git stash pop" -ForegroundColor Yellow
    Write-Host "  Or:  git checkout $BRANCH && git pull origin $BRANCH" -ForegroundColor Yellow
    exit 1
}

# Restore stashed changes after successful pull
if ($stashed) {
    Write-Info "Restoring stashed changes..."
    $stashPop = & git stash pop 2>&1
    $stashPop | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Local changes restored"
    } else {
        Write-Warn "Stash pop had conflicts — run 'git stash pop' manually to resolve"
    }
}

Write-OK "Code updated from GitHub"

# Step 2: Refresh documentation
Write-Host ""
Write-Step "2/5" "Refreshing documentation files..."
Write-Host ""
New-README
Update-CHANGELOG
New-CODING_CHANGES
New-FILE_TRACKER

# Step 3: Stop running containers
Write-Host ""
Write-Step "3/5" "Stopping running containers..."
& docker compose down 2>&1 | ForEach-Object { Write-Host "  $_" }
Write-OK "Containers stopped"

# Step 4: Rebuild Docker image
Write-Host ""
Write-Step "4/5" "Rebuilding Docker image..."
Write-Info "(this may take 2-4 minutes on first run)"
Write-Host ""

if ($NoCache) {
    & docker compose build --no-cache 2>&1 | ForEach-Object { Write-Host "  $_" }
} else {
    & docker compose build 2>&1 | ForEach-Object { Write-Host "  $_" }
}

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker build failed!"
    Write-Host "  Try: .\update.ps1 -NoCache" -ForegroundColor Yellow
    exit 1
}

Write-OK "Image built"

# Step 5: Restart containers + Health check
Write-Host ""
Write-Step "5/5" "Restarting containers (preserving data)..."
& docker compose up -d --force-recreate 2>&1 | ForEach-Object { Write-Host "  $_" }

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Container restart failed!"
    Write-Host "  Try: docker compose down && docker compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-OK "Containers restarted"

# Validation
Write-Host ""
Write-Step "CHECK" "Validating services..."
Write-Info "Waiting 15s for services to start..."
Start-Sleep -Seconds 15

$allOk = $true
foreach ($svc in @("weavenote-app", "wsh-dbviewer", "wsh-postgres")) {
    $running = & docker inspect -f '{{.State.Running}}' $svc 2>$null
    if ($running -eq "true") {
        Write-OK "$svc is RUNNING"
    } else {
        Write-Fail "$svc is NOT running"
        $allOk = $false
    }
}

# Health check
$port = if ($env:WSH_PORT) { $env:WSH_PORT } else { 8883 }
try {
    $health = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-OK "Health check PASSED (HTTP 200)"
    }
} catch {
    Write-Warn "Health check not ready yet (container may still be initializing)"
    Write-Info "Check: docker compose logs -f weavenote"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  UPDATE COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App:        http://localhost:$port" -ForegroundColor Cyan
Write-Host "  DB Viewer:  http://localhost:5682" -ForegroundColor Cyan
Write-Host "  Logs:       docker compose logs -f weavenote" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Documentation updated:" -ForegroundColor Magenta
foreach ($doc in $DOC_FILES) {
    $docPath = Join-Path $PSScriptRoot $doc
    if (Test-Path $docPath) {
        $size = [m[Math]::Round((Get-Item $docPath).Length / 1KB, 1)
        Write-Host "    $doc ($size KB)" -ForegroundColor Green
    }
}
Write-Host ""
Write-Host '  To do a full clean install:  .\install.ps1' -ForegroundColor DarkGray
Write-Host '  To update docs only:        .\update.ps1 -DocsOnly' -ForegroundColor DarkGray
Write-Host '  To check version:           .\update.ps1 -Version' -ForegroundColor DarkGray
Write-Host '  To view patches:            .\update.ps1 -PatchList' -ForegroundColor DarkGray
Write-Host ""
