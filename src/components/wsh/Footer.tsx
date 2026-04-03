'use client';

import { Trash2, Circle } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

export default function Footer() {
  const { user, aiUsageCount, notes } = useWSHStore();

  return (
    <footer className="h-12 border-t border-border flex items-center justify-between px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-muted-foreground/40 text-muted-foreground/40" />
          <span>
            {user.isLoggedIn ? user.username : 'Guest Mode (Local Only)'}
          </span>
        </div>
        <button className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors active:scale-95">
          <Trash2 className="w-3 h-3" />
          <span className="hidden sm:inline">Trash</span>
        </button>
      </div>

      {/* Center */}
      <span className="hidden md:inline text-muted-foreground/60">
        WEAVENOTE SELF-HOSTED
      </span>

      {/* Right */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60">
          Daily AI Usage: {aiUsageCount}/800
        </span>
      </div>
    </footer>
  );
}
