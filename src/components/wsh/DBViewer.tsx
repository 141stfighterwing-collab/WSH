'use client';

import { useMemo, useState } from 'react';
import { X, Plus, Pencil, Trash2, Search, Database, ChevronRight, AlertCircle } from 'lucide-react';
import { useWSHStore, type Note, type Folder } from '@/store/wshStore';

type TableType = 'notes' | 'folders' | 'users';

interface RowData {
  id: string;
  [key: string]: string | number | boolean;
}

export default function DBViewer() {
  const { dbViewerOpen, setDbViewerOpen, notes, folders, user } = useWSHStore();
  const [activeTable, setActiveTable] = useState<TableType>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  const tableConfig = useMemo(() => {
    const configs: Record<TableType, { columns: { key: string; label: string; editable: boolean }[]; data: RowData[] }> = {
      notes: {
        columns: [
          { key: 'id', label: 'ID', editable: false },
          { key: 'title', label: 'Title', editable: true },
          { key: 'type', label: 'Type', editable: true },
          { key: 'tags', label: 'Tags', editable: true },
          { key: 'folderId', label: 'Folder', editable: true },
          { key: 'isDeleted', label: 'Deleted', editable: true },
          { key: 'createdAt', label: 'Created', editable: false },
          { key: 'updatedAt', label: 'Updated', editable: false },
        ],
        data: notes.map((n) => ({
          id: n.id.slice(0, 8),
          title: n.title || '(untitled)',
          type: n.type,
          tags: n.tags.join(', '),
          folderId: n.folderId?.slice(0, 8) || '—',
          isDeleted: String(n.isDeleted),
          createdAt: new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          updatedAt: new Date(n.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        })),
      },
      folders: {
        columns: [
          { key: 'id', label: 'ID', editable: false },
          { key: 'name', label: 'Name', editable: true },
          { key: 'order', label: 'Order', editable: true },
          { key: 'createdAt', label: 'Created', editable: false },
          { key: 'updatedAt', label: 'Updated', editable: false },
        ],
        data: folders.map((f) => ({
          id: f.id.slice(0, 8),
          name: f.name,
          order: f.order,
          createdAt: new Date(f.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric' }),
          updatedAt: new Date(f.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric' }),
        })),
      },
      users: {
        columns: [
          { key: 'id', label: 'ID', editable: false },
          { key: 'username', label: 'Username', editable: true },
          { key: 'email', label: 'Email', editable: true },
          { key: 'role', label: 'Role', editable: true },
          { key: 'status', label: 'Status', editable: false },
        ],
        data: [{
          id: 'local',
          username: user.username || '(guest)',
          email: user.email || '—',
          role: user.role,
          status: user.isLoggedIn ? 'active' : 'inactive',
        }],
      },
    };
    return configs;
  }, [notes, folders, user]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return tableConfig[activeTable].data;
    const q = searchQuery.toLowerCase();
    return tableConfig[activeTable].data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tableConfig, activeTable, searchQuery]);

  const handleStartEdit = (row: RowData) => {
    setEditingRow(String(row.id));
    setEditData(
      Object.fromEntries(
        tableConfig[activeTable].columns
          .filter((c) => c.editable)
          .map((c) => [c.key, String(row[c.key])])
      )
    );
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSaveEdit = () => {
    if (activeTable === 'notes') {
      const fullNote = notes.find((n) => n.id.startsWith(editingRow || ''));
      if (fullNote) {
        const updates: Partial<Note> = {};
        if ('title' in editData) updates.title = editData.title;
        if ('type' in editData) updates.type = editData.type as Note['type'];
        if ('tags' in editData) updates.tags = editData.tags.split(',').map((t) => t.trim()).filter(Boolean);
        if ('folderId' in editData) updates.folderId = editData.folderId && editData.folderId !== '—' ? null : null;
        if ('isDeleted' in editData) updates.isDeleted = editData.isDeleted === 'true';
        useWSHStore.getState().updateNote(fullNote.id, updates);
        useWSHStore.getState().saveToLocalStorage();
      }
    } else if (activeTable === 'folders') {
      const fullFolder = folders.find((f) => f.id.startsWith(editingRow || ''));
      if (fullFolder) {
        const updates: Partial<Folder> = {};
        if ('name' in editData) updates.name = editData.name;
        if ('order' in editData) updates.order = parseInt(editData.order, 10) || fullFolder.order;
        useWSHStore.getState().updateFolder(fullFolder.id, updates);
        useWSHStore.getState().saveToLocalStorage();
      }
    }
    setEditingRow(null);
    setEditData({});
  };

  const handleDeleteRow = (rowId: string) => {
    if (activeTable === 'notes') {
      const fullNote = notes.find((n) => n.id.startsWith(rowId));
      if (fullNote) {
        useWSHStore.getState().deleteNote(fullNote.id);
      }
    } else if (activeTable === 'folders') {
      const fullFolder = folders.find((f) => f.id.startsWith(rowId));
      if (fullFolder) {
        useWSHStore.getState().deleteFolder(fullFolder.id);
      }
    }
  };

  const handleAddRow = () => {
    setShowAddForm(false);
    setNewRowData({});
    if (activeTable === 'folders') {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name: newRowData.name || 'New Folder',
        order: folders.length,
        userId: user.isLoggedIn ? user.username : 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useWSHStore.getState().addFolder(newFolder);
    } else if (activeTable === 'notes') {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: newRowData.title || 'New Note',
        content: '',
        rawContent: '',
        type: (newRowData.type as Note['type']) || 'quick',
        tags: newRowData.tags ? newRowData.tags.split(',').map((t) => t.trim()) : [],
        color: '',
        folderId: null,
        userId: user.isLoggedIn ? user.username : 'local',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useWSHStore.getState().addNote(newNote);
    }
  };

  if (!dbViewerOpen) return null;

  const currentConfig = tableConfig[activeTable];

  return (
    <div className="fixed inset-0 z-[115] flex animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/95"
        onClick={() => setDbViewerOpen(false)}
      />

      {/* Viewer */}
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="micro-label text-muted-foreground">Database Viewer</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold">
                  Port 5682
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground/50">wsh://localhost</span>
                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/30" />
                <span className="text-[10px] text-foreground">{activeTable}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDbViewerOpen(false)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table tabs + actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/30 bg-card/30 shrink-0">
          <div className="flex gap-1">
            {(['notes', 'folders', 'users'] as const).map((table) => {
              const count = tableConfig[table].data.length;
              return (
                <button
                  key={table}
                  onClick={() => { setActiveTable(table); setSearchQuery(''); setEditingRow(null); setShowAddForm(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                    activeTable === table
                      ? 'bg-cyan-600/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-secondary/30 text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {table}
                  <span className={`text-[8px] font-bold px-1 rounded-full ${
                    activeTable === table ? 'bg-cyan-500/20 text-cyan-300' : 'bg-secondary text-muted-foreground/60'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg text-[10px] bg-secondary/50 border border-border/50 focus:border-cyan-500/50 focus:outline-none text-foreground w-40"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-600/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/25 transition-all active:scale-95"
            >
              <Plus className="w-2.5 h-2.5" />
              Add Row
            </button>
          </div>
        </div>

        {/* Add row form */}
        {showAddForm && (
          <div className="px-6 py-3 border-b border-cyan-500/20 bg-cyan-500/5 animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {currentConfig.columns.filter((c) => c.editable).map((col) => (
                <div key={col.key} className="flex items-center gap-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">{col.label}:</label>
                  {col.key === 'type' ? (
                    <select
                      value={newRowData[col.key] || 'quick'}
                      onChange={(e) => setNewRowData((p) => ({ ...p, [col.key]: e.target.value }))}
                      className="px-2 py-1 rounded-lg text-[10px] bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="quick">quick</option>
                      <option value="notebook">notebook</option>
                      <option value="deep">deep</option>
                      <option value="code">code</option>
                      <option value="project">project</option>
                      <option value="document">document</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={col.label}
                      value={newRowData[col.key] || ''}
                      onChange={(e) => setNewRowData((p) => ({ ...p, [col.key]: e.target.value }))}
                      className="px-2 py-1 rounded-lg text-[10px] bg-secondary border border-border/50 text-foreground w-32"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={handleAddRow}
                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-600 text-white hover:bg-cyan-700 transition-all active:scale-95"
              >
                Save
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewRowData({}); }}
                className="px-3 py-1 rounded-full text-[9px] font-bold text-muted-foreground hover:bg-secondary transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Data table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground/50 font-semibold">No records found</p>
              <p className="text-xs text-muted-foreground/30 mt-1">
                {searchQuery ? 'Try a different search term' : `No ${activeTable} in database`}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-secondary/50 border-b border-border/30">
                    <th className="px-3 py-2 text-left w-10"></th>
                    {currentConfig.columns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => {
                    const rowId = String(row.id);
                    const isEditing = editingRow === rowId;
                    return (
                      <tr
                        key={idx}
                        className={`border-t border-border/20 hover:bg-secondary/20 transition-colors ${
                          isEditing ? 'bg-cyan-500/5' : ''
                        }`}
                      >
                        {/* Actions column */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-0.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="p-1 rounded text-[9px] text-green-400 hover:bg-green-500/10 transition-colors"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1 rounded text-[9px] text-muted-foreground hover:bg-secondary transition-colors"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(row)}
                                  className="p-1 rounded text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(rowId)}
                                  className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Data columns */}
                        {currentConfig.columns.map((col) => (
                          <td key={col.key} className="px-3 py-2 text-foreground whitespace-nowrap">
                            {isEditing && col.editable ? (
                              <input
                                type="text"
                                value={editData[col.key] || ''}
                                onChange={(e) => setEditData((p) => ({ ...p, [col.key]: e.target.value }))}
                                className="w-full px-2 py-0.5 rounded text-[10px] bg-secondary border border-cyan-500/30 text-foreground focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className={`font-mono ${col.key === 'id' ? 'text-muted-foreground/60' : col.key === 'isDeleted' && String(row[col.key]) === 'true' ? 'text-red-400' : ''}`}>
                                {String(row[col.key])}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between px-6 py-2 border-t border-border/30 bg-card/50 shrink-0">
          <span className="text-[9px] text-muted-foreground/50">
            Showing {filteredData.length} of {currentConfig.data.length} records
          </span>
          <span className="text-[9px] text-muted-foreground/30 font-mono">
            SQLite · WeaveNote DB · Local Storage
          </span>
        </div>
      </div>
    </div>
  );
}
