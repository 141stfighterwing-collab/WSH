# WSH — Component Testing Checklist

> **Purpose:** Run the relevant checks below whenever you modify a file in the corresponding section. This prevents regressions and catches common mistake patterns early.

---

## How to Use This Checklist

1. Identify which files you modified (or plan to modify).
2. Run every check in the matching section(s).
3. If any check fails, fix before committing.
4. For cross-cutting changes (e.g., store schema, types), run **ALL** sections.

---

## 1. Zustand Store (`src/store/wshStore.ts`)

| # | Check | Why |
|---|-------|-----|
| 1.1 | **Build passes** — `bun run build` completes with zero errors | Store changes can cascade type errors across all consumers |
| 1.2 | **New state fields added to `logoutUser()`** — Reset any new non-persisted fields to defaults (e.g., `calendarDateFilter: null`) | Prevents stale state leaking between user sessions after logout |
| 1.3 | **New persistable fields** — If adding a user preference (theme, darkMode, viewMode style), add to `saveToLocalStorage()` and `loadFromLocalStorage()` | Otherwise preference is lost on page reload |
| 1.4 | **Non-persistable fields excluded** — Notes, folders, and auth must NEVER be in `saveToLocalStorage()` | Database is source of truth; stale cache causes sync conflicts |
| 1.5 | **All fetch calls use `authHeaders()`** — No raw `fetch` without `Authorization` header for `/api/notes`, `/api/folders`, etc. | Middleware returns 401 for unprotected calls |
| 1.6 | **`NoteType` union updated** — If adding a new note type, update the union AND all `typeColors`/`typeIcons` maps in NotebookView, NoteDetailModal, NotesGrid, TrashModal, AnalyticsPanel | Missing entries cause `undefined` crashes when rendering |
| 1.7 | **Async actions handle `res.ok`** — Every fetch must check `res.ok` before calling `res.json()` to avoid parsing error responses | 401/500 error bodies are not valid data shapes |
| 1.8 | **`setNotes`/`setFolders` never called with localStorage data** — Only `syncFromServer()` should populate these from the DB | Prevents stale local data overwriting server truth |

---

## 2. Calendar (`src/components/wsh/Calendar.tsx`)

| # | Check | Why |
|---|-------|-----|
| 2.1 | **UTC-to-local conversion** — Note dates (`createdAt`) must use `toLocalDateStr()` or equivalent to convert UTC ISO strings to local date strings | Otherwise dots appear on wrong days in different timezones |
| 2.2 | **Dot indicator renders** — Notes created on past days show colored dots; empty days show no dot | Core visual feature |
| 2.3 | **Dot color follows theme** — Dots use `bg-[var(--pri-500)]` not a hardcoded color | Dots must change with all 15 themes |
| 2.4 | **Click to filter** — Clicking a day sets `calendarDateFilter` and NotesGrid shows only matching notes | Core interaction |
| 2.5 | **Click again to clear** — Clicking the same selected day clears the filter and shows all notes | Usability |
| 2.6 | **Selected day styling** — Selected day has visible highlight (`bg-pri-500/25 border border-pri-500/50` or equivalent) | Visual feedback |
| 2.7 | **No crash on empty notes** — Calendar renders correctly with zero notes (fresh user) | Edge case |

---

## 3. Notes Grid (`src/components/wsh/NotesGrid.tsx`)

| # | Check | Why |
|---|-------|-----|
| 3.1 | **Calendar filter works** — When `calendarDateFilter` is set, only notes matching that local date are shown | Core filter feature |
| 3.2 | **Combined filters** — Calendar + folder + search filters all apply simultaneously (intersection) | Users stack filters |
| 3.3 | **Empty state message** — When filters return zero results, show a helpful message (not a blank page) | UX |
| 3.4 | **Deleted notes hidden** — `isDeleted: true` notes never appear in the grid | Data integrity |
| 3.5 | **All 7 note types render** — Quick, Notebook, Deep, Code, Project, Document, AI Prompts all show correct type badge color | Type system consistency |

---

## 4. Note Editor (`src/components/wsh/NoteEditor.tsx`)

| # | Check | Why |
|---|-------|-----|
| 4.1 | **Sanitize AI output** — All innerHTML from synthesis must pass through `sanitizeHtml()` before `editorRef.current.innerHTML = ...` | XSS prevention |
| 4.2 | **Auth header on synthesis** — `fetch('/api/synthesis', { headers: { Authorization: \`Bearer \${token}\` } })` | 401 without it |
| 4.3 | **Save status shows "Saved ✓"** — Status comparison matches exactly (`saveStatus === 'Saved ✓'`) | Fixed regression where "Saved" vs "Saved ✓" mismatch hid the status |
| 4.4 | **Editor clears after save** — `clearEditor()` is called after successful save so user can write a new note | UX |
| 4.5 | **All toolbar buttons functional** — Bold, Italic, Underline, Strikethrough, Lists, Indent, Emoji, Color, Highlight, Font Size, Image, Attach File | All toolbar features |
| 4.6 | **Popups close on outside click** — All toolbar popups (emoji, color, highlight, font size, image dialog) close when clicking outside | UX |
| 4.7 | **Tag input works** — Type tag, press Enter, tag appears; Backspace removes last tag; duplicate tags rejected | Tag CRUD |
| 4.8 | **AI Prompts tab renders** — Switching to "AI Prompts" tab shows PromptLibrary, toolbar is hidden | Note type routing |
| 4.9 | **Code/Project/Document editors** — Each specialized editor tab renders correctly | Note type routing |

---

## 5. Settings Panel (`src/components/wsh/SettingsPanel.tsx`)

| # | Check | Why |
|---|-------|-----|
| 5.1 | **No `tags` store access** — Use `uniqueTagCount` (derived from `notes`) not `store.tags` | `tags` is not a top-level store field; causes crash |
| 5.2 | **AI status fetch has auth header** — `fetch('/api/synthesis', { headers: token ? { Authorization: ... } : {} })` | 401 without it |
| 5.3 | **`response.ok` check** — Check `if (!r.ok) return null` before `r.json()` | Parsing error JSON crashes |
| 5.4 | **Null-safe provider status** — `serverAiStatus?.configured && serverAiStatus.configured.length > 0` | Prevents `undefined.length` crash |
| 5.5 | **Provider selection disabled when no key** — Providers without API keys show "No Key" badge and are not clickable | Visual feedback |
| 5.6 | **Theme switching** — All 15 themes selectable, immediate visual change, persisted to localStorage | Core feature |
| 5.7 | **Dark/Light mode toggle** — Switching applies immediately, persisted to localStorage | Core feature |

---

## 6. Middleware (`src/middleware.ts`)

| # | Check | Why |
|---|-------|-----|
| 6.1 | **PUBLIC_PATHS correct** — Only truly public routes listed: `/api/health`, `/api/db-test`, `/api/admin/users/login`, `/api/admin/users/register`, `/api/admin/users/verify` | Missing entry blocks legitimate access; extra entry exposes protected route |
| 6.2 | **`/api/graph` NOT in PUBLIC_PATHS** — Graph data requires auth | Was a past security bug |
| 6.3 | **`/api/synthesis` NOT in PUBLIC_PATHS** — AI endpoints require auth | Security |
| 6.4 | **New API routes NOT auto-public** — Any new route under `/api/` is protected by default unless explicitly added | Security by default |

---

## 7. Synthesis API (`src/app/api/synthesis/route.ts`)

| # | Check | Why |
|---|-------|-----|
| 7.1 | **No `z-ai-web-dev-sdk`** — Must use native `fetch` to Anthropic/OpenAI/Gemini APIs directly | SDK was removed |
| 7.2 | **Auto-detection works** — `detectProvider()` checks `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` in order | Provider resolution |
| 7.3 | **Client provider/model override** — `clientProvider` and `clientModel` from request body take priority over env vars | Settings panel integration |
| 7.4 | **Model mapping** — Models in request are mapped via `CLAUDE_MODELS`/`OPENAI_MODELS`/`GEMINI_MODELS` dicts | Model alias resolution |
| 7.5 | **Daily limit enforcement** — Returns 429 when `aiUsageCount >= AI_DAILY_LIMIT` | Rate limiting |
| 7.6 | **No `anthropic-dangerous-direct-browser-access` header** — Was a security issue | Header removed |
| 7.7 | **GET endpoint returns provider status** — `GET /api/synthesis` returns `{ available, configured, provider, model }` | Settings panel reads this |

---

## 8. Authentication & Auth-dependent Components

| # | Check | Why |
|---|-------|-----|
| 8.1 | **All `fetch()` calls to protected routes include auth header** — Grep for `fetch('/api/` and verify each has `Authorization: Bearer ${token}` | 401 errors |
| 8.2 | **Login route returns `createdAt`/`updatedAt`** — Prisma `select` must include these fields | Used by Calendar and other components |
| 8.3 | **Logout clears all state** — `logoutUser()` resets notes, folders, calendarDateFilter, editor state, searchQuery, activeFolderId | Prevents data leaking between accounts |
| 8.4 | **Token verify on load** — `loadFromLocalStorage()` triggers token verification; invalid tokens trigger logout | Session validation |
| 8.5 | **Admin panel gated by role** — Only `admin`/`super-admin` see admin button in Header | Authorization |

---

## 9. XSS / HTML Sanitization

| # | Check | Why |
|---|-------|-----|
| 9.1 | **`sanitizeHtml()` in NoteEditor** — All AI synthesis output passes through sanitizer before `innerHTML` assignment | XSS prevention |
| 9.2 | **`sanitizeHTML()` in NotebookView** — Same sanitizer applied to rendered note content | XSS prevention |
| 9.3 | **`sanitizeHTML()` in NoteDetailModal** — Same sanitizer applied | XSS prevention |
| 9.4 | **`javascript:` URI filtering** — All sanitizers strip `javascript:` protocol from `href`/`src` attributes | XSS via URI injection |
| 9.5 | **`<script>` tag removal** — All sanitizers strip `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>` tags | XSS injection vectors |
| 9.6 | **Event handler removal** — All sanitizers strip `on*` event attributes (`onclick`, `onerror`, etc.) | XSS event handlers |

---

## 10. Timezone / Date Handling

| # | Check | Why |
|---|-------|-----|
| 10.1 | **AnalyticsPanel** — Date displays use local timezone conversion, not raw UTC | Dates shown to users must be local |
| 10.2 | **FarRightSidebar** — Same timezone conversion for "Today's Things" | Consistency |
| 10.3 | **RightSidebar** — Same timezone conversion | Consistency |
| 10.4 | **Calendar** — `toLocalDateStr()` used consistently for dot indicators and click filtering | Cross-timezone correctness |
| 10.5 | **No `new Date().toLocaleDateString()` without timezone** — Always explicit about timezone intent | Prevents timezone-dependent bugs |

---

## 11. CSS / Theme System

| # | Check | Why |
|---|-------|-----|
| 11.1 | **Dynamic theme classes** — Use `bg-pri-*`, `text-pri-*`, `border-pri-*` NOT hardcoded colors | 15-theme support |
| 11.2 | **CSS custom properties** — `var(--pri-500)` etc. used for colors that must change per theme | Theme consistency |
| 11.3 | **Dark mode compatibility** — Components use `dark:` prefix where needed OR use CSS custom properties that handle both modes | Both light and dark mode |
| 11.4 | **No `!important` abuse** — Tailwind utilities should resolve specificity naturally | Maintainability |

---

## 12. API Routes (General)

| # | Check | Why |
|---|-------|-----|
| 12.1 | **Input validation** — Request body fields validated before processing | Security |
| 12.2 | **Error responses are JSON** — All errors returned as `{ error: "message" }` with appropriate status codes | Client-side error handling |
| 12.3 | **No sensitive data in responses** — Passwords, tokens, API keys never leaked in API responses | Security |
| 12.4 | **New routes are NOT in PUBLIC_PATHS** — Unless intentionally public | Middleware protects by default |
| 12.5 | **Prisma error handling** — `try/catch` around DB operations, return 500 with generic message | Don't leak DB schema |

---

## 13. Admin Panel Components

| # | Check | Why |
|---|-------|-----|
| 13.1 | **All fetch calls include auth header** — Admin routes are protected by middleware | 401 errors |
| 13.2 | **Null-safe data rendering** — Handle empty arrays, null responses, undefined fields | Crash prevention |
| 13.3 | **Role-based visibility** — Admin panel only accessible to `admin`/`super-admin` | Authorization |

---

## 14. Docker & Deployment

| # | Check | Why |
|---|-------|-----|
| 14.1 | **Version strings match** — `package.json`, `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, install scripts, API health/system endpoints all show same version | Version consistency |
| 14.2 | **`.env.example` updated** — Any new env vars added to `.env.example` with comments | Documentation |
| 14.3 | **Build passes in Docker** — `docker compose build` completes successfully | Deployment readiness |
| 14.4 | **Health check passes** — `curl http://localhost:8883/api/health` returns 200 after startup | Container readiness |

---

## 15. Pre-Commit Quick Scan

Run these commands before every commit:

```bash
# 1. TypeScript build
bun run build

# 2. Check for auth header on all fetch calls (should NOT find unprotected /api/ calls)
rg "fetch\('/api/" src/ --type tsx -n
# Review each hit — should have Authorization header unless it's a public route

# 3. Check for z-ai-web-dev-sdk (should NOT exist)
rg "z-ai-web-dev-sdk" src/ --type ts
rg "z-ai-web-dev-sdk" src/ --type tsx

# 4. Check for hardcoded colors that should be theme-aware
rg "bg-\[#" src/components/wsh/ --type tsx -n
# Review — should use bg-pri-* or var(--pri-*) instead

# 5. Check for innerHTML without sanitizer
rg "innerHTML\s*=" src/components/wsh/ --type tsx -n
# Review — should have sanitizeHtml/sanitizeHTML call nearby

# 6. Check middleware PUBLIC_PATHS
rg "PUBLIC_PATHS" src/middleware.ts -A 10
# Verify no protected routes are listed
```

---

## 16. Post-Deploy Smoke Test

After every deployment, verify these in the browser:

- [ ] Login works with valid credentials
- [ ] Page reload preserves session
- [ ] Create a new note, save it, verify it appears in grid
- [ ] Open calendar, verify dots appear on days with notes
- [ ] Click a calendar day, verify notes filter
- [ ] Click same day again, verify filter clears
- [ ] Switch theme (try 3 different themes)
- [ ] Toggle dark/light mode
- [ ] Open Settings > AI Engine tab, verify provider status loads
- [ ] Run AI synthesis (summarize) on a note with content
- [ ] Open trash, restore a note
- [ ] Open mind map, verify nodes and edges render
- [ ] Open notebook view, verify notes render
- [ ] Open analytics, verify charts render
- [ ] Log out, verify all state is cleared
- [ ] Log back in, verify notes/folders restored from server
