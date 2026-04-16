'use client';

import { Trash2, Circle } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

export default function Footer() {
  const { user, aiUsageCount, trashOpen, setTrashOpen, notes } = useWSHStore();

  const deletedCount = notes.filter((n) => n.isDeleted).length;

  return (
    <>
      <footer className="h-12 border-t border-border flex items-center justify-between px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-muted-foreground/40 text-muted-foreground/40" />
            <span>
              {user.isLoggedIn ? user.username : 'Guest Mode (Local Only)'}
            </span>
          </div>
          <button
            onClick={() => setTrashOpen(true)}
            className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors active:scale-95 relative"
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
