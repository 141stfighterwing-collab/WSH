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
