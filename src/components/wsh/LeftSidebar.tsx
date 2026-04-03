'use client';

import Calendar from './Calendar';
import QuickReferences from './QuickReferences';
import Folders from './Folders';
import Tags from './Tags';

export default function LeftSidebar() {
  return (
    <aside className="hidden lg:block w-72 min-w-[288px] border-r border-border overflow-y-auto max-h-[calc(100vh-4rem-3rem)]">
      <div className="p-4 space-y-6">
        <Calendar />
        <div className="border-t border-border/50 pt-4" />
        <QuickReferences />
        <div className="border-t border-border/50 pt-4" />
        <Folders />
        <div className="border-t border-border/50 pt-4" />
        <Tags />
      </div>
    </aside>
  );
}
