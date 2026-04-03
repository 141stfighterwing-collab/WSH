'use client';

import { useEffect } from 'react';
import Header from '@/components/wsh/Header';
import LeftSidebar from '@/components/wsh/LeftSidebar';
import NoteEditor from '@/components/wsh/NoteEditor';
import NotesGrid from '@/components/wsh/NotesGrid';
import RightSidebar from '@/components/wsh/RightSidebar';
import Footer from '@/components/wsh/Footer';
import SettingsPanel from '@/components/wsh/SettingsPanel';
import AnalyticsPanel from '@/components/wsh/AnalyticsPanel';
import AdminPanel from '@/components/wsh/AdminPanel';
import MindMap from '@/components/wsh/MindMap';
import TrashModal from '@/components/wsh/TrashModal';
import NotebookView from '@/components/wsh/NotebookView';
import NoteDetailModal from '@/components/wsh/NoteDetailModal';
import DBViewer from '@/components/wsh/DBViewer';
import { useWSHStore } from '@/store/wshStore';

export default function Home() {
  const { loadFromLocalStorage, viewMode } = useWSHStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Calendar, Quick References, Folders, Tags */}
        <LeftSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
          <div className="max-w-4xl mx-auto">
            {/* Editor */}
            <NoteEditor />

            {/* Notes Grid (hidden in focus mode) */}
            {viewMode === 'grid' && <NotesGrid />}
          </div>
        </main>

        {/* Right Sidebar — Clock, Today's Things, Projects */}
        <RightSidebar />
      </div>

      <Footer />

      {/* Slide-over Panels */}
      <SettingsPanel />
      <AnalyticsPanel />
      <AdminPanel />

      {/* Full-Screen Modals & Overlays */}
      <MindMap />
      <TrashModal />
      <NotebookView />
      <NoteDetailModal />
      <DBViewer />
    </div>
  );
}
