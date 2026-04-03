'use client';

import { useState } from 'react';
import { X, Trophy, TrendingUp, Zap, BookOpen, Clock, Target } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

const achievements: Achievement[] = [
  { id: '1', title: 'First Note', description: 'Create your first note', icon: <BookOpen className="w-5 h-5" />, unlocked: true },
  { id: '2', title: 'Speed Writer', description: 'Write 1000 words in a session', icon: <Zap className="w-5 h-5" />, unlocked: true },
  { id: '3', title: 'Organized', description: 'Create 5 folders', icon: <Target className="w-5 h-5" />, unlocked: false },
  { id: '4', title: 'Tag Master', description: 'Use 20 unique tags', icon: <Trophy className="w-5 h-5" />, unlocked: false },
  { id: '5', title: 'Streak', description: '7 days of daily notes', icon: <TrendingUp className="w-5 h-5" />, unlocked: false },
];

export default function AnalyticsPanel() {
  const { analyticsOpen, setAnalyticsOpen, notes, aiUsageCount } = useWSHStore();

  const activeNotes = notes.filter((n) => !n.isDeleted);
  const totalWords = activeNotes.reduce(
    (acc, n) => acc + (n.rawContent?.split(/\s+/).filter(Boolean).length || 0),
    0
  );

  const typeCounts = activeNotes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

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
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-pri-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Notes</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{activeNotes.length}</div>
            </div>
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Words</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{totalWords.toLocaleString()}</div>
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
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avg/Day</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {activeNotes.length > 0 ? Math.round(activeNotes.length / Math.max(1, Math.ceil((Date.now() - new Date(activeNotes[activeNotes.length - 1]?.createdAt).getTime()) / 86400000))) : 0}
              </div>
            </div>
          </div>

          {/* Note Types Distribution */}
          <div className="space-y-2">
            <span className="micro-label text-muted-foreground">Note Distribution</span>
            {Object.entries(typeCounts).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(typeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const maxCount = Math.max(...Object.values(typeCounts));
                    const percentage = Math.round((count / maxCount) * 100);
                    return (
                      <div key={type} className="bg-secondary/30 rounded-xl p-3 border border-border/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-foreground capitalize">{type}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-pri-500 transition-all duration-500"
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

          {/* Achievements */}
          <div className="space-y-2">
            <span className="micro-label text-muted-foreground">🏆 Achievements</span>
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
                  <div
                    className={`p-2 rounded-xl ${
                      achievement.unlocked
                        ? 'bg-pri-500/20 text-pri-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {achievement.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{achievement.title}</p>
                    <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                  </div>
                  {achievement.unlocked && (
                    <Trophy className="w-4 h-4 text-yellow-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
