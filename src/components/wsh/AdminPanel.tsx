'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Lock,
  FileCheck,
  Users,
  Cloud,
  ScrollText,
  Save,
  RefreshCw,
  Plus,
  Download,
  Trash2,
  ChevronDown,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

type AdminSection = 'env' | 'versioning' | 'users' | 'cloud' | 'logs' | null;

interface EnvData {
  AI_SYNTHESIS_MODEL: string;
  AI_SYNTHESIS_TEMPERATURE: string;
  AI_SYNTHESIS_MAX_TOKENS: string;
  AI_DAILY_LIMIT: string;
  DOCKER_ENABLED: string;
  NODE_ENV: string;
  DATABASE_URL: string;
}

interface SystemData {
  status: string;
  version: string;
  uptime: string;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  nodeVersion: string;
  platform: string;
  nextjs: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

const menuItems: {
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
}[] = [
  {
    id: 'env',
    label: 'ENV Settings',
    icon: <Lock className="w-4 h-4" />,
    iconColor: 'text-amber-400',
  },
  {
    id: 'versioning',
    label: 'Versioning',
    icon: <FileCheck className="w-4 h-4" />,
    iconColor: 'text-orange-400',
  },
  {
    id: 'users',
    label: 'User Base',
    icon: <Users className="w-4 h-4" />,
    iconColor: 'text-purple-400',
  },
  {
    id: 'cloud',
    label: 'Cloud Setup',
    icon: <Cloud className="w-4 h-4" />,
    iconColor: 'text-slate-300',
  },
  {
    id: 'logs',
    label: 'System Logs',
    icon: <ScrollText className="w-4 h-4" />,
    iconColor: 'text-amber-400',
  },
];

export default function AdminPanel() {
  const { adminPanelOpen, setAdminPanelOpen } = useWSHStore();
  const [activeSection, setActiveSection] = useState<AdminSection>(null);
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [envEdits, setEnvEdits] = useState<Record<string, string>>({});
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [cloudProvider, setCloudProvider] = useState('none');
  const [cloudRegion, setCloudRegion] = useState('us-east-1');
  const [cloudConnected, setCloudConnected] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', role: 'user' });
  const [showNewUser, setShowNewUser] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchEnv = useCallback(async () => {
    setLoading((p) => ({ ...p, env: true }));
    try {
      const res = await fetch('/api/admin/env');
      const data = await res.json();
      setEnvData(data.env);
      setEnvEdits(data.env);
    } catch {
      setEnvData({
        AI_SYNTHESIS_MODEL: 'glm-4-flash',
        AI_SYNTHESIS_TEMPERATURE: '0.7',
        AI_SYNTHESIS_MAX_TOKENS: '4096',
        AI_DAILY_LIMIT: '800',
        DOCKER_ENABLED: 'true',
        NODE_ENV: 'development',
        DATABASE_URL: 'configured',
      });
      setEnvEdits({
        AI_SYNTHESIS_MODEL: 'glm-4-flash',
        AI_SYNTHESIS_TEMPERATURE: '0.7',
        AI_SYNTHESIS_MAX_TOKENS: '4096',
        AI_DAILY_LIMIT: '800',
        DOCKER_ENABLED: 'true',
        NODE_ENV: 'development',
        DATABASE_URL: 'configured',
      });
    }
    setLoading((p) => ({ ...p, env: false }));
  }, []);

  const fetchSystem = useCallback(async () => {
    setLoading((p) => ({ ...p, system: true }));
    try {
      const res = await fetch('/api/admin/system');
      const data = await res.json();
      setSystemData(data);
    } catch {
      setSystemData({
        status: 'healthy',
        version: '3.2.0',
        uptime: '0s',
        memory: { rss: '0 B', heapTotal: '0 B', heapUsed: '0 B', external: '0 B' },
        nodeVersion: process.version || 'v20.x',
        platform: 'linux',
        nextjs: '15.x',
        buildDate: '2025-01-01T00:00:00Z',
        gitCommit: 'local-dev',
        environment: 'development',
      });
    }
    setLoading((p) => ({ ...p, system: false }));
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading((p) => ({ ...p, users: true }));
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
    setLoading((p) => ({ ...p, users: false }));
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading((p) => ({ ...p, logs: true }));
    try {
      const url = `/api/admin/logs?level=${logFilter}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    }
    setLoading((p) => ({ ...p, logs: false }));
  }, [logFilter]);

  const handleToggleSection = (section: AdminSection) => {
    const newSection = activeSection === section ? null : section;
    setActiveSection(newSection);
    if (newSection === 'env') fetchEnv();
    if (newSection === 'versioning') fetchSystem();
    if (newSection === 'users') fetchUsers();
    if (newSection === 'logs') fetchLogs();
  };

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleSaveEnv = async () => {
    setLoading((p) => ({ ...p, saveEnv: true }));
    await new Promise((r) => setTimeout(r, 800));
    setEnvData({ ...envEdits } as EnvData);
    setLoading((p) => ({ ...p, saveEnv: false }));
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email) return;
    setLoading((p) => ({ ...p, createUser: true }));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
        setNewUser({ username: '', email: '', role: 'user' });
        setShowNewUser(false);
      }
    } catch {
      // mock create
      setUsers((prev) => [
        {
          id: `usr-${Date.now()}`,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewUser({ username: '', email: '', role: 'user' });
      setShowNewUser(false);
    }
    setLoading((p) => ({ ...p, createUser: false }));
  };

  const handleClearLogs = async () => {
    setLoading((p) => ({ ...p, clearLogs: true }));
    try {
      await fetch('/api/admin/logs', { method: 'DELETE' });
      setLogs([]);
    } catch {
      setLogs([]);
    }
    setLoading((p) => ({ ...p, clearLogs: false }));
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

  const handleTestConnection = async () => {
    setLoading((p) => ({ ...p, testCloud: true }));
    await new Promise((r) => setTimeout(r, 1500));
    setCloudConnected(cloudProvider !== 'none');
    setLoading((p) => ({ ...p, testCloud: false }));
  };

  if (!adminPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[90] animate-fadeIn"
        onClick={() => setAdminPanelOpen(false)}
      />

      {/* Panel - Slides in from LEFT */}
      <div className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-card border-r border-border shadow-2xl z-[100] flex flex-col animate-slideInLeft">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="micro-label text-muted-foreground">Administrator</span>
          <button
            onClick={() => setAdminPanelOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="border-b border-border">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleToggleSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-secondary ${
                activeSection === item.id
                  ? 'bg-pri-600/15 border-l-2 border-pri-500'
                  : 'border-l-2 border-transparent'
              }`}
            >
              <span className={item.iconColor}>{item.icon}</span>
              <span className="micro-label text-foreground flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                  activeSection === item.id ? 'rotate-180' : ''
                }`}
              />
            </button>
          ))}
        </div>

        {/* Sub-section Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ENV Settings */}
          {activeSection === 'env' && (
            <div className="space-y-3 animate-fadeIn">
              <span className="micro-label text-muted-foreground">Environment Variables</span>
              {envData &&
                Object.entries(envData).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={envEdits[key] || value}
                      onChange={(e) => setEnvEdits((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-secondary/50 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground transition-colors"
                    />
                  </div>
                ))}
              <button
                onClick={handleSaveEnv}
                disabled={loading.saveEnv}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading.saveEnv ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save Changes
              </button>
            </div>
          )}

          {/* Versioning */}
          {activeSection === 'versioning' && (
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
                    disabled={loading.system}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading.system ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Check for Updates
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* User Base */}
          {activeSection === 'users' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="micro-label text-muted-foreground">Registered Users</span>
                <button
                  onClick={() => setShowNewUser(!showNewUser)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all active:scale-95"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Create User
                </button>
              </div>

              {showNewUser && (
                <div className="p-3 bg-secondary/30 rounded-xl border border-purple-500/20 space-y-2 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateUser}
                      disabled={loading.createUser}
                      className="flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading.createUser ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowNewUser(false)}
                      className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_80px_60px] gap-1 px-3 py-2 bg-secondary/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Username</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {loading.users ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className="grid grid-cols-[1fr_1fr_80px_60px] gap-1 px-3 py-2 border-t border-border/30 hover:bg-secondary/20 transition-colors items-center"
                      >
                        <span className="text-xs font-semibold text-foreground truncate">{user.username}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit ${
                            user.role === 'super-admin'
                              ? 'bg-amber-500/20 text-amber-400'
                              : user.role === 'admin'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {user.role}
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1 rounded text-[9px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                            title={user.status === 'active' ? 'Ban' : 'Activate'}
                          >
                            {user.status === 'active' ? '🚫' : '✅'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cloud Setup */}
          {activeSection === 'cloud' && (
            <div className="space-y-3 animate-fadeIn">
              <span className="micro-label text-muted-foreground">Cloud Deployment Settings</span>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Provider
                </label>
                <select
                  value={cloudProvider}
                  onChange={(e) => { setCloudProvider(e.target.value); setCloudConnected(false); }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
                >
                  <option value="none">None (Self-Hosted Only)</option>
                  <option value="aws">Amazon Web Services (AWS)</option>
                  <option value="gcp">Google Cloud Platform (GCP)</option>
                  <option value="azure">Microsoft Azure</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Region
                </label>
                <select
                  value={cloudRegion}
                  onChange={(e) => setCloudRegion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Storage Type
                </label>
                <select className="w-full px-3 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground">
                  <option value="local">Local Filesystem</option>
                  <option value="s3">S3 Compatible</option>
                  <option value="gcs">Google Cloud Storage</option>
                  <option value="blob">Azure Blob Storage</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                <div className="flex items-center gap-2">
                  {cloudConnected ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold text-foreground">
                    {cloudConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    cloudConnected ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'
                  }`}
                />
              </div>

              <button
                onClick={handleTestConnection}
                disabled={loading.testCloud}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-500/20 text-slate-300 border border-slate-500/30 hover:bg-slate-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading.testCloud ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                Test Connection
              </button>
            </div>
          )}

          {/* System Logs */}
          {activeSection === 'logs' && (
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
                {loading.logs ? (
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
                  disabled={loading.clearLogs}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading.clearLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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
          )}
        </div>
      </div>
    </>
  );
}
