'use client';

import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

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
      .slice(0, 10);
  }, [notes]);

  if (tagCounts.length === 0) {
    return (
      <div className="space-y-3">
        <span className="micro-label text-muted-foreground">🏷️ Popular Tags</span>
        <p className="text-xs text-muted-foreground/60 text-center py-2">
          No tags yet. Add tags to your notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <span className="micro-label text-muted-foreground">🏷️ Popular Tags</span>
      <div className="flex flex-wrap gap-1.5">
        {tagCounts.map(([tag, count]) => (
          <button
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-secondary/70 text-muted-foreground hover:text-pri-400 hover:bg-pri-500/10 hover:border-pri-500/30 border border-transparent transition-all duration-200 active:scale-95"
          >
            <Tag className="w-2.5 h-2.5" />
            <span>#{tag}</span>
            <span className="text-[9px] opacity-60">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
