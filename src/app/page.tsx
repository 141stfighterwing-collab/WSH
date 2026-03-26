'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  permission: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  rawContent?: string;
  category: string;
  type: string;
  tags: string[];
  color: string;
  textColor?: string;
  backgroundColor?: string;
  folderId?: string;
  isDeleted: boolean;
  deletedAt?: string;
  isSynthesized: boolean;
  accessCount: number;
  wordCount: number;
  projectData?: any;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

type ViewMode = 'grid' | 'list';
type NoteType = 'quick' | 'deep' | 'project' | 'notebook';
type Theme = 'default' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'midnight';

// Note colors
const NOTE_COLORS = [
  { name: 'yellow', bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'blue', bg: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'green', bg: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'pink', bg: 'bg-gradient-to-br from-pink-100 to-pink-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'purple', bg: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'slate', bg: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600' },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<NoteType>('quick');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState<Theme>('default');
  
  // Login state
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  
  // Note editing state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Fetch user
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        await fetchNotes();
        await fetchFolders();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notes
  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  // Fetch folders
  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: loginEmail, 
          password: loginPassword 
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        setShowLogin(false);
        setLoginEmail('');
        setLoginPassword('');
        await fetchNotes();
        await fetchFolders();
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (error) {
      setLoginError('An error occurred');
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: loginEmail, 
          username: registerUsername,
          password: loginPassword 
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        setShowLogin(false);
        setLoginEmail('');
        setLoginPassword('');
        setRegisterUsername('');
        await fetchNotes();
        await fetchFolders();
      } else {
        setLoginError(data.error || 'Registration failed');
      }
    } catch (error) {
      setLoginError('An error occurred');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setNotes([]);
    setFolders([]);
  };

  // Create note
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;
    
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle || 'Untitled',
          content: newNoteContent,
          type: activeTab,
          folderId: activeFolderId,
          tags: [],
          color: 'yellow',
        }),
      });
      
      const data = await res.json();
      if (data.note) {
        setNotes([data.note, ...notes]);
        setNewNoteTitle('');
        setNewNoteContent('');
        setShowNewNote(false);
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Update note
  const handleUpdateNote = async (note: Note) => {
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
      
      setNotes(notes.map(n => n.id === note.id ? note : n));
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      const data = await res.json();
      if (data.folder) {
        setFolders([...folders, data.folder]);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Delete this folder?')) return;
    
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      setFolders(folders.filter(f => f.id !== id));
      if (activeFolderId === id) setActiveFolderId(null);
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    if (note.isDeleted) return false;
    if (note.type !== activeTab) return false;
    if (activeFolderId && note.folderId !== activeFolderId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!note.title.toLowerCase().includes(q) && !note.content.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">WSH</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Weavenote Self Hosted</p>
          </div>
          
          {showLogin ? (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              {isRegistering && (
                <input
                  type="text"
                  placeholder="Username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              )}
              <input
                type="text"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              
              {loginError && (
                <p className="text-red-500 text-sm">{loginError}</p>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
              
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm text-slate-500 hover:text-red-500"
                >
                  {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowLogin(true)}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsRegistering(true);
                  setShowLogin(true);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Create Account
              </button>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-xs text-slate-400">
              Self-hosted notes with PostgreSQL
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
              W
            </div>
            <h1 className="text-xl font-bold hidden sm:block text-slate-800 dark:text-white">
              WSH
            </h1>
          </div>
          
          <div className="flex items-center gap-4 flex-1 justify-end">
            {/* View mode toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-red-500' 
                    : 'text-slate-400'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-red-500' 
                    : 'text-slate-400'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm outline-none w-full max-w-xs dark:text-white border border-transparent focus:border-red-400 transition-all"
            />
            
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            {/* User menu */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-400 hover:text-red-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            {/* Tabs */}
            <div className="space-y-1 mb-6">
              {(['quick', 'deep', 'project', 'notebook'] as NoteType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-red-500 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Folders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase text-slate-400">Folders</h3>
                <button
                  onClick={handleCreateFolder}
                  className="text-slate-400 hover:text-red-500 text-lg"
                >
                  +
                </button>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveFolderId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !activeFolderId
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  All Notes
                </button>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeFolderId === folder.id
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <button
                      onClick={() => setActiveFolderId(folder.id)}
                      className="flex-1 text-left"
                    >
                      📁 {folder.name}
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* New note button */}
          <button
            onClick={() => setShowNewNote(true)}
            className="mb-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            + New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Note
          </button>

          {/* New note form */}
          {showNewNote && (
            <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-fadeIn">
              <input
                type="text"
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <textarea
                placeholder="Note content..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNote}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Save Note
                </button>
                <button
                  onClick={() => {
                    setShowNewNote(false);
                    setNewNoteTitle('');
                    setNewNoteContent('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notes grid/list */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-400 text-lg font-bold">No notes found</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchQuery ? 'Try a different search' : 'Create your first note!'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all cursor-pointer group ${
                    NOTE_COLORS.find(c => c.name === note.color)?.bg || ''
                  }`}
                  onClick={() => setEditingNote(note)}
                >
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2 truncate">
                    {note.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-3">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all cursor-pointer group flex justify-between items-center"
                  onClick={() => setEditingNote(note)}
                >
                  <div className="min-w-0 pr-4">
                    <h3 className="font-bold text-slate-800 dark:text-white truncate">
                      {note.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                      {note.content.substring(0, 100)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit note modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Note</h2>
                <button
                  onClick={() => setEditingNote(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                className="w-full px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateNote(editingNote)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-3 px-6 text-xs text-slate-400 text-center">
        <span className="font-medium">WSH - Weavenote Self Hosted</span>
        <span className="mx-2">•</span>
        <span>{notes.length} notes</span>
        <span className="mx-2">•</span>
        <span className="text-green-500">● PostgreSQL Connected</span>
      </footer>
    </div>
  );
}
