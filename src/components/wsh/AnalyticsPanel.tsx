'use client';

import { useState, useMemo } from 'react';
import {
  X, Trophy, TrendingUp, Zap, BookOpen, Clock, Target,
  Hash, FileText, Brain, Code, Briefcase, Calendar,
  Flame, BarChart3, Eye, Star, Layers, Timer, Activity,
} from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  condition: (state: AchievementDeps) => boolean;
}

interface AchievementDeps {
  activeNotes: number;
  totalWords: number;
  folderCount: number;
  uniqueTags: number;
  streak: number;
  projectCount: number;
  codeCount: number;
  docCount: number;
  deepCount: number;
}

const achievements: Achievement[] = [
  { id: '1', title: 'First Note', description: 'Create your first note', icon: <BookOpen className="w-5 h-5" />, condition: (d) => d.activeNotes >= 1 },
  { id: '2', title: 'Speed Writer', description: 'Write over 1,000 total words', icon: <Zap className="w-5 h-5" />, condition: (d) => d.totalWords >= 1000 },
  { id: '3', title: 'Organized', description: 'Create 5 folders', icon: <Target className="w-5 h-5" />, condition: (d) => d.folderCount >= 5 },
  { id: '4', title: 'Tag Master', description: 'Use 20 unique tags', icon: <Hash className="w-5 h-5" />, condition: (d) => d.uniqueTags >= 20 },
  { id: '5', title: '7-Day Streak', description: 'Create notes 7 days in a row', icon: <Flame className="w-5 h-5" />, condition: (d) => d.streak >= 7 },
  { id: '6', title: 'Project Manager', description: 'Create 3 project notes', icon: <Briefcase className="w-5 h-5" />, condition: (d) => d.projectCount >= 3 },
  { id: '7', title: 'Code Monkey', description: 'Create 5 code snippets', icon: <Code className="w-5 h-5" />, condition: (d) => d.codeCount >= 5 },
  { id: '8', title: 'Deep Thinker', description: 'Write 3 deep-dive notes', icon: <Brain className="w-5 h-5" />, condition: (d) => d.deepCount >= 3 },
  { id: '9', title: 'Prolific', description: 'Create 25+ notes', icon: <Star className="w-5 h-5" />, condition: (d) => d.activeNotes >= 25 },
  { id: '10', title: 'Document Architect', description: 'Create 5 document notes', icon: <FileText className="w-5 h-5" />, condition: (d) => d.docCount >= 5 },
  { id: '11', title: 'Centurion', description: 'Write 10,000 total words', icon: <TrendingUp className="w-5 h-5" />, condition: (d) => d.totalWords >= 10000 },
  { id: '12', title: '30-Day Streak', description: 'Create notes 30 days in a row', icon: <Calendar className="w-5 h-5" />, condition: (d) => d.streak >= 30 },
];

/** Convert a Date object to YYYY-MM-DD in local timezone */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convert an ISO string to YYYY-MM-DD in local timezone */
function noteToLocalDate(n: { createdAt: string }): string {
  return toLocalDateStr(new Date(n.createdAt));
}

function calculateStreak(notes: { createdAt: string }[]): number {
  if (notes.length === 0) return 0;

  const daySet = new Set<string>();
  notes.forEach((n) => {
    daySet.add(toLocalDateStr(new Date(n.createdAt)));
  });

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = toLocalDateStr(checkDate);

    if (daySet.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Allow today to not have a note yet (streak from yesterday)
      break;
    }
  }

  return streak;
}

function getLast7DaysActivity(notes: { createdAt: string }[]): { day: string; count: number }[] {
  const result: { day: string; count: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateStr(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const count = notes.filter((n) => noteToLocalDate(n) === dateStr).length;
    result.push({ day: dayLabel, count });
  }

  return result;
}

function getMostUsedTags(notes: { tags: string[] }[]): { tag: string; count: number }[] {
  const tagMap: Record<string, number> = {};
  notes.forEach((n) => {
    n.tags.forEach((t) => {
      tagMap[t] = (tagMap[t] || 0) + 1;
    });
  });
  return Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
}

function getMostProductiveDay(notes: { createdAt: string }[]): string {
  if (notes.length === 0) return 'N/A';
  const dayCounts: Record<string, number> = {};
  notes.forEach((n) => {
    const day = new Date(n.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  return Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];
}

function getMostProductiveHour(notes: { createdAt: string }[]): string {
  if (notes.length === 0) return 'N/A';
  const hourCounts: Record<number, number> = {};
  notes.forEach((n) => {
    const hour = new Date(n.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const top = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const h = Number(top[0]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:00 ${ampm}`;
}

export default function AnalyticsPanel() {
  const { analyticsOpen, setAnalyticsOpen, notes, folders, aiUsageCount } = useWSHStore();

  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const totalWords = useMemo(
    () => activeNotes.reduce((acc, n) => acc + (n.rawContent?.split(/\s+/).filter(Boolean).length || 0), 0),
    [activeNotes]
  );
  const totalChars = useMemo(
    () => activeNotes.reduce((acc, n) => acc + (n.rawContent?.length || 0), 0),
    [activeNotes]
  );
  const avgWordsPerNote = useMemo(() => activeNotes.length > 0 ? Math.round(totalWords / activeNotes.length) : 0, [activeNotes, totalWords]);
  const totalReadingTime = useMemo(() => Math.max(1, Math.ceil(totalWords / 200)), [totalWords]);
  const longestNote = useMemo(
    () => activeNotes.reduce<string | null>((longest, n) => {
      const len = n.rawContent?.length || 0;
      if (!longest || len > (notes.find((x) => x.id === longest)?.rawContent?.length || 0)) return n.id;
      return longest;
    }, null),
    [activeNotes]
  );
  const longestNoteTitle = useMemo(
    () => (longestNote ? notes.find((n) => n.id === longestNote)?.title : 'N/A'),
    [longestNote, notes]
  );
  const longestNoteWords = useMemo(
    () => (longestNote ? (notes.find((n) => n.id === longestNote)?.rawContent?.split(/\s+/).filter(Boolean).length || 0) : 0),
    [longestNote, notes]
  );

  const typeCounts = useMemo(() => {
    return activeNotes.reduce<Record<string, number>>((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
  }, [activeNotes]);

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeNotes.forEach((n) => n.tags.forEach((t) => tagSet.add(t)));
    return tagSet.size;
  }, [activeNotes]);

  const streak = useMemo(() => calculateStreak(activeNotes), [activeNotes]);

  const last7Days = useMemo(() => getLast7DaysActivity(activeNotes), [activeNotes]);
  const maxDayCount = useMemo(() => Math.max(...last7Days.map((d) => d.count), 1), [last7Days]);

  const mostUsedTags = useMemo(() => getMostUsedTags(activeNotes), [activeNotes]);

  const mostProductiveDay = useMemo(() => getMostProductiveDay(activeNotes), [activeNotes]);
  const mostProductiveHour = useMemo(() => getMostProductiveHour(activeNotes), [activeNotes]);

  const deletedNotes = useMemo(() => notes.filter((n) => n.isDeleted).length, [notes]);

  const avgNotesPerDay = useMemo(() => {
    if (activeNotes.length === 0) return 0;
    const oldest = activeNotes.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const days = Math.max(1, Math.ceil((Date.now() - new Date(oldest.createdAt).getTime()) / 86400000));
    return (activeNotes.length / days).toFixed(1);
  }, [activeNotes]);

  const totalStorageEstimate = useMemo(() => {
    const bytes = activeNotes.reduce((acc, n) => {
      return acc + (n.title?.length || 0) + (n.rawContent?.length || 0) + (n.content?.length || 0);
    }, 0) * 2; // UTF-16 ~2 bytes per char
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }, [activeNotes]);

  const achievementDeps: AchievementDeps = {
    activeNotes: activeNotes.length,
    totalWords,
    folderCount: folders.length,
    uniqueTags,
    streak,
    projectCount: typeCounts['project'] || 0,
    codeCount: typeCounts['code'] || 0,
    docCount: typeCounts['document'] || 0,
    deepCount: typeCounts['deep'] || 0,
  };

  const unlockedAchievements = achievements.filter((a) => a.condition(achievementDeps));

  if (!analyticsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[90] animate-fadeIn"
        onClick={() => setAnalyticsOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-[100] flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="micro-label text-muted-foreground">📊 Analytics</span>
          <button
            onClick={() => setAnalyticsOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-pri-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Notes</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{activeNotes.length}</div>
              <p className="text-[9px] text-muted-foreground/60 mt-1">{deletedNotes} in trash</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Words</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{totalWords.toLocaleString()}</div>
              <p className="text-[9px] text-muted-foreground/60 mt-1">{totalChars.toLocaleString()} characters</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">AI Uses</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{aiUsageCount}</div>
            </div>
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-red-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Streak</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{streak} day{streak !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-secondary/20 rounded-lg p-3 border border-border/20 text-center">
              <Timer className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-foreground">{totalReadingTime}m</div>
              <p className="text-[8px] text-muted-foreground">Read Time</p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 border border-border/20 text-center">
              <Layers className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-foreground">{avgWordsPerNote}</div>
              <p className="text-[8px] text-muted-foreground">Avg Words</p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 border border-border/20 text-center">
              <Hash className="w-3.5 h-3.5 text-pri-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-foreground">{uniqueTags}</div>
              <p className="text-[8px] text-muted-foreground">Unique Tags</p>
            </div>
          </div>

          {/* 7-Day Activity Chart */}
          <div className="space-y-2">
            <span className="micro-label text-muted-foreground">📈 Last 7 Days Activity</span>
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-end justify-between gap-2 h-28">
                {last7Days.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-bold text-foreground">{d.count}</span>
                    <div
                      className="w-full rounded-full bg-pri-500 transition-all duration-500 min-h-[4px]"
                      style={{ height: `${Math.max(4, (d.count / maxDayCount) * 80)}px` }}
                    />
                    <span className="text-[8px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Note Type Distribution */}
          <div className="space-y-2">
            <span className="micro-label text-muted-foreground">📋 Note Distribution</span>
            {Object.entries(typeCounts).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(typeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const maxCount = Math.max(...Object.values(typeCounts));
                    const percentage = Math.round((count / maxCount) * 100);
                    const typeColorsMap: Record<string, string> = {
                      quick: 'bg-blue-500',
                      notebook: 'bg-green-500',
                      deep: 'bg-purple-500',
                      code: 'bg-orange-500',
                      project: 'bg-pink-500',
                      document: 'bg-cyan-500',
                      'ai-prompts': 'bg-violet-500',
                    };
                    return (
                      <div key={type} className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-foreground capitalize">{type}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${typeColorsMap[type] || 'bg-pri-500'} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 text-center py-4">No data yet</p>
            )}
          </div>

          {/* Most Used Tags */}
          {mostUsedTags.length > 0 && (
            <div className="space-y-2">
              <span className="micro-label text-muted-foreground">🏷️ Top Tags</span>
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30 space-y-2">
                {mostUsedTags.slice(0, 5).map(({ tag, count }, i) => (
                  <div key={tag} className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">#{tag}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">{count}×</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Productivity Insights */}
          <div className="space-y-2">
            <span className="micro-label text-muted-foreground">💡 Productivity Insights</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Busiest Day</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{mostProductiveDay}</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Peak Hour</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{mostProductiveHour}</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="w-3 h-3 text-teal-400" />
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Avg/Day</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{avgNotesPerDay} notes</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3 h-3 text-rose-400" />
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Storage</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{totalStorageEstimate}</p>
              </div>
            </div>
          </div>

          {/* Longest Note */}
          {longestNoteTitle && longestNoteTitle !== 'N/A' && (
            <div className="space-y-2">
              <span className="micro-label text-muted-foreground">📝 Longest Note</span>
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                <p className="text-xs font-semibold text-foreground truncate">{longestNoteTitle}</p>
                <p className="text-[10px] text-muted-foreground">{longestNoteWords.toLocaleString()} words</p>
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="micro-label text-muted-foreground">🏆 Achievements</span>
              <span className="text-[9px] font-bold text-pri-400">
                {unlockedAchievements.length}/{achievements.length} unlocked
              </span>
            </div>
            <div className="space-y-2">
              {achievements.map((achievement) => {
                const unlocked = achievement.condition(achievementDeps);
                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      unlocked
                        ? 'bg-pri-600/10 border-pri-500/20'
                        : 'bg-secondary/30 border-border/30 opacity-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl ${
                        unlocked
                          ? 'bg-pri-500/20 text-pri-400'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{achievement.title}</p>
                      <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                    </div>
                    {unlocked && (
                      <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
