'use client';

import { useState, useMemo } from 'react';
import { useWSHStore } from '@/store/wshStore';

export default function DBViewerSection() {
  const { notes, folders, user } = useWSHStore();
  const [activeTable, setActiveTable] = useState<'notes' | 'folders' | 'users'>('notes');
  const [dbSearch, setDbSearch] = useState('');

  const tableData = useMemo(() => {
    if (activeTable === 'notes') {
      return notes.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        tags: n.tags.join(', '),
        folderId: n.folderId || '—',
        isDeleted: n.isDeleted ? 'Yes' : 'No',
        createdAt: new Date(n.createdAt).toLocaleDateString(),
        updatedAt: new Date(n.updatedAt).toLocaleDateString(),
      }));
    }
    if (activeTable === 'folders') {
      return folders.map((f) => ({
        id: f.id,
        name: f.name,
        order: f.order,
        createdAt: new Date(f.createdAt).toLocaleDateString(),
        updatedAt: new Date(f.updatedAt).toLocaleDateString(),
      }));
    }
    return [{
      id: 'local-user',
      username: user.username || 'guest',
      email: user.email || '—',
      role: user.role,
      status: user.isLoggedIn ? 'active' : 'inactive',
    }];
  }, [notes, folders, user]);

  const columns = useMemo(() => {
    if (tableData.length === 0) return [];
    return Object.keys(tableData[0]);
  }, [tableData]);

  const filteredRows = useMemo(() => {
    if (!dbSearch) return tableData;
    const q = dbSearch.toLowerCase();
    return tableData.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tableData, dbSearch]);

  return (
    <div className="space-y-3 animate-fadeIn">
      <span className="micro-label text-muted-foreground">Database Viewer</span>
      <p className="text-[10px] text-muted-foreground/60 -mt-2">
        Browse and inspect local data stored in the application.
      </p>

      {/* Table selector */}
      <div className="flex gap-1">
        {(['notes', 'folders', 'users'] as const).map((table) => (
          <button
            key={table}
            onClick={() => { setActiveTable(table); setDbSearch(''); }}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              activeTable === table
                ? 'bg-cyan-600/15 text-cyan-400 border border-cyan-500/30'
                : 'bg-secondary/30 text-muted-foreground border border-transparent hover:bg-secondary'
            }`}
          >
            {table} ({table === 'notes' ? notes.length : table === 'folders' ? folders.length : 1})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search records..."
        value={dbSearch}
        onChange={(e) => setDbSearch(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg text-[10px] bg-secondary/50 border border-border/50 focus:border-cyan-500/50 focus:outline-none text-foreground"
      />

      {/* Data grid */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-[9px]">
            <thead className="sticky top-0">
              <tr className="bg-secondary/50">
                {columns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                    {dbSearch ? 'No matching records' : 'No records'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-border/30 hover:bg-secondary/20 transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="px-2 py-1.5 text-foreground truncate max-w-[120px]" title={String(row[col as keyof typeof row])}>
                        {String(row[col as keyof typeof row])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[8px] text-muted-foreground/40 text-center">
        {filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''} shown
      </p>
    </div>
  );
}
