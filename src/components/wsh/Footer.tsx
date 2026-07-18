'use client';

import { Trash2, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWSHStore } from '@/store/wshStore';
import { useVisibleNotes } from '@/hooks/useVisibleNotes';

export default function Footer() {
  const { user, aiUsageCount, trashOpen, setTrashOpen } = useWSHStore();
  const { notes } = useVisibleNotes();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (!cancelled) setOnline(data?.database?.status === 'connected' || data?.database?.status === 'connected_no_tables');
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const deletedCount = notes.filter((n) => n.isDeleted).length;

  return (
    <>
      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border px-3 text-[9px] font-bold uppercase text-muted-foreground sm:px-4 sm:text-[10px] sm:tracking-widest xl:h-12">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Circle className={`w-2 h-2 ${online === null ? 'fill-muted-foreground/40 text-muted-foreground/40' : online ? 'fill-green-400 text-green-400' : 'fill-red-500 text-red-500'}`} />
            <span className="max-w-24 truncate sm:max-w-none">
              {user.isLoggedIn ? user.username : 'Guest Mode (Local Only)'}
            </span>
          </div>
          <button
            onClick={() => setTrashOpen(true)}
            className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors active:scale-95 relative"
            aria-label={`Open trash${deletedCount > 0 ? `, ${deletedCount} deleted notes` : ''}`}
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Trash</span>
            {deletedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center">
                {deletedCount > 9 ? '9+' : deletedCount}
              </span>
            )}
          </button>
        </div>

        {/* Center */}
        <span className="hidden md:inline text-muted-foreground/60">
          WEAVENOTE SELF-HOSTED
        </span>

        {/* Right */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/60">
            AI Tokens: {aiUsageCount.toLocaleString()}
          </span>
        </div>
      </footer>

    </>
  );
}
