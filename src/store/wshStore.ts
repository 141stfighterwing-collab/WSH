import { create } from 'zustand';

export type NoteType = 'quick' | 'notebook' | 'deep' | 'code' | 'project' | 'document' | 'ai-prompts';
export type ViewMode = 'grid' | 'focus';
export type ThemeName = 'default' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'midnight' | 'coffee' | 'neon' | 'cyberpunk' | 'nord' | 'dracula' | 'lavender' | 'earth' | 'yellow' | 'hyperblue';

export interface Note {
  id: string;
  title: string;
  content: string;
  rawContent: string;
  type: NoteType;
  tags: string[];
  color: string;
  folderId: string | null;
  userId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserState {
  isLoggedIn: boolean;
  username: string;
  email: string;
  token: string;
  role: string;
}

interface WSHState {
  // Notes
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => Promise<string | null>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;

  // Current Editor
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  editorTitle: string;
  setEditorTitle: (title: string) => void;
  editorContent: string;
  setEditorContent: (content: string) => void;
  editorRawContent: string;
  setEditorRawContent: (content: string) => void;
  activeNoteType: NoteType;
  setActiveNoteType: (type: NoteType) => void;
  editorTags: string[];
  setEditorTags: (tags: string[]) => void;
  addEditorTag: (tag: string) => void;
  removeEditorTag: (tag: string) => void;

  // Folders
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;

  // UI State
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;

  // Panels
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  analyticsOpen: boolean;
  setAnalyticsOpen: (open: boolean) => void;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  adminPanelOpen: boolean;
  setAdminPanelOpen: (open: boolean) => void;

  // Trash
  trashOpen: boolean;
  setTrashOpen: (open: boolean) => void;
  restoreNote: (id: string) => void;
  permanentDeleteNote: (id: string) => void;
  emptyTrash: () => void;

  // Mind Map
  mindMapOpen: boolean;
  setMindMapOpen: (open: boolean) => void;

  // Notebook View
  notebookOpen: boolean;
  setNotebookOpen: (open: boolean) => void;

  // Note Detail
  noteDetailId: string | null;
  setNoteDetailId: (id: string | null) => void;

  // DB Viewer
  dbViewerOpen: boolean;
  setDbViewerOpen: (open: boolean) => void;

  // User
  user: UserState;
  setUser: (user: Partial<UserState>) => void;
  logoutUser: () => void;
  aiUsageCount: number;
  setAiUsageCount: (count: number) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Calendar Date Filter
  calendarDateFilter: string | null;
  setCalendarDateFilter: (date: string | null) => void;

  // Persistence — only UI prefs, NEVER notes/folders data
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;

  // Server Sync — database is the single source of truth
  syncFromServer: () => Promise<void>;
  isSyncing: boolean;
}

const defaultUser: UserState = {
  isLoggedIn: false,
  username: '',
  email: '',
  token: '',
  role: 'user',
};

const STORAGE_KEY = 'wsh-state';

/** Get auth headers for API calls */
function authHeaders(): Record<string, string> {
  const token = useWSHStore.getState().user.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useWSHStore = create<WSHState>((set, get) => ({
  // Notes — ALL operations go through the database first
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: async (note) => {
    const token = get().user.token;
    if (!token) return null;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          rawContent: note.rawContent,
          type: note.type,
          tags: note.tags,
          color: note.color,
          folderId: note.folderId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const serverNote = data.note as Note;
        // Add to local state using the SERVER-generated ID
        set((state) => ({ notes: [serverNote, ...state.notes] }));
        return serverNote.id;
      }
    } catch {
      // Server unreachable — do NOT add locally, database is source of truth
    }
    return null;
  },
  updateNote: async (id, updates) => {
    const token = get().user.token;
    if (!token) return false;

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const updated = new Date().toISOString();
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: updated } : n
          ),
        }));
        return true;
      }
    } catch {
      // Server unreachable
    }
    return false;
  },
  deleteNote: async (id) => {
    const token = get().user.token;
    if (!token) return false;

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, isDeleted: true }),
      });
      if (res.ok) {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, isDeleted: true, updatedAt: new Date().toISOString() } : n
          ),
        }));
        return true;
      }
    } catch {
      // Server unreachable
    }
    return false;
  },

  // Current Editor
  activeNoteId: null,
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  editorTitle: '',
  setEditorTitle: (title) => set({ editorTitle: title }),
  editorContent: '',
  setEditorContent: (content) => set({ editorContent: content }),
  editorRawContent: '',
  setEditorRawContent: (content) => set({ editorRawContent: content }),
  activeNoteType: 'quick',
  setActiveNoteType: (type) => set({ activeNoteType: type }),
  editorTags: [],
  setEditorTags: (tags) => set({ editorTags: tags }),
  addEditorTag: (tag) => set((state) => ({
    editorTags: state.editorTags.includes(tag)
      ? state.editorTags
      : [...state.editorTags, tag],
  })),
  removeEditorTag: (tag) => set((state) => ({
    editorTags: state.editorTags.filter((t) => t !== tag),
  })),

  // Folders — ALL operations go through the database first
  folders: [],
  setFolders: (folders) => set({ folders }),
  addFolder: async (folder) => {
    const token = get().user.token;
    if (!token) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: folder.name, order: folder.order }),
      });
      if (res.ok) {
        const data = await res.json();
        const serverFolder = data.folder as Folder;
        set((state) => ({ folders: [...state.folders, serverFolder] }));
      }
    } catch {
      // Server unreachable
    }
  },
  updateFolder: async (id, updates) => {
    const token = get().user.token;
    if (!token) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      }
    } catch {
      // Server unreachable
    }
  },
  deleteFolder: async (id) => {
    const token = get().user.token;
    if (!token) return;
    try {
      const res = await fetch(`/api/folders?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
        }));
      }
    } catch {
      // Server unreachable
    }
  },
  activeFolderId: null,
  setActiveFolderId: (id) => set({ activeFolderId: id }),

  // UI State
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),
  darkMode: true,
  setDarkMode: (dark) => {
    set({ darkMode: dark });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', dark);
    }
  },
  toggleDarkMode: () => {
    const newDark = !get().darkMode;
    set({ darkMode: newDark });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newDark);
    }
  },
  theme: 'default',
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.body.className = `theme-${theme}`;
    }
  },

  // Panels
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  analyticsOpen: false,
  setAnalyticsOpen: (open) => set({ analyticsOpen: open }),
  loginOpen: false,
  setLoginOpen: (open) => set({ loginOpen: open }),
  adminPanelOpen: false,
  setAdminPanelOpen: (open) => set({ adminPanelOpen: open }),

  // Trash
  trashOpen: false,
  setTrashOpen: (open) => set({ trashOpen: open }),
  restoreNote: async (id) => {
    const token = get().user.token;
    if (!token) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, isDeleted: false }),
      });
      if (res.ok) {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, isDeleted: false, updatedAt: new Date().toISOString() } : n
          ),
        }));
      }
    } catch {
      // Server unreachable
    }
  },
  permanentDeleteNote: async (id) => {
    const token = get().user.token;
    if (!token) return;
    try {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }));
      }
    } catch {
      // Server unreachable
    }
  },
  emptyTrash: async () => {
    const token = get().user.token;
    if (!token) return;
    const deletedIds = get().notes.filter((n) => n.isDeleted).map((n) => n.id);
    // Delete all trashed notes from server
    await Promise.allSettled(
      deletedIds.map((noteId) =>
        fetch(`/api/notes?id=${encodeURIComponent(noteId)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
      )
    );
    set((state) => ({
      notes: state.notes.filter((n) => !n.isDeleted),
    }));
  },

  // Mind Map
  mindMapOpen: false,
  setMindMapOpen: (open) => set({ mindMapOpen: open }),

  // Notebook View
  notebookOpen: false,
  setNotebookOpen: (open) => set({ notebookOpen: open }),

  // Note Detail
  noteDetailId: null,
  setNoteDetailId: (id) => set({ noteDetailId: id }),

  // DB Viewer
  dbViewerOpen: false,
  setDbViewerOpen: (open) => set({ dbViewerOpen: open }),

  // User
  user: defaultUser,
  setUser: (user) => set((state) => ({
    user: { ...state.user, ...user },
  })),
  logoutUser: () => {
    set({
      user: { ...defaultUser },
      notes: [],
      folders: [],
      calendarDateFilter: null,
      activeNoteId: null,
      editorTitle: '',
      editorContent: '',
      editorRawContent: '',
      editorTags: [],
      activeNoteType: 'quick',
      searchQuery: '',
      activeFolderId: null,
      noteDetailId: null,
      aiUsageCount: 0,
      settingsOpen: false,
      analyticsOpen: false,
      loginOpen: false,
      adminPanelOpen: false,
      trashOpen: false,
      mindMapOpen: false,
      notebookOpen: false,
      dbViewerOpen: false,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wsh-auth');
      // Clear note/folder cache from localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          delete data.notes;
          delete data.folders;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch { localStorage.removeItem(STORAGE_KEY); }
      }
    }
  },
  aiUsageCount: 0,
  setAiUsageCount: (count) => set({ aiUsageCount: count }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Calendar Date Filter
  calendarDateFilter: null,
  setCalendarDateFilter: (date) => set({ calendarDateFilter: date }),

  // Persistence — ONLY UI preferences, NEVER notes/folders data
  // Notes and folders live EXCLUSIVELY in the database
  saveToLocalStorage: () => {
    const state = get();
    const toSave = {
      theme: state.theme,
      darkMode: state.darkMode,
      viewMode: state.viewMode,
      aiUsageCount: state.aiUsageCount,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      // Persist auth session separately
      if (state.user.isLoggedIn && state.user.token) {
        localStorage.setItem('wsh-auth', JSON.stringify({
          isLoggedIn: true,
          username: state.user.username,
          email: state.user.email,
          token: state.user.token,
          role: state.user.role,
        }));
      } else {
        localStorage.removeItem('wsh-auth');
      }
    }
  },
  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // NEVER load notes/folders from localStorage — database is source of truth
        // Only load UI preferences
        if (data.theme) {
          set({ theme: data.theme });
          document.body.className = `theme-${data.theme}`;
        }
        if (typeof data.darkMode === 'boolean') {
          set({ darkMode: data.darkMode });
          document.documentElement.classList.toggle('dark', data.darkMode);
        }
        if (data.viewMode) set({ viewMode: data.viewMode });
        if (typeof data.aiUsageCount === 'number') set({ aiUsageCount: data.aiUsageCount });
      } catch {
        console.error('Failed to load WSH state from localStorage');
      }
    }
    // Restore auth session from separate storage key
    const authSaved = localStorage.getItem('wsh-auth');
    if (authSaved) {
      try {
        const auth = JSON.parse(authSaved);
        if (auth && auth.token) {
          set({
            user: {
              isLoggedIn: true,
              username: auth.username || '',
              email: auth.email || '',
              token: auth.token,
              role: auth.role || 'user',
            },
          });
        }
      } catch {
        console.error('Failed to load auth state from localStorage');
        localStorage.removeItem('wsh-auth');
      }
    }
  },

  // Server Sync — database is the SINGLE source of truth
  // Server data completely replaces local state
  isSyncing: false,
  syncFromServer: async () => {
    const token = get().user.token;
    if (!token) return;

    set({ isSyncing: true });
    try {
      // Fetch notes from server — these REPLACE local notes entirely
      const notesRes = await fetch('/api/notes', {
        method: 'GET',
        headers: authHeaders(),
      });
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        if (Array.isArray(notesData.notes)) {
          set({ notes: notesData.notes as Note[] });
        }
      }

      // Fetch folders from server — these REPLACE local folders entirely
      const foldersRes = await fetch('/api/folders', {
        method: 'GET',
        headers: authHeaders(),
      });
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        if (Array.isArray(foldersData.folders)) {
          set({ folders: foldersData.folders as Folder[] });
        }
      }
    } catch (err) {
      console.warn('Server sync failed:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
