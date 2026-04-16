'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Trash2, Loader2 } from 'lucide-react';
import type { LogEntry } from './types';

export default function LogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
      const url = `/api/admin/logs?level=${logFilter}&limit=100`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setLogs([]); setLoading(false); return; }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [logFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    setClearLoading(true);
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setLogs([]);
    } catch {
      setLogs([]);
    }
    setClearLoading(false);
  };

  const handleExportLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wsh-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">System Logs</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
              autoScroll
                ? 'bg-pri-600/20 text-pri-400 border border-pri-500/30'
                : 'bg-secondary text-muted-foreground border border-border/50'
            }`}
          >
            Auto-scroll
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {['all', 'info', 'warn', 'error'].map((f) => (
          <button
            key={f}
            onClick={() => setLogFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              logFilter === f
                ? 'bg-pri-600/15 text-pri-400 border border-pri-500/30'
                : 'bg-secondary/30 text-muted-foreground border border-transparent hover:bg-secondary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log Viewer */}
      <div className="rounded-xl bg-slate-950/80 border border-border/30 p-3 font-mono text-[10px] leading-relaxed max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-4">No logs to display</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">
              <span className="text-muted-foreground/60 text-[9px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>{' '}
              <span
                className={`font-bold ${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                [{log.level.toUpperCase()}]
              </span>{' '}
              <span className="text-muted-foreground/60 text-[9px]">[{log.source}]</span>{' '}
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleClearLogs}
          disabled={clearLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all active:scale-95 disabled:opacity-50"
        >
          {clearLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Clear
        </button>
        <button
          onClick={handleExportLogs}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all active:scale-95"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>
    </div>
  );
}
