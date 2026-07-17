'use client';

import { useState, useMemo } from 'react';
import { FlaskConical, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

export default function DBViewerSection() {
  const { notes, folders, user } = useWSHStore();
  const [activeTable, setActiveTable] = useState<'notes' | 'folders' | 'users'>('notes');
  const [dbSearch, setDbSearch] = useState('');
  const [dbTestResult, setDbTestResult] = useState<{ status: 'idle' | 'testing' | 'pass' | 'fail'; message: string; }>({ status: 'idle', message: '' });

  const handleDBTest = async () => {
    setDbTestResult({ status: 'testing', message: 'Running read/write test...' });
    try {
      const res = await fetch('/api/admin/db-test', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') {
        setDbTestResult({ status: 'pass', message: `✓ ${data.results.overall} (${data.results.count})` });
      } else {
        setDbTestResult({ status: 'fail', message: `✗ ${data.results.overall}` });
      }
    } catch {
      setDbTestResult({ status: 'fail', message: '✗ Could not reach server' });
    }
  };

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

      <div className="rounded-xl border border-border/50 p-3 bg-secondary/20 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Database Test</div>
            <div className="text-[9px] text-muted-foreground/60">Run a safe read/write health check from the admin panel.</div>
          </div>
          <button
            onClick={handleDBTest}
            disabled={dbTestResult.status === 'testing'}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-300 transition-all duration-200 hover:bg-cyan-400/20 active:scale-95 disabled:opacity-50"
          >
            {dbTestResult.status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
            <span>DB Test</span>
          </button>
        </div>
        {dbTestResult.status !== 'idle' && (
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2">
            {dbTestResult.status === 'testing' && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin mt-0.5 shrink-0" />}
            {dbTestResult.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />}
            {dbTestResult.status === 'fail' && <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
            <span className={`text-xs font-semibold break-all ${dbTestResult.status === 'pass' ? 'text-green-400' : dbTestResult.status === 'fail' ? 'text-red-400' : 'text-cyan-400'}`}>
              {dbTestResult.message}
            </span>
          </div>
        )}
      </div>

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
