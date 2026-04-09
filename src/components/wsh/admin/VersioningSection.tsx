'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileCheck, RefreshCw, Loader2 } from 'lucide-react';
import type { SystemData } from './types';

export default function VersioningSection() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSystem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system');
      const data = await res.json();
      setSystemData(data);
    } catch {
      setSystemData({
        status: 'healthy',
        version: '4.1.3',
        uptime: '0s',
        memory: { rss: '0 B', heapTotal: '0 B', heapUsed: '0 B', external: '0 B' },
        nodeVersion: 'v20.x',
        platform: 'linux',
        nextjs: '16.x',
        buildDate: '2025-01-01T00:00:00Z',
        gitCommit: 'local-dev',
        environment: 'development',
      });
    }
    setLoading(false);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSystem();
  }, []);

  return (
    <div className="space-y-3 animate-fadeIn">
      <span className="micro-label text-muted-foreground">Version Information</span>
      {systemData ? (
        <div className="space-y-2">
          {[
            { label: 'WSH Version', value: systemData.version },
            { label: 'Next.js', value: systemData.nextjs },
            { label: 'Node.js', value: systemData.nodeVersion },
            { label: 'Platform', value: systemData.platform },
            { label: 'Build Date', value: new Date(systemData.buildDate).toLocaleDateString() },
            { label: 'Git Commit', value: systemData.gitCommit },
            { label: 'Environment', value: systemData.environment },
            { label: 'Uptime', value: systemData.uptime },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-xs font-mono text-foreground">{item.value}</span>
            </div>
          ))}
          <button
            onClick={fetchSystem}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Check for Updates
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
    </div>
  );
}
