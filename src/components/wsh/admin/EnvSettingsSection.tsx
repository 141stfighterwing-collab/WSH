'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Save,
  Plus,
  Download,
  Trash2,
  Loader2,
  Upload,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import type { EnvVar } from './types';

const QUICK_ADD_KEYS = [
  { key: 'PORT', value: '8883', category: 'System' },
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'WeaveNote', category: 'System' },
  { key: 'STORAGE_TYPE', value: 'local', category: 'Infra' },
  { key: 'BACKUP_INTERVAL', value: '3600', category: 'Infra' },
  { key: 'LOG_LEVEL', value: 'info', category: 'System' },
  { key: 'MAX_UPLOAD_SIZE', value: '10485760', category: 'System' },
];

const DEFAULT_ENV_VARS: EnvVar[] = [
  { key: 'AI_PROVIDER', value: '(auto-detect)', category: 'AI', updated: new Date().toISOString() },
  { key: 'AI_SYNTHESIS_MODEL', value: '(provider default)', category: 'AI', updated: new Date().toISOString() },
  { key: 'AI_SYNTHESIS_TEMPERATURE', value: '0.7', category: 'AI', updated: new Date().toISOString() },
  { key: 'AI_SYNTHESIS_MAX_TOKENS', value: '4096', category: 'AI', updated: new Date().toISOString() },
  { key: 'AI_DAILY_LIMIT', value: '800', category: 'AI', updated: new Date().toISOString() },
  { key: 'ANTHROPIC_API_KEY', value: '', category: 'AI', updated: new Date().toISOString() },
  { key: 'OPENAI_API_KEY', value: '', category: 'AI', updated: new Date().toISOString() },
  { key: 'GEMINI_API_KEY', value: '', category: 'AI', updated: new Date().toISOString() },
  { key: 'DOCKER_ENABLED', value: 'true', category: 'Infra', updated: new Date().toISOString() },
  { key: 'NODE_ENV', value: 'development', category: 'System', updated: new Date().toISOString() },
  { key: 'DATABASE_URL', value: 'configured', category: 'Database', updated: new Date().toISOString() },
  { key: 'JWT_SECRET', value: '••••••••', category: 'Security', updated: new Date().toISOString() },
  { key: 'ADMIN_DEFAULT_USERNAME', value: 'admin', category: 'Security', updated: new Date().toISOString() },
  { key: 'ADMIN_DEFAULT_PASSWORD', value: '••••••••', category: 'Security', updated: new Date().toISOString() },
];

export { DEFAULT_ENV_VARS };

export default function EnvSettingsSection() {
  const [envVars, setEnvVars] = useState<EnvVar[]>(DEFAULT_ENV_VARS);
  const [envSearch, setEnvSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('all');
  const [editingEnvKey, setEditingEnvKey] = useState<string | null>(null);
  const [editingEnvValue, setEditingEnvValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newEnvCategory, setNewEnvCategory] = useState('System');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load real env values from server on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
    fetch('/api/admin/env', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => { if (!r.ok) return null; return r.json(); })
      .then((data) => {
        if (!data?.env) return;
        const serverEnv = data.env as Record<string, string>;
        setEnvVars((prev) =>
          prev.map((v) => {
            if (serverEnv[v.key] !== undefined) {
              return { ...v, value: serverEnv[v.key], updated: new Date().toISOString() };
            }
            return v;
          })
        );
      })
      .catch(() => {});
  }, []);

  const filteredEnvVars = useMemo(() => {
    let filtered = envVars;
    if (envFilter !== 'all') {
      filtered = filtered.filter((v) => v.category === envFilter);
    }
    if (envSearch) {
      const q = envSearch.toLowerCase();
      filtered = filtered.filter((v) => v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q));
    }
    return filtered;
  }, [envVars, envFilter, envSearch]);

  const envCategories = useMemo(() => {
    const cats = new Set(envVars.map((v) => v.category));
    return Array.from(cats).sort();
  }, [envVars]);

  const handleSaveEnv = async () => {
    setLoading(true);
    setSaveMessage('');
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wsh-auth') || '{}').token : '';
    let saved = 0;
    let failed = 0;
    try {
      // POST each env var to the server
      const results = await Promise.allSettled(
        envVars.map((v) =>
          fetch('/api/admin/env', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ key: v.key, value: v.value }),
          })
        )
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.ok) saved++;
        else failed++;
      }
      if (failed === 0) {
        setSaveMessage(`Saved ${saved} variables (persisted to disk)`);
      } else {
        setSaveMessage(`Saved ${saved}, ${failed} blocked (restart required)`);
      }
    } catch {
      setSaveMessage('Save failed — check server connection');
    }
    setLoading(false);
    // Clear message after 5s
    setTimeout(() => setSaveMessage(''), 5000);
  };

  const handleImportEnv = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.env';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
        const imported: EnvVar[] = [];
        for (const line of lines) {
          const eqIndex = line.indexOf('=');
          if (eqIndex === -1) continue;
          const key = line.slice(0, eqIndex).trim();
          const value = line.slice(eqIndex + 1).trim();
          if (!envVars.find((v) => v.key === key)) {
            imported.push({ key, value, category: 'Imported', updated: new Date().toISOString() });
          }
        }
        setEnvVars((prev) => [...prev, ...imported]);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportEnv = () => {
    const text = envVars.map((v) => `${v.key}=${v.value}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `.env-${new Date().toISOString().split('T')[0]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddEnvVar = () => {
    if (!newEnvKey.trim()) return;
    if (envVars.find((v) => v.key === newEnvKey.trim())) return;
    setEnvVars((prev) => [
      ...prev,
      { key: newEnvKey.trim(), value: newEnvValue, category: newEnvCategory, updated: new Date().toISOString() },
    ]);
    setNewEnvKey('');
    setNewEnvValue('');
    setNewEnvCategory('System');
  };

  const handleQuickAdd = (preset: { key: string; value: string; category: string }) => {
    if (envVars.find((v) => v.key === preset.key)) return;
    setEnvVars((prev) => [
      ...prev,
      { key: preset.key, value: preset.value, category: preset.category, updated: new Date().toISOString() },
    ]);
  };

  const handleUpdateEnvValue = (key: string) => {
    setEnvVars((prev) =>
      prev.map((v) => (v.key === key ? { ...v, value: editingEnvValue, updated: new Date().toISOString() } : v))
    );
    setEditingEnvKey(null);
  };

  const handleDeleteEnvVar = (key: string) => {
    setEnvVars((prev) => prev.filter((v) => v.key !== key));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-amber-400" />
        <span className="micro-label text-muted-foreground">Environment Variables</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 -mt-2">
        Manage application configuration. Changes are applied on save.
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleImportEnv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all active:scale-95"
        >
          <Upload className="w-2.5 h-2.5" />
          Import .env
        </button>
        <button
          onClick={handleExportEnv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all active:scale-95"
        >
          <Download className="w-2.5 h-2.5" />
          Export .env
        </button>
        <button
          onClick={() => { setShowAddForm(true); setNewEnvKey(''); setNewEnvValue(''); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-pri-600/15 text-pri-400 border border-pri-500/25 hover:bg-pri-600/25 transition-all active:scale-95"
        >
          <Plus className="w-2.5 h-2.5" />
          Add Variable
        </button>
      </div>

      {/* Add new variable form */}
      {showAddForm && (
        <div className="p-3 bg-secondary/30 rounded-xl border border-pri-500/20 space-y-2 animate-fadeIn">
          <input
            type="text"
            placeholder="KEY_NAME"
            value={newEnvKey}
            onChange={(e) => setNewEnvKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          />
          <input
            type="text"
            placeholder="value"
            value={newEnvValue}
            onChange={(e) => setNewEnvValue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          />
          <select
            value={newEnvCategory}
            onChange={(e) => setNewEnvCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          >
            <option value="System">System</option>
            <option value="AI">AI</option>
            <option value="Security">Security</option>
            <option value="Infra">Infrastructure</option>
            <option value="Database">Database</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleAddEnvVar();
                setNewEnvKey('');
                setNewEnvValue('');
                setShowAddForm(false);
              }}
              className="flex-1 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95"
            >
              Add
            </button>
            <button
              onClick={() => { setNewEnvKey(''); setNewEnvValue(''); setShowAddForm(false); }}
              className="px-3 py-1.5 rounded-full text-[9px] font-bold text-muted-foreground hover:bg-secondary transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Common Keys */}
      <div>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1.5">
          Quick Add Common Keys
        </span>
        <div className="flex flex-wrap gap-1">
          {QUICK_ADD_KEYS.filter((p) => !envVars.find((v) => v.key === p.key)).map((preset) => (
            <button
              key={preset.key}
              onClick={() => handleQuickAdd(preset)}
              className="px-2 py-1 rounded-full text-[8px] font-bold bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
            >
              + {preset.key}
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Filter variables..."
            value={envSearch}
            onChange={(e) => setEnvSearch(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-[10px] bg-secondary/50 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          />
        </div>
        <select
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-[10px] bg-secondary/50 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
        >
          <option value="all">All</option>
          {envCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_70px_70px_40px] gap-1 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
        <span>Key</span>
        <span>Value</span>
        <span>Category</span>
        <span>Updated</span>
        <span></span>
      </div>

      {/* Table rows */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filteredEnvVars.map((envVar) => (
          <div
            key={envVar.key}
            className="grid grid-cols-[1fr_1fr_70px_70px_40px] gap-1 px-2 py-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors items-center text-[10px]"
          >
            <span className="font-mono font-bold text-foreground truncate">{envVar.key}</span>
            {editingEnvKey === envVar.key ? (
              <input
                type="text"
                value={editingEnvValue}
                onChange={(e) => setEditingEnvValue(e.target.value)}
                onBlur={() => handleUpdateEnvValue(envVar.key)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateEnvValue(envVar.key); if (e.key === 'Escape') setEditingEnvKey(null); }}
                className="px-1 py-0.5 rounded text-[10px] font-mono bg-secondary border border-pri-500/30 text-foreground focus:outline-none"
                autoFocus
              />
            ) : (
              <span
                className="font-mono text-muted-foreground truncate cursor-pointer hover:text-foreground"
                onClick={() => { setEditingEnvKey(envVar.key); setEditingEnvValue(envVar.value); }}
              >
                {envVar.value}
              </span>
            )}
            <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full w-fit ${
              envVar.category === 'Security' ? 'bg-red-500/15 text-red-400' :
              envVar.category === 'AI' ? 'bg-purple-500/15 text-purple-400' :
              envVar.category === 'Infra' ? 'bg-orange-500/15 text-orange-400' :
              envVar.category === 'Database' ? 'bg-cyan-500/15 text-cyan-400' :
              'bg-secondary text-muted-foreground'
            }`}>
              {envVar.category}
            </span>
            <span className="text-[8px] text-muted-foreground/50">
              {new Date(envVar.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { setEditingEnvKey(envVar.key); setEditingEnvValue(envVar.value); }}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Edit3 className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => handleDeleteEnvVar(envVar.key)}
                className="p-0.5 rounded text-muted-foreground hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="space-y-2">
        <button
          onClick={handleSaveEnv}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Changes
        </button>
        {saveMessage && (
          <p className="text-[9px] text-center text-pri-400 font-semibold animate-fadeIn">{saveMessage}</p>
        )}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-400/70 leading-relaxed">
          Environment variables contain sensitive configuration. Never expose your <span className="font-bold">.env</span> file or share secrets. Changes to security variables may require server restart.
        </p>
      </div>
    </div>
  );
}
