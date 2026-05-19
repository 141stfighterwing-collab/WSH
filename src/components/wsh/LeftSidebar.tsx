'use client';

import Calendar from './Calendar';
import QuickReferences from './QuickReferences';
import Folders from './Folders';
import Tags from './Tags';

export default function LeftSidebar() {
  return (
    <aside className="wsh-left-sidebar">
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
