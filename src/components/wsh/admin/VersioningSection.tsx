'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  FileCheck,
  RefreshCw,
  Loader2,
  HardDrive,
  Database,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Cpu,
  Clock,
  Info,
} from 'lucide-react';
import type { SystemData, EnvVolumeStatus } from './types';

export default function VersioningSection() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const fetchSystem = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
      const res = await fetch('/api/admin/system', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setSystemData(data);
    } catch {
      setSystemData(null);
    }
    setLoading(false);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSystem();
  }, [fetchSystem]);

  const handleRunUpdate = async () => {
    setUpdateLoading(true);
    setUpdateMessage('');
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'update' }),
      });
      const data = await res.json();
      if (data.success) {
        setUpdateMessage(data.hostCommand || 'Update requested');
      } else {
        setUpdateMessage(`Error: ${data.error}`);
      }
    } catch {
      setUpdateMessage('Failed to trigger update');
    }
    setUpdateLoading(false);
    setTimeout(() => setUpdateMessage(''), 15000);
  };

  const envVolume = systemData?.envVolume;

  return (
    <div className="space-y-4 animate-fadeIn">
      <span className="micro-label text-muted-foreground">System Information</span>

      {systemData ? (
        <>
          {/* ── Version Banner ─────────────────────────────────── */}
          <div className="p-4 bg-gradient-to-br from-pri-600/15 via-pri-500/10 to-transparent rounded-2xl border border-pri-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pri-400" />
              <span className="text-lg font-black text-foreground tracking-tight">WSH</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-pri-400 font-mono">v{systemData.version}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                {systemData.environment}
              </span>
            </div>
            <div className="flex gap-3 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{systemData.nodeVersion}</span>
              <span className="flex items-center gap-1">{systemData.nextjs}</span>
              <span className="flex items-center gap-1">{systemData.platform}</span>
            </div>
          </div>

          {/* ── Disk Usage ─────────────────────────────────────── */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="w-3 h-3" /> Disk Usage
            </span>
            <div className="space-y-1">
              {[
                { label: 'Application', value: systemData.disk.appSize, bytes: systemData.disk.appSizeBytes, color: 'text-pri-400' },
                { label: 'Uploads', value: systemData.disk.uploadSize, bytes: systemData.disk.uploadSizeBytes, color: 'text-green-400' },
                { label: 'ENV Volume', value: systemData.disk.envSize, bytes: 0, color: 'text-amber-400' },
                { label: 'Database (volume)', value: systemData.disk.dbDataSize, bytes: 0, color: 'text-cyan-400' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-mono font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Memory ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Memory
            </span>
            <div className="space-y-1">
              {[
                { label: 'RSS (total)', value: systemData.memory.rss },
                { label: 'Heap Used', value: systemData.memory.heapUsed },
                { label: 'Heap Total', value: systemData.memory.heapTotal },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/30"
                >
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  <span className="text-[10px] font-mono text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Runtime Info ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Runtime
            </span>
            <div className="space-y-1">
              {[
                { label: 'Uptime', value: systemData.uptime },
                { label: 'Build Date', value: systemData.buildDate ? new Date(systemData.buildDate).toLocaleDateString() : 'unknown' },
                { label: 'Git Commit', value: systemData.gitCommit },
                { label: 'Docker', value: systemData.dockerVersion || 'N/A (running outside Docker)' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/30"
                >
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  <span className="text-[10px] font-mono text-foreground truncate ml-4">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ENV Volume Diagnostics ──────────────────────────── */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3 h-3" /> ENV Persistence
            </span>
            <div className="p-3 bg-secondary/30 rounded-xl border border-border/30 space-y-2">
              {envVolume ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Volume Status</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      envVolume.exists && envVolume.writable
                        ? 'bg-green-500/15 text-green-400'
                        : envVolume.exists && !envVolume.writable
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {envVolume.exists && envVolume.writable ? 'Healthy' : envVolume.exists ? 'Read-Only' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Readable</span>
                    <span className="text-[10px]">{envVolume.readable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Writable</span>
                    <span className="text-[10px]">{envVolume.writable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Keys Persisted</span>
                    <span className="text-[10px] font-mono font-bold">{envVolume.keyCount}</span>
                  </div>
                  {!envVolume.writable && envVolume.error && (
                    <div className="flex items-start gap-1.5 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-red-400 leading-relaxed">{envVolume.error}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────── */}
          <div className="space-y-2 pt-1">
            <button
              onClick={fetchSystem}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </button>

            <button
              onClick={handleRunUpdate}
              disabled={updateLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[11px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-pri-600/20"
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
              Run Update
            </button>

            {updateMessage && (
              <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/30 space-y-1 animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-pri-400" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Update Instructions</span>
                </div>
                <p className="text-[10px] text-foreground leading-relaxed">
                  Run this command in your <span className="font-bold">host terminal</span> (where WSH is installed):
                </p>
                <div className="px-3 py-2 bg-slate-950/80 rounded-lg font-mono text-[11px] text-green-400 border border-border/30">
                  {updateMessage}
                </div>
                <p className="text-[9px] text-muted-foreground">
                  The app will pull the latest code, rebuild, and restart. Your data is preserved.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
    </div>
  );
}
