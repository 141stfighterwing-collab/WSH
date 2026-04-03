'use client';

import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

const NEON_COLORS = [
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-400/50', glow: 'shadow-[0_0_6px_rgba(34,211,238,0.3)]' },
  { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300', border: 'border-fuchsia-400/50', glow: 'shadow-[0_0_6px_rgba(232,121,249,0.3)]' },
  { bg: 'bg-lime-500/20', text: 'text-lime-300', border: 'border-lime-400/50', glow: 'shadow-[0_0_6px_rgba(163,230,53,0.3)]' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-400/50', glow: 'shadow-[0_0_6px_rgba(250,204,21,0.3)]' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-400/50', glow: 'shadow-[0_0_6px_rgba(251,113,133,0.3)]' },
  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-400/50', glow: 'shadow-[0_0_6px_rgba(167,139,250,0.3)]' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-400/50', glow: 'shadow-[0_0_6px_rgba(52,211,153,0.3)]' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-400/50', glow: 'shadow-[0_0_6px_rgba(251,146,60,0.3)]' },
  { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-400/50', glow: 'shadow-[0_0_6px_rgba(56,189,248,0.3)]' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-400/50', glow: 'shadow-[0_0_6px_rgba(249,168,212,0.3)]' },
];

// Deterministic color based on tag name hash
function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
}

export default function Tags() {
  const { notes } = useWSHStore();

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes
      .filter((n) => !n.isDeleted)
      .forEach((note) => {
        note.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [notes]);

  if (tagCounts.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2 border-b border-border/50 pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">🏷️ Popular Tags</span>
        </div>
        <p className="text-[10px] italic text-muted-foreground/60 py-4 w-full text-center">
          No tags yet. Add hashtags to your notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2 border-b border-border/50 pb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">🏷️ Popular Tags</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tagCounts.map(([tag, count]) => {
          const color = getTagColor(tag);
          return (
            <button
              key={tag}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${color.bg} ${color.text} ${color.border} border ${color.glow} hover:scale-105 transition-all duration-200 active:scale-95`}
            >
              <Tag className="w-2.5 h-2.5" />
              <span>#{tag}</span>
              <span className="text-[9px] opacity-70 ml-0.5">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
