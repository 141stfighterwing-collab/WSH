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
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

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

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;

  // Server Sync
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
  // Notes
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => {
    set((state) => ({ notes: [note, ...state.notes] }));
    get().saveToLocalStorage();
    // Push to server (fire-and-forget)
    if (get().user.token) {
      fetch('/api/notes', {
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
      }).catch(() => { /* server sync failed, note exists locally */ });
    }
  },
  updateNote: (id, updates) => {
    const updated = new Date().toISOString();
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: updated } : n
      ),
    }));
    get().saveToLocalStorage();
    // Push to server (fire-and-forget)
    if (get().user.token) {
      fetch('/api/notes', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, ...updates }),
      }).catch(() => { /* server sync failed, update exists locally */ });
    }
  },
  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, isDeleted: true, updatedAt: new Date().toISOString() } : n
      ),
    }));
    get().saveToLocalStorage();
    // Push to server (fire-and-forget)
    if (get().user.token) {
      fetch('/api/notes', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, isDeleted: true }),
      }).catch(() => { /* server sync failed */ });
    }
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

  // Folders
  folders: [],
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => {
    set((state) => ({ folders: [...state.folders, folder] }));
    get().saveToLocalStorage();
    // Push to server
    if (get().user.token) {
      fetch('/api/folders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: folder.name, order: folder.order }),
      }).catch(() => {});
    }
  },
  updateFolder: (id, updates) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
    get().saveToLocalStorage();
    if (get().user.token) {
      fetch('/api/folders', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, ...updates }),
      }).catch(() => {});
    }
  },
  deleteFolder: (id) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    }));
    get().saveToLocalStorage();
    if (get().user.token) {
      fetch(`/api/folders?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      }).catch(() => {});
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
  restoreNote: (id) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, isDeleted: false, updatedAt: new Date().toISOString() } : n
      ),
    }));
    get().saveToLocalStorage();
    if (get().user.token) {
      fetch('/api/notes', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id, isDeleted: false }),
      }).catch(() => {});
    }
  },
  permanentDeleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));
    get().saveToLocalStorage();
    if (get().user.token) {
      fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      }).catch(() => {});
    }
  },
  emptyTrash: () => {
    const deletedIds = get().notes.filter((n) => n.isDeleted).map((n) => n.id);
    set((state) => ({
      notes: state.notes.filter((n) => !n.isDeleted),
    }));
    get().saveToLocalStorage();
    // Delete all trashed notes from server
    if (get().user.token) {
      deletedIds.forEach((noteId) => {
        fetch(`/api/notes?id=${encodeURIComponent(noteId)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        }).catch(() => {});
      });
    }
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
    set({ user: { ...defaultUser }, notes: [], folders: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wsh-auth');
    }
    get().saveToLocalStorage();
  },
  aiUsageCount: 0,
  setAiUsageCount: (count) => set({ aiUsageCount: count }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Persistence — notes/folders also cached in localStorage as backup
  saveToLocalStorage: () => {
    const state = get();
    const toSave = {
      notes: state.notes,
      folders: state.folders,
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
        // Only load notes/folders from localStorage as initial fallback;
        // they will be overwritten by server data if available
        if (data.notes && Array.isArray(data.notes)) set({ notes: data.notes });
        if (data.folders && Array.isArray(data.folders)) set({ folders: data.folders });
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

  // Server Sync — fetch notes and folders from the database
  isSyncing: false,
  syncFromServer: async () => {
    const token = get().user.token;
    if (!token) return;

    set({ isSyncing: true });
    try {
      // Fetch notes from server
      const notesRes = await fetch('/api/notes', {
        method: 'GET',
        headers: authHeaders(),
      });
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        if (Array.isArray(notesData.notes)) {
          // Merge: server data wins for notes that exist in both,
          // local-only notes are preserved
          const serverNotes = notesData.notes as Note[];
          const localNotes = get().notes;
          const localOnlyNotes = localNotes.filter(
            (ln) => !serverNotes.some((sn) => sn.id === ln.id)
          );
          const merged = [...serverNotes, ...localOnlyNotes];
          // Sort by updatedAt descending
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          set({ notes: merged });
          get().saveToLocalStorage();
        }
      }

      // Fetch folders from server
      const foldersRes = await fetch('/api/folders', {
        method: 'GET',
        headers: authHeaders(),
      });
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        if (Array.isArray(foldersData.folders)) {
          set({ folders: foldersData.folders as Folder[] });
          get().saveToLocalStorage();
        }
      }
    } catch (err) {
      // Server unreachable — keep local data, no problem
      console.warn('Server sync failed, using local data:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
