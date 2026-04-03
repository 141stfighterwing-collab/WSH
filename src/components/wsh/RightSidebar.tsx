'use client';

import Calendar from './Calendar';
import QuickReferences from './QuickReferences';
import Folders from './Folders';
import Tags from './Tags';

export default function RightSidebar() {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 order-1 lg:order-1 overflow-y-auto max-h-[calc(100vh-4rem-3rem)] p-2">
      {/* Calendar Card */}
      <div className="bg-card rounded-xl p-3 shadow-sm border border-border">
        <Calendar />
      </div>

      {/* Quick References Card */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <QuickReferences />
      </div>

      {/* Folders Card */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <Folders />
      </div>

      {/* Popular Tags Card */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <Tags />
      </div>
    </aside>
  );
}
