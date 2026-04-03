'use client';

import Calendar from './Calendar';
import QuickReferences from './QuickReferences';
import Folders from './Folders';
import Tags from './Tags';

export default function LeftSidebar() {
  return (
    <aside className="wsh-left-sidebar">
      <div className="p-3 space-y-4 flex-1">
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
