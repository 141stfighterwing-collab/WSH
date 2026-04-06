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
import { Shield, LogIn, FileText } from 'lucide-react';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, setLoginOpen } = useWSHStore();

  if (!user.isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 animate-fadeIn max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-pri-600/10 border border-pri-500/20 flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-pri-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Login Required</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must be logged in to view and manage your notes. Your data is private and protected.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              Login to Continue
            </button>
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account? Click Login, then Register.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/30">
            <div className="text-center">
              <FileText className="w-5 h-5 text-pri-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-muted-foreground">Notes</p>
            </div>
            <div className="text-center">
              <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-muted-foreground">Secure</p>
            </div>
            <div className="text-center">
              <LogIn className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-muted-foreground">Private</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Home() {
  const { loadFromLocalStorage, viewMode } = useWSHStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar — Calendar, Quick References, Folders, Tags */}
        {useWSHStore.getState().user.isLoggedIn && <LeftSidebar />}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="px-2 py-2 md:px-4 md:py-3">
            <AuthGate>
              {/* Editor */}
              <NoteEditor />

              {/* Notes Grid (hidden in focus mode) */}
              {viewMode === 'grid' && <NotesGrid />}
            </AuthGate>
          </div>
        </main>

        {/* Right Sidebar — Clock, Today's Things, Projects */}
        {useWSHStore.getState().user.isLoggedIn && <RightSidebar />}
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
