'use client';

import { useState, useMemo } from 'react';
import { X, Trophy, TrendingUp, Zap, BookOpen, Clock, Target, FileText, Hash, Calendar, BarChart3, Flame, Award, Tag } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

export default function AnalyticsPanel() {
  const { analyticsOpen, setAnalyticsOpen, notes, aiUsageCount, folders, user } = useWSHStore();
  const [tab, setTab] = useState<'overview' | 'types' | 'activity' | 'achievements'>('overview');

  const activeNotes = notes.filter((n) => !n.isDeleted);
  const deletedNotes = notes.filter((n) => n.isDeleted);

  const stats = useMemo(() => {
    const totalWords = activeNotes.reduce(
      (acc, n) => acc + (n.rawContent?.split(/\s+/).filter(Boolean).length || 0),
      0
    );
    const totalChars = activeNotes.reduce(
      (acc, n) => acc + (n.rawContent?.length || 0),
      0
    );

    // Type distribution
    const typeCounts: Record<string, number> = {};
    activeNotes.forEach((n) => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });

    // Words per type
    const wordsPerType: Record<string, number> = {};
    activeNotes.forEach((n) => {
      const words = n.rawContent?.split(/\s+/).filter(Boolean).length || 0;
      wordsPerType[n.type] = (wordsPerType[n.type] || 0) + words;
    });

    // Tags
    const allTags: string[] = [];
    activeNotes.forEach((n) => {
      try {
        const tags = typeof n.tags === 'string' ? JSON.parse(n.tags) : (Array.isArray(n.tags) ? n.tags : []);
        allTags.push(...tags);
      } catch { /* ignore */ }
    });
    const uniqueTags = [...new Set(allTags)];
    const tagCounts: Record<string, number> = {};
    allTags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

    // Average words per note
    const avgWords = activeNotes.length > 0 ? Math.round(totalWords / activeNotes.length) : 0;

    // Longest note
    const longestNote = activeNotes.reduce((a, b) =>
      ((a.rawContent?.length || 0) > (b.rawContent?.length || 0) ? a : b), activeNotes[0]);

    // Shortest note with content
    const shortestNote = activeNotes.filter((n) => (n.rawContent?.length || 0) > 0)
      .reduce((a, b) =>
        ((a.rawContent?.length || 0) < (b.rawContent?.length || 0) ? a : b), activeNotes[0]);

    // Notes by day of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const notesByDay: Record<string, number> = {};
    dayNames.forEach((d) => { notesByDay[d] = 0; });
    activeNotes.forEach((n) => {
      const day = dayNames[new Date(n.createdAt).getDay()];
      notesByDay[day] = (notesByDay[day] || 0) + 1;
    });
    const peakDay = Object.entries(notesByDay).sort((a, b) => b[1] - a[1])[0];

    // Notes by hour of day
    const notesByHour: Record<number, number> = {};
    activeNotes.forEach((n) => {
      const hour = new Date(n.createdAt).getHours();
      notesByHour[hour] = (notesByHour[hour] || 0) + 1;
    });
    const peakHour = Object.entries(notesByHour).sort((a, b) => b[1] - a[1])[0];

    // Activity timeline (last 7 days)
    const last7Days: { date: string; count: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = activeNotes.filter((n) => n.createdAt.startsWith(dateStr)).length;
      last7Days.push({ date: dateStr, count, label: d.toLocaleDateString('en', { weekday: 'short' }) });
    }

    // Last 30 days
    const last30Count = activeNotes.filter((n) => {
      const created = new Date(n.createdAt);
      return Date.now() - created.getTime() < 30 * 86400000;
    }).length;

    // Oldest and newest
    const oldest = activeNotes.length > 0
      ? activeNotes.reduce((a, b) => (a.createdAt < b.createdAt ? a : b))
      : null;
    const newest = activeNotes.length > 0
      ? activeNotes.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      : null;

    // Avg notes per day
    const daysActive = oldest ? Math.max(1, Math.ceil((Date.now() - new Date(oldest.createdAt).getTime()) / 86400000)) : 1;
    const avgPerDay = (activeNotes.length / daysActive).toFixed(1);

    // Total editing time estimate (rough: 1 min per 50 words)
    const estimatedMinutes = Math.round(totalWords / 50);
    const estimatedHours = (estimatedMinutes / 60).toFixed(1);

    // Folders usage
    const usedFolders = folders.length;
    const folderNoteCounts: Record<string, number> = {};
    activeNotes.forEach((n) => {
      if (n.folderId) folderNoteCounts[n.folderId] = (folderNoteCounts[n.folderId] || 0) + 1;
    });
    const notesInFolders = Object.values(folderNoteCounts).reduce((a, b) => a + b, 0);

    // Colored note types
    const typeColors: Record<string, string> = {
      quick: 'bg-blue-500',
      notebook: 'bg-orange-500',
      deep: 'bg-purple-500',
      code: 'bg-pink-500',
      project: 'bg-teal-500',
      document: 'bg-indigo-500',
    };

    return {
      totalWords, totalChars, typeCounts, wordsPerType, uniqueTags, topTags,
      avgWords, longestNote, shortestNote, notesByDay, peakDay, notesByHour,
      peakHour, last7Days, last30Count, oldest, newest, daysActive, avgPerDay,
      estimatedMinutes, estimatedHours, usedFolders, notesInFolders, typeColors,
    };
  }, [activeNotes, folders]);

  // Dynamic achievements based on actual data
  const achievements: Achievement[] = useMemo(() => [
    { id: '1', title: 'First Note', description: 'Create your first note', icon: <BookOpen className="w-5 h-5" />, unlocked: activeNotes.length >= 1 },
    { id: '2', title: 'Speed Writer', description: 'Write 1,000+ total words', icon: <Zap className="w-5 h-5" />, unlocked: stats.totalWords >= 1000 },
    { id: '3', title: 'Prolific', description: 'Create 10+ notes', icon: <FileText className="w-5 h-5" />, unlocked: activeNotes.length >= 10 },
    { id: '4', title: 'Organized', description: 'Create 3+ folders', icon: <Target className="w-5 h-5" />, unlocked: folders.length >= 3 },
    { id: '5', title: 'Tag Master', description: 'Use 10+ unique tags', icon: <Tag className="w-5 h-5" />, unlocked: stats.uniqueTags.length >= 10 },
    { id: '6', title: 'Wordsmith', description: 'Write 10,000+ total words', icon: <TrendingUp className="w-5 h-5" />, unlocked: stats.totalWords >= 10000 },
    { id: '7', title: 'Code Coder', description: 'Create 5+ code notes', icon: <Hash className="w-5 h-5" />, unlocked: (stats.typeCounts['code'] || 0) >= 5 },
    { id: '8', title: 'Project Manager', description: 'Create 3+ project notes', icon: <Award className="w-5 h-5" />, unlocked: (stats.typeCounts['project'] || 0) >= 3 },
    { id: '9', title: 'On Fire', description: 'Write 5+ notes in one day', icon: <Flame className="w-5 h-5" />, unlocked: Math.max(...stats.last7Days.map((d) => d.count)) >= 5 },
    { id: '10', title: 'AI Explorer', description: 'Use AI synthesis 10+ times', icon: <Zap className="w-5 h-5" />, unlocked: aiUsageCount >= 10 },
  ], [activeNotes.length, stats, folders.length, aiUsageCount]);

  if (!analyticsOpen) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <BarChart3 className="w-3 h-3" /> },
    { id: 'types' as const, label: 'Types', icon: <FileText className="w-3 h-3" /> },
    { id: 'activity' as const, label: 'Activity', icon: <Calendar className="w-3 h-3" /> },
    { id: 'achievements' as const, label: 'Awards', icon: <Trophy className="w-3 h-3" /> },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[90] animate-fadeIn" onClick={() => setAnalyticsOpen(false)} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-[100] flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="micro-label text-muted-foreground">📊 Analytics & Awards</span>
          <button onClick={() => setAnalyticsOpen(false)} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                tab === t.id
                  ? 'bg-pri-600/15 text-pri-400 border border-pri-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'overview' && (
            <>
              {/* User info */}
              {user.isLoggedIn && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
                  <div className="w-8 h-8 rounded-full bg-pri-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{user.username}</p>
                    <p className="text-[9px] text-muted-foreground">{user.role} • Member for {stats.daysActive} day{stats.daysActive !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Notes', value: activeNotes.length, icon: <BookOpen className="w-3.5 h-3.5" />, color: 'text-pri-400' },
                  { label: 'Words', value: stats.totalWords.toLocaleString(), icon: <FileText className="w-3.5 h-3.5" />, color: 'text-green-400' },
                  { label: 'Characters', value: stats.totalChars.toLocaleString(), icon: <Hash className="w-3.5 h-3.5" />, color: 'text-purple-400' },
                  { label: 'AI Uses', value: aiUsageCount, icon: <Zap className="w-3.5 h-3.5" />, color: 'text-orange-400' },
                  { label: 'Folders', value: stats.usedFolders, icon: <Target className="w-3.5 h-3.5" />, color: 'text-teal-400' },
                  { label: 'Tags', value: stats.uniqueTags.length, icon: <Tag className="w-3.5 h-3.5" />, color: 'text-pink-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/30 rounded-xl p-3 border border-border/30 text-center">
                    <div className={`${s.color} mx-auto mb-1`}>{s.icon}</div>
                    <div className="text-lg font-bold text-foreground">{s.value}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Derived Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Avg Words/Note', value: stats.avgWords.toLocaleString() },
                  { label: 'Avg Notes/Day', value: stats.avgPerDay },
                  { label: 'Est. Writing Time', value: `${stats.estimatedHours}h ${stats.estimatedMinutes % 60}m` },
                  { label: 'Notes in Folders', value: `${stats.notesInFolders} / ${activeNotes.length}` },
                  { label: 'Last 7 Days', value: stats.last7Days.reduce((a, d) => a + d.count, 0) },
                  { label: 'Last 30 Days', value: stats.last30Count },
                  { label: 'Peak Day', value: `${stats.peakDay?.[0] || 'N/A'} (${stats.peakDay?.[1] || 0})` },
                  { label: 'Peak Hour', value: stats.peakHour ? `${stats.peakHour[0]}:00 (${stats.peakHour[1]})` : 'N/A' },
                  { label: 'Trash Items', value: deletedNotes.length },
                  { label: 'Tag Coverage', value: activeNotes.length > 0 ? `${Math.round((activeNotes.filter((n) => { try { const t = typeof n.tags === 'string' ? JSON.parse(n.tags) : n.tags; return Array.isArray(t) && t.length > 0; } catch { return false; } }).length / activeNotes.length) * 100)}%` : '0%' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-border/20">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <span className="text-xs font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Top Tags */}
              {stats.topTags.length > 0 && (
                <div className="space-y-2">
                  <span className="micro-label text-muted-foreground">🏷️ Top Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.topTags.map(([tag, count]) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pri-500/15 text-pri-400 border border-pri-500/20">
                        #{tag} <span className="text-[8px] text-muted-foreground">×{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Note Extremes */}
              <div className="grid grid-cols-2 gap-2">
                {stats.longestNote && (
                  <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Longest Note</span>
                    <p className="text-xs font-semibold text-foreground truncate">{stats.longestNote.title}</p>
                    <p className="text-[9px] text-muted-foreground">{(stats.longestNote.rawContent?.length || 0).toLocaleString()} chars</p>
                  </div>
                )}
                {stats.newest && (
                  <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Newest Note</span>
                    <p className="text-xs font-semibold text-foreground truncate">{stats.newest.title}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(stats.newest.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'types' && (
            <>
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Note Type Distribution</span>
                {Object.entries(stats.typeCounts).length > 0 ? (
                  Object.entries(stats.typeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const maxCount = Math.max(...Object.values(stats.typeCounts));
                      const pct = activeNotes.length > 0 ? Math.round((count / activeNotes.length) * 100) : 0;
                      const barPct = Math.round((count / maxCount) * 100);
                      const words = stats.wordsPerType[type] || 0;
                      return (
                        <div key={type} className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground capitalize">{type}</span>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-foreground">{count}</span>
                              <span className="text-[9px] text-muted-foreground ml-1">({pct}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${stats.typeColors[type] || 'bg-pri-500'} transition-all duration-500`} style={{ width: `${barPct}%` }} />
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1">
                            {words.toLocaleString()} total words • avg {count > 0 ? Math.round(words / count) : 0} words/note
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">No data yet</p>
                )}
              </div>

              {/* Words by type chart */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Words by Type</span>
                {Object.entries(stats.wordsPerType).length > 0 ? (
                  Object.entries(stats.wordsPerType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, words]) => {
                      const maxWords = Math.max(...Object.values(stats.wordsPerType));
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground capitalize w-20 text-right">{type}</span>
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${stats.typeColors[type] || 'bg-pri-500'}`} style={{ width: `${Math.round((words / maxWords) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-foreground w-16">{words.toLocaleString()}</span>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-muted-foreground/60 text-center py-2">No data</p>
                )}
              </div>
            </>
          )}

          {tab === 'activity' && (
            <>
              {/* Last 7 Days Chart */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Last 7 Days</span>
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                  <div className="flex items-end gap-2 h-24">
                    {stats.last7Days.map((day) => {
                      const maxCount = Math.max(...stats.last7Days.map((d) => d.count), 1);
                      const height = Math.max(4, (day.count / maxCount) * 100);
                      const isToday = day.date === new Date().toISOString().split('T')[0];
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[8px] font-bold text-muted-foreground">{day.count}</span>
                          <div className={`w-full rounded-t ${isToday ? 'bg-pri-500' : 'bg-secondary'} transition-all`} style={{ height: `${height}%` }} />
                          <span className="text-[8px] font-bold text-muted-foreground">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes by Day of Week */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Notes by Day of Week</span>
                <div className="space-y-1">
                  {Object.entries(stats.notesByDay)
                    .sort((a, b) => b[1] - a[1])
                    .map(([day, count]) => {
                      const maxCount = Math.max(...Object.values(stats.notesByDay), 1);
                      return (
                        <div key={day} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground w-8">{day}</span>
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${day === stats.peakDay?.[0] ? 'bg-pri-500' : 'bg-secondary-foreground/20'}`} style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-foreground w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Notes by Hour */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Writing Hours (Peak: {stats.peakHour ? `${stats.peakHour[0]}:00` : 'N/A'})</span>
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                  <div className="flex items-end gap-0.5 h-16">
                    {Array.from({ length: 24 }, (_, i) => {
                      const count = stats.notesByHour[i] || 0;
                      const maxCount = Math.max(...Object.values(stats.notesByHour), 1);
                      const height = Math.max(1, (count / maxCount) * 100);
                      const isPeak = stats.peakHour && parseInt(stats.peakHour[0]) === i;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center" title={`${i}:00 — ${count} notes`}>
                          <div className={`w-full rounded-t ${isPeak ? 'bg-pri-500' : count > 0 ? 'bg-secondary-foreground/30' : 'bg-secondary/50'}`} style={{ height: `${height}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[7px] text-muted-foreground">12am</span>
                    <span className="text-[7px] text-muted-foreground">6am</span>
                    <span className="text-[7px] text-muted-foreground">12pm</span>
                    <span className="text-[7px] text-muted-foreground">6pm</span>
                    <span className="text-[7px] text-muted-foreground">11pm</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Timeline</span>
                <div className="grid grid-cols-2 gap-2">
                  {stats.oldest && (
                    <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">First Note</span>
                      <p className="text-xs font-semibold text-foreground truncate">{stats.oldest.title}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(stats.oldest.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                  {stats.newest && (
                    <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Latest Note</span>
                      <p className="text-xs font-semibold text-foreground truncate">{stats.newest.title}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(stats.newest.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'achievements' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="micro-label text-muted-foreground">🏆 Achievements</span>
                <span className="text-[9px] font-bold text-muted-foreground">
                  {achievements.filter((a) => a.unlocked).length}/{achievements.length} Unlocked
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${(achievements.filter((a) => a.unlocked).length / achievements.length) * 100}%` }}
                />
              </div>
              <div className="space-y-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      achievement.unlocked
                        ? 'bg-pri-600/10 border-pri-500/20'
                        : 'bg-secondary/30 border-border/30 opacity-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${achievement.unlocked ? 'bg-pri-500/20 text-pri-400' : 'bg-secondary text-muted-foreground'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{achievement.title}</p>
                      <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                    </div>
                    {achievement.unlocked ? (
                      <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
