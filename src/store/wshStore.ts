import { create } from 'zustand';

export type NoteType = 'quick' | 'notebook' | 'deep' | 'code' | 'project' | 'document';
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

  // User
  user: UserState;
  setUser: (user: Partial<UserState>) => void;
  aiUsageCount: number;
  setAiUsageCount: (count: number) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const defaultUser: UserState = {
  isLoggedIn: false,
  username: '',
  email: '',
  token: '',
};

const STORAGE_KEY = 'wsh-state';

export const useWSHStore = create<WSHState>((set, get) => ({
  // Notes
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    ),
  })),
  deleteNote: (id) => set((state) => ({
    notes: state.notes.map((n) =>
      n.id === id ? { ...n, isDeleted: true } : n
    ),
  })),

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
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  updateFolder: (id, updates) => set((state) => ({
    folders: state.folders.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    ),
  })),
  deleteFolder: (id) => set((state) => ({
    folders: state.folders.filter((f) => f.id !== id),
  })),
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

  // User
  user: defaultUser,
  setUser: (user) => set((state) => ({
    user: { ...state.user, ...user },
  })),
  aiUsageCount: 0,
  setAiUsageCount: (count) => set({ aiUsageCount: count }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Persistence
  saveToLocalStorage: () => {
    const state = get();
    const toSave = {
      notes: state.notes,
      folders: state.folders,
      theme: state.theme,
      darkMode: state.darkMode,
      viewMode: state.viewMode,
      user: state.user,
      aiUsageCount: state.aiUsageCount,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  },
  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.notes) set({ notes: data.notes });
        if (data.folders) set({ folders: data.folders });
        if (data.theme) {
          set({ theme: data.theme });
          document.body.className = `theme-${data.theme}`;
        }
        if (typeof data.darkMode === 'boolean') {
          set({ darkMode: data.darkMode });
          document.documentElement.classList.toggle('dark', data.darkMode);
        }
        if (data.viewMode) set({ viewMode: data.viewMode });
        if (data.user) set({ user: { ...defaultUser, ...data.user } });
        if (typeof data.aiUsageCount === 'number') set({ aiUsageCount: data.aiUsageCount });
      } catch {
        console.error('Failed to load WSH state from localStorage');
      }
    }
  },
}));
