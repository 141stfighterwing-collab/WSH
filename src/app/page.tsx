'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

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

// Note colors
const NOTE_COLORS = [
  { name: 'yellow', bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'blue', bg: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'green', bg: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'pink', bg: 'bg-gradient-to-br from-pink-100 to-pink-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'purple', bg: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-slate-700 dark:to-slate-600' },
  { name: 'slate', bg: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600' },
];

// Role badge component
const RoleBadge = ({ role }: { role: string }) => {
  const getRoleStyle = () => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'admin':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'super-admin':
        return 'SUPER ADMIN';
      case 'admin':
        return 'ADMIN';
      default:
        return 'USER';
    }
  };

  return (
    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${getRoleStyle()}`}>
      {getRoleLabel()}
    </span>
  );
};

// Settings Modal Component
const SettingsModal = ({ 
  isOpen, 
  onClose, 
  user,
  allUsers,
  onRefreshUsers
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: User | null;
  allUsers: User[];
  onRefreshUsers: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('about');
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="text-primary-500">⚙️</span> Settings
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xl">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('about')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'about' ? 'bg-red-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                ℹ️ About
              </button>
              <button
                onClick={() => setActiveTab('version')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'version' ? 'bg-red-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                📦 Versioning
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'users' ? 'bg-red-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  👥 User Base
                </button>
              )}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">WSH - Weavenote Self Hosted</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    A self-hosted note-taking application with PostgreSQL backend.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Version</p>
                    <p className="text-2xl font-black text-red-500">v3.1.0</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Database</p>
                    <p className="text-lg font-bold text-green-500">PostgreSQL</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-2">Your Account</p>
                  <div className="space-y-2">
                    <p className="text-sm"><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-800 dark:text-white">{user?.email}</span></p>
                    <p className="text-sm"><span className="text-slate-400">Username:</span> <span className="font-medium text-slate-800 dark:text-white">{user?.username}</span></p>
                    <p className="text-sm"><span className="text-slate-400">Role:</span> <RoleBadge role={user?.role || 'user'} /></p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'version' && (
              <div className="space-y-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div>
                      <p className="text-xs text-purple-500 font-bold uppercase tracking-widest">Current Version</p>
                      <p className="text-3xl font-black text-purple-700 dark:text-purple-300">v3.1.0</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Version History</h4>
                  <div className="space-y-2">
                    {[
                      { version: '3.1.0', date: '2026-03-28', notes: 'NEW: WeaveMap visualization - interactive graph showing note connections based on shared tags, node size by content depth' },
                      { version: '3.0.0', date: '2026-03-28', notes: 'MAJOR: Settings panel with gear icon, User management, Password reset, System logs, Diagnostics, ENV settings for AI (admin), Enhanced themes' },
                      { version: '2.5.1', date: '2026-03-28', notes: 'Fixed Docker deployment, health checks, DB viewer with password reset' },
                      { version: '2.5.0', date: '2026-03-27', notes: 'Initial Docker setup with PowerShell executor' },
                    ].map((v, i) => (
                      <div key={v.version} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${i === 0 ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                            v{v.version}
                          </span>
                          <span className="text-xs text-slate-400">{v.date}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{v.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && isAdmin && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">User Base</h3>
                  <button
                    onClick={onRefreshUsers}
                    className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Refresh
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-500">User</th>
                        <th className="px-4 py-3 font-bold text-slate-500">Role</th>
                        <th className="px-4 py-3 font-bold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {allUsers.length > 0 ? allUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-white">{u.username}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </td>
                          <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                              active
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                            No users found. Click refresh to load users.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Modal Component
const AnalyticsModal = ({ 
  isOpen, 
  onClose, 
  notes 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  notes: Note[] 
}) => {
  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    notes.forEach(note => {
      note.tags?.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return Object.entries(stats).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [notes]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      quick: 0, notebook: 0, deep: 0, project: 0
    };
    notes.forEach(n => {
      if (counts[n.type] !== undefined) counts[n.type]++;
    });
    return counts;
  }, [notes]);

  const cadenceStats = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const weekThreshold = now - (7 * oneDayMs);
    const monthThreshold = now - (30 * oneDayMs);

    let last7Days = 0;
    let last30Days = 0;

    const words = notes.reduce((sum, note) => {
      const createdAt = new Date(note.createdAt).getTime();
      if (createdAt >= weekThreshold) last7Days += 1;
      if (createdAt >= monthThreshold) last30Days += 1;
      return sum + (note.wordCount || (note.content || "").trim().split(/\s+/).filter(Boolean).length);
    }, 0);

    const taggedNotes = notes.filter(note => note.tags?.length > 0).length;
    const tagCoverage = notes.length > 0 ? Math.round((taggedNotes / notes.length) * 100) : 0;
    const averageWords = notes.length > 0 ? Math.round(words / notes.length) : 0;

    const dayMap = new Map<string, number>();
    notes.forEach(note => {
      const dayLabel = new Date(note.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      dayMap.set(dayLabel, (dayMap.get(dayLabel) || 0) + 1);
    });
    const bestDayEntry = Array.from(dayMap.entries()).sort(([, a], [, b]) => b - a)[0];

    return {
      last7Days,
      last30Days,
      averageWords,
      tagCoverage,
      bestDay: bestDayEntry ? `${bestDayEntry[0]} (${bestDayEntry[1]})` : 'N/A',
    };
  }, [notes]);

  const topAccessedNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, 5)
      .filter(n => (n.accessCount || 0) > 0);
  }, [notes]);

  const maxTypeCount = Math.max(...Object.values(typeCounts));

  // Persona detection
  const persona = useMemo(() => {
    if (notes.length === 0) {
      return { title: "The Blank Canvas", emoji: "🎨", description: "Ready to start creating ideas.", color: "bg-slate-100 text-slate-600" };
    }

    const tagCounts: Record<string, number> = {};
    for (const note of notes) {
      for (const tag of (note.tags || [])) {
        const lower = tag.toLowerCase();
        tagCounts[lower] = (tagCounts[lower] || 0) + 1;
      }
    }

    const personas = [
      { title: "Cybersecurity Specialist", emoji: "🛡️", description: "Securing networks and hunting threats.", color: "bg-slate-800 text-green-400 border-green-500", keywords: ['security', 'cyber', 'hack', 'firewall', 'auth', 'token', 'exploit', 'vuln', 'cve', 'pentest', 'crypto', 'phish', 'malware'] },
      { title: "Code Wizard", emoji: "💻", description: "Turning coffee into code and fixing bugs.", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200", keywords: ['code', 'dev', 'git', 'api', 'bug', 'react', 'js', 'ts', 'python', 'java', 'html', 'css', 'frontend', 'backend', 'fullstack', 'deploy', 'repo'] }
    ];

    let bestMatch = null, maxScore = 0;
    for (const p of personas) {
      let score = 0;
      for (const [tag, count] of Object.entries(tagCounts)) {
        for (const keyword of p.keywords) {
          if (tag.includes(keyword)) {
            score += count;
            break;
          }
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = p;
      }
    }

    if (bestMatch && maxScore > 0) {
      return { title: bestMatch.title, emoji: bestMatch.emoji, description: bestMatch.description, color: bestMatch.color };
    }
    return { title: "The Idea Weaver", emoji: "🕸️", description: "Spinning a web of diverse thoughts.", color: "bg-primary-100 text-primary-800" };
  }, [notes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="text-primary-500">📊</span> Analytics & Awards
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xl">✕</button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Persona Card */}
          <div className={`mb-8 p-6 rounded-2xl flex items-center gap-6 shadow-sm border ${persona.color}`}>
            <div className="text-6xl">{persona.emoji}</div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">AI Determined Persona</h3>
              <p className="text-2xl font-black mb-1 tracking-tight">{persona.title}</p>
              <p className="opacity-90 font-medium text-sm leading-relaxed">{persona.description}</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Volume Matrix */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Volume Matrix</h3>
              <div className="flex items-end justify-between h-40 gap-2 px-2">
                {[
                  { label: 'Quick', count: typeCounts.quick, color: 'bg-yellow-400' },
                  { label: 'NoteB', count: typeCounts.notebook, color: 'bg-slate-400' },
                  { label: 'Deep', count: typeCounts.deep, color: 'bg-blue-400' },
                  { label: 'Project', count: typeCounts.project, color: 'bg-green-400' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center justify-end w-full group h-full">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{item.count}</div>
                    <div 
                      className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 ${item.color} hover:brightness-110 shadow-sm`}
                      style={{ height: maxTypeCount > 0 ? `${(item.count / maxTypeCount) * 100}%` : '4px', minHeight: '4px' }}
                    ></div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-tighter">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic Clusters */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Semantic Clusters</h3>
              {tagStats.length > 0 ? (
                <div className="space-y-4">
                  {tagStats.map(([tag, count]) => (
                    <div key={tag} className="group">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        <span>#{tag}</span>
                        <span>{count}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-primary-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:bg-primary-400 relative" 
                          style={{ width: `${(count / (tagStats[0][1] || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Add tags to start neural mapping.</div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center transform hover:-translate-y-1 transition-transform">
              <p className="text-3xl font-black text-primary-600 dark:text-primary-400">{notes.length}</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Entries</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center transform hover:-translate-y-1 transition-transform">
              <p className="text-3xl font-black text-green-600 dark:text-green-400">{notes.reduce((sum, n) => sum + (n.accessCount || 0), 0)}</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Insights</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center transform hover:-translate-y-1 transition-transform">
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{tagStats.length}</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Nodes</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center transform hover:-translate-y-1 transition-transform">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{cadenceStats.tagCoverage}%</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Tagged</p>
            </div>
          </div>

          {/* Growth Signals */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Growth Signals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Last 7 Days', value: cadenceStats.last7Days, tone: 'text-blue-600 dark:text-blue-400' },
                { label: 'Last 30 Days', value: cadenceStats.last30Days, tone: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Avg Words / Note', value: cadenceStats.averageWords, tone: 'text-green-600 dark:text-green-400' },
                { label: 'Tag Coverage', value: `${cadenceStats.tagCoverage}%`, tone: 'text-amber-600 dark:text-amber-400' },
                { label: 'Peak Day', value: cadenceStats.bestDay, tone: 'text-purple-600 dark:text-purple-400' }
              ].map(metric => (
                <div key={metric.label} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 px-4 py-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{metric.label}</p>
                  <p className={`mt-2 text-lg font-black ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* High Performance Focus */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b pb-1 dark:border-slate-700 flex items-center gap-2">
              🎯 High Performance Focus
            </h3>
            {topAccessedNotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topAccessedNotes.map((note) => (
                  <div key={note.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <div className="truncate pr-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{note.title}</p>
                      <div className="flex gap-1 mt-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1">{note.type}</span>
                        {note.tags?.slice(0, 2).map(t => <span key={t} className="text-[9px] text-slate-400">#{t}</span>)}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs font-mono font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-md">
                      {note.accessCount} recall
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No usage history detected yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// WeaveMap Modal Component - Interactive note connection visualization
const WeaveMapModal = ({ 
  isOpen, 
  onClose, 
  notes,
  onNoteClick
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  notes: Note[];
  onNoteClick: (note: Note) => void;
}) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null);
  const canvasRef = useState<HTMLDivElement | null>(null)[0];
  
  // Calculate note connections based on shared tags
  interface NodePosition {
    id: string;
    x: number;
    y: number;
    note: Note;
    strength: number;
    connections: number;
  }
  
  const { nodes, connections } = useMemo(() => {
    if (notes.length === 0) return { nodes: [], connections: [] };
    
    // Calculate note strength (based on word count + access count)
    const getStrength = (note: Note) => {
      const wordCount = note.wordCount || (note.content || "").trim().split(/\s+/).filter(Boolean).length;
      const accessCount = note.accessCount || 0;
      return wordCount + (accessCount * 10);
    };
    
    // Calculate connections based on shared tags
    interface Connection {
      source: string;
      target: string;
      strength: number;
      sharedTags: string[];
    }
    
    const conns: Connection[] = [];
    const nodeConnections: Record<string, number> = {};
    
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const noteA = notes[i];
        const noteB = notes[j];
        const sharedTags = (noteA.tags || []).filter(tag => (noteB.tags || []).includes(tag));
        
        if (sharedTags.length > 0) {
          conns.push({
            source: noteA.id,
            target: noteB.id,
            strength: sharedTags.length,
            sharedTags
          });
          nodeConnections[noteA.id] = (nodeConnections[noteA.id] || 0) + 1;
          nodeConnections[noteB.id] = (nodeConnections[noteB.id] || 0) + 1;
        }
      }
    }
    
    // Position nodes in a force-directed-like layout (simplified)
    const centerX = 400;
    const centerY = 300;
    const radius = 250;
    
    const nodePositions: NodePosition[] = notes.map((note, index) => {
      const angle = (index / notes.length) * 2 * Math.PI;
      const strength = getStrength(note);
      const conns = nodeConnections[note.id] || 0;
      
      // Nodes with more connections are closer to center
      const distFromCenter = Math.max(50, radius - (conns * 30));
      
      return {
        id: note.id,
        x: centerX + Math.cos(angle) * distFromCenter + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * distFromCenter + (Math.random() - 0.5) * 40,
        note,
        strength,
        connections: conns
      };
    });
    
    return { nodes: nodePositions, connections: conns };
  }, [notes]);
  
  // Get node color based on note type
  const getNoteColor = (note: Note) => {
    switch (note.type) {
      case 'quick': return { fill: '#fbbf24', stroke: '#f59e0b' }; // yellow
      case 'deep': return { fill: '#60a5fa', stroke: '#3b82f6' }; // blue
      case 'project': return { fill: '#4ade80', stroke: '#22c55e' }; // green
      case 'notebook': return { fill: '#a78bfa', stroke: '#8b5cf6' }; // purple
      default: return { fill: '#94a3b8', stroke: '#64748b' }; // slate
    }
  };
  
  // Get node size based on strength
  const getNodeSize = (node: NodePosition) => {
    const minSize = 20;
    const maxSize = 50;
    const maxStrength = Math.max(...nodes.map(n => n.strength), 1);
    return minSize + (node.strength / maxStrength) * (maxSize - minSize);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="text-primary-500">🕸️</span> WeaveMap
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visualize note connections • Node size = content depth • Lines = shared tags
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xl">✕</button>
        </div>

        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          {notes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🕸️</div>
                <p className="text-slate-500 font-medium">No notes to visualize</p>
                <p className="text-sm text-slate-400 mt-1">Create notes with tags to see connections</p>
              </div>
            </div>
          ) : (
            <svg width="100%" height="100%" viewBox="0 0 800 600" className="w-full h-full min-h-[500px]">
              {/* Definitions for gradients and filters */}
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Connection lines */}
              {connections.map((conn, index) => {
                const sourceNode = nodes.find(n => n.id === conn.source);
                const targetNode = nodes.find(n => n.id === conn.target);
                if (!sourceNode || !targetNode) return null;
                
                const isHighlighted = hoveredNote?.id === conn.source || hoveredNote?.id === conn.target;
                
                return (
                  <line
                    key={`conn-${index}`}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={isHighlighted ? '#ef4444' : '#cbd5e1'}
                    strokeWidth={conn.strength * 1.5}
                    opacity={isHighlighted ? 0.8 : 0.3}
                    className="transition-all duration-200"
                  />
                );
              })}
              
              {/* Note nodes */}
              {nodes.map((node) => {
                const colors = getNoteColor(node.note);
                const size = getNodeSize(node);
                const isSelected = selectedNote?.id === node.id;
                const isHovered = hoveredNote?.id === node.id;
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNote(node.note)}
                    onMouseEnter={() => setHoveredNote(node.note)}
                    onMouseLeave={() => setHoveredNote(null)}
                    className="cursor-pointer"
                    style={{ filter: isHovered ? 'url(#glow)' : 'url(#shadow)' }}
                  >
                    {/* Outer ring for connections */}
                    {node.connections > 0 && (
                      <circle
                        r={size + 5}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        opacity={0.4}
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Main circle */}
                    <circle
                      r={size}
                      fill={colors.fill}
                      stroke={isSelected ? '#ef4444' : colors.stroke}
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-all duration-200"
                    />
                    
                    {/* Connection count badge */}
                    {node.connections > 0 && (
                      <g transform={`translate(${size * 0.7}, ${-size * 0.7})`}>
                        <circle r="10" fill="#ef4444" />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {node.connections}
                        </text>
                      </g>
                    )}
                    
                    {/* Note title (truncated) */}
                    <text
                      y={size + 15}
                      textAnchor="middle"
                      fill={isHovered ? '#1e293b' : '#64748b'}
                      fontSize="11"
                      fontWeight="600"
                      className="dark:fill-slate-300"
                    >
                      {node.note.title.length > 15 
                        ? `${node.note.title.substring(0, 15)}...` 
                        : node.note.title}
                    </text>
                    
                    {/* Type indicator */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={Math.max(10, size / 3)}
                      fontWeight="bold"
                    >
                      {node.note.type.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              })}
              
              {/* Legend */}
              <g transform="translate(20, 20)">
                <rect x="-10" y="-10" width="160" height="120" rx="8" fill="white" fillOpacity="0.9" className="dark:fill-slate-800" />
                <text y="10" fontSize="12" fontWeight="bold" fill="#1e293b" className="dark:fill-white">Legend</text>
                
                <circle cx="10" cy="35" r="8" fill="#fbbf24" />
                <text x="25" y="39" fontSize="10" fill="#64748b">Quick Note</text>
                
                <circle cx="10" cy="55" r="8" fill="#60a5fa" />
                <text x="25" y="59" fontSize="10" fill="#64748b">Deep Work</text>
                
                <circle cx="10" cy="75" r="8" fill="#4ade80" />
                <text x="25" y="79" fontSize="10" fill="#64748b">Project</text>
                
                <circle cx="10" cy="95" r="8" fill="#a78bfa" />
                <text x="25" y="99" fontSize="10" fill="#64748b">Notebook</text>
              </g>
              
              {/* Stats */}
              <g transform="translate(600, 20)">
                <rect x="-10" y="-10" width="180" height="80" rx="8" fill="white" fillOpacity="0.9" className="dark:fill-slate-800" />
                <text y="10" fontSize="12" fontWeight="bold" fill="#1e293b" className="dark:fill-white">Stats</text>
                <text y="30" fontSize="10" fill="#64748b">{notes.length} notes</text>
                <text y="45" fontSize="10" fill="#64748b">{connections.length} connections</text>
                <text y="60" fontSize="10" fill="#64748b">{nodes.filter(n => n.connections > 0).length} connected</text>
              </g>
            </svg>
          )}
        </div>
        
        {/* Selected note details panel */}
        {selectedNote && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-white">{selectedNote.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{selectedNote.content}</p>
                <div className="flex gap-2 mt-2">
                  {selectedNote.tags?.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    onNoteClick(selectedNote);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  Open
                </button>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="px-3 py-1.5 text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<NoteType>('quick');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWeaveMap, setShowWeaveMap] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
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
  const [newNoteTags, setNewNoteTags] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);

  // Popular tags
  const popularTags = useMemo(() => {
    const stats: Record<string, number> = {};
    notes.forEach(note => {
      note.tags?.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return Object.entries(stats).sort(([, a], [, b]) => b - a).slice(0, 10);
  }, [notes]);

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

  // Fetch all users (admin only)
  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
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
    
    const tags = newNoteTags.split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle || 'Untitled',
          content: newNoteContent,
          type: activeTab,
          folderId: activeFolderId,
          tags: tags,
          color: 'yellow',
        }),
      });
      
      const data = await res.json();
      if (data.note) {
        setNotes([data.note, ...notes]);
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteTags('');
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
    if (activeTag && !note.tags?.includes(activeTag)) return false;
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
            <p className="text-center text-xs text-slate-500 mt-2">
              Default: admin@wsh.local / admin123
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

            {/* Analytics Button */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary-500"
              title="Analytics"
            >
              📊
            </button>

            {/* WeaveMap Button */}
            <button
              onClick={() => setShowWeaveMap(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary-500"
              title="WeaveMap - Visualize note connections"
            >
              🕸️
            </button>

            {/* Settings Button */}
            <button
              onClick={() => {
                setShowSettings(true);
                if (user?.role === 'admin' || user?.role === 'super-admin') {
                  fetchAllUsers();
                }
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary-500"
              title="Settings"
            >
              ⚙️
            </button>
            
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
              <RoleBadge role={user.role} />
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
        <aside className="w-64 shrink-0 hidden lg:block space-y-4">
          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="space-y-1">
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
          </div>
          
          {/* Folders */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
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

          {/* Popular Tags */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">🏷️ Popular Tags</h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-full border transition-all ${
                    activeTag === tag
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-primary-400'
                  }`}
                >
                  #{tag} <span className="opacity-60">{count}</span>
                </button>
              ))}
              {popularTags.length === 0 && (
                <p className="text-[10px] italic text-slate-400 py-2">Add hashtags to notes</p>
              )}
            </div>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="mt-2 text-xs text-primary-500 hover:underline"
              >
                Clear tag filter
              </button>
            )}
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
            <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
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
              {/* Hashtag input */}
              <input
                type="text"
                placeholder="Hashtags (comma separated): security, powershell, dev"
                value={newNoteTags}
                onChange={(e) => setNewNoteTags(e.target.value)}
                className="w-full px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
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
                    setNewNoteTags('');
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
                {searchQuery || activeTag ? 'Try a different search or clear filters' : 'Create your first note!'}
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
                  {/* Tags */}
                  {note.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-[9px] bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-[9px] text-slate-400">+{note.tags.length - 3}</span>
                      )}
                    </div>
                  )}
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
                    {/* Tags in list view */}
                    {note.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-[9px] bg-primary-500/10 text-primary-600 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
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
              {/* Tags in edit modal */}
              <input
                type="text"
                value={editingNote.tags?.join(', ') || ''}
                onChange={(e) => setEditingNote({ ...editingNote, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="Hashtags (comma separated)"
                className="w-full px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
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

      {/* Analytics Modal */}
      <AnalyticsModal 
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        notes={notes}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        allUsers={allUsers}
        onRefreshUsers={fetchAllUsers}
      />

      {/* WeaveMap Modal */}
      <WeaveMapModal
        isOpen={showWeaveMap}
        onClose={() => setShowWeaveMap(false)}
        notes={notes}
        onNoteClick={(note) => setEditingNote(note)}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-3 px-6 text-xs text-slate-400 text-center">
        <span className="font-medium">WSH - Weavenote Self Hosted</span>
        <span className="mx-2">•</span>
        <span>{notes.length} notes</span>
        <span className="mx-2">•</span>
        <span className="text-green-500">● PostgreSQL Connected</span>
        <span className="mx-2">•</span>
        <span className="text-primary-500">● {user.role}</span>
      </footer>
    </div>
  );
}
