'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Download, Trash2, Loader2, AlertTriangle, Filter, Activity } from 'lucide-react';
import type { LogEntry } from './types';

const LOG_SOURCES = ['all', 'env', 'ai-engine', 'system', 'database', 'sync', 'auth', 'rate-limiter'];

export default function LogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (logFilter !== 'all') params.set('level', logFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setLogs([]); setLoading(false); return; }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [logFilter, sourceFilter]);

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

  // Compute log counts by level and source
  const logCounts = useMemo(() => {
    const byLevel = { info: 0, warn: 0, error: 0 };
    const sources = new Set<string>();
    for (const l of logs) {
      if (l.level in byLevel) byLevel[l.level as keyof typeof byLevel]++;
      if (l.source) sources.add(l.source);
    }
    return { byLevel, sources: Array.from(sources).sort() };
  }, [logs]);

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">System Logs</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground font-mono">{logs.length} entries</span>
          <button
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
              showTroubleshoot
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-secondary text-muted-foreground border border-border/50'
            }`}
          >
            Troubleshoot
          </button>
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

      {/* ── Persistence Troubleshooting Panel ──────────────────── */}
      {showTroubleshoot && (
        <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-2 animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Persistence Troubleshooting</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            If ENV keys are not persisting after restart, follow these steps:
          </p>
          <ol className="text-[9px] text-muted-foreground leading-relaxed space-y-1 pl-3 list-decimal">
            <li>Check <span className="font-mono text-foreground">Admin &gt; Versioning &gt; ENV Persistence</span> — the volume must show &quot;Healthy&quot; and &quot;Writable: Yes&quot;</li>
            <li>If &quot;Writable: No&quot; — run: <span className="font-mono text-amber-400">docker compose down -v &amp;&amp; docker compose up -d</span></li>
            <li>After saving a key, look for a log entry here from source <span className="font-mono text-foreground">[env]</span> saying &quot;persisted to disk&quot; or &quot;disk write FAILED&quot;</li>
            <li>Filter logs by source <span className="font-mono text-foreground">env</span> to see all ENV activity</li>
            <li>After restart, check <span className="font-mono text-foreground">docker compose logs weavenote | grep persistent</span> to see if keys were loaded from runtime.env</li>
          </ol>
          <div className="flex gap-1 mt-1">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
              {logCounts.byLevel.info} info
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
              {logCounts.byLevel.warn} warn
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
              {logCounts.byLevel.error} error
            </span>
          </div>
        </div>
      )}

      {/* ── Level Filter ──────────────────────────────────────── */}
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

      {/* ── Source Filter ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg text-[9px] bg-secondary/50 border border-border/50 text-foreground focus:outline-none focus:border-pri-500/50"
        >
          <option value="all">All Sources</option>
          {LOG_SOURCES.filter((s) => s !== 'all').map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── Log Viewer ────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-950/80 border border-border/30 p-3 font-mono text-[10px] leading-relaxed max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-4">
            <Activity className="w-5 h-5 mx-auto mb-2 opacity-30" />
            No logs to display
          </div>
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

      {/* ── Actions ───────────────────────────────────────────── */}
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
