'use client';

import { X } from 'lucide-react';
import Calendar from './Calendar';
import QuickReferences from './QuickReferences';
import Folders from './Folders';
import Tags from './Tags';

interface LeftSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function LeftSidebar({ mobileOpen = false, onClose }: LeftSidebarProps) {
  return (
    <aside className={`wsh-left-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Workspace sidebar">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 xl:hidden">
        <span className="text-xs font-black uppercase text-foreground">Workspace</span>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary active:text-foreground"
          aria-label="Close workspace sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-5 p-4">
        <Calendar />
        <div className="border-t border-border/40" />
        <QuickReferences />
        <div className="border-t border-border/40" />
        <Folders />
        <div className="border-t border-border/40" />
        <Tags />
      </div>
    </aside>
  );
}
