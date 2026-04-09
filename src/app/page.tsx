'use client';

import { useEffect } from 'react';
import { LogIn, Lock, BookOpen, FileText, Code, Briefcase, Brain } from 'lucide-react';
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
import LoginWidget from '@/components/wsh/LoginWidget';
import PromptLibrary from '@/components/wsh/PromptLibrary';
import { useWSHStore } from '@/store/wshStore';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useWSHStore();

  if (!user.isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}

function LockedOverlay() {
  const { user, setLoginOpen } = useWSHStore();

  const [loginAnchorEl, setLoginAnchorEl] = 
    (globalThis as Record<string, unknown>).__wshLoginAnchor as [React.ReactNode, (v: unknown) => void] || 
    [null, () => {}];

  if (user.isLoggedIn) {
    return null;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md animate-fadeIn">
        <div className="w-20 h-20 rounded-2xl bg-pri-600/10 border border-pri-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-pri-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Notes Locked</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          You need to be logged in to view and manage your notes. 
          Click the <strong>Login</strong> button in the header to get started.
        </p>
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold text-muted-foreground">Quick</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
            <Code className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-bold text-muted-foreground">Code</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
            <Briefcase className="w-4 h-4 text-pink-400" />
            <span className="text-[10px] font-bold text-muted-foreground">Project</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold text-muted-foreground">Document</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold text-muted-foreground">Deep</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-pri-600/10 border border-pri-500/20 text-pri-400">
          <LogIn className="w-4 h-4" />
          <span className="text-xs font-bold">Login to unlock your workspace</span>
        </div>
      </div>
    </div>
  );
}

function PromptLibraryWrapper() {
  const { promptLibraryOpen, setPromptLibraryOpen } = useWSHStore();

  if (!promptLibraryOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setPromptLibraryOpen(false)}
      />
      {/* Panel */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 xl:inset-16 z-10">
        <PromptLibrary />
        <button
          onClick={() => setPromptLibraryOpen(false)}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border border-border shadow-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90 z-20"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { loadFromLocalStorage, viewMode, user } = useWSHStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar — Calendar, Quick References, Folders, Tags */}
        <AuthGate>
          <LeftSidebar />
        </AuthGate>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {user.isLoggedIn ? (
            <div className="px-2 py-2 md:px-4 md:py-3">
              {/* Editor */}
              <NoteEditor />

              {/* Notes Grid (hidden in focus mode) */}
              {viewMode === 'grid' && <NotesGrid />}
            </div>
          ) : (
            <LockedOverlay />
          )}
        </main>

        {/* Right Sidebar — Clock, Today's Things, Projects */}
        <AuthGate>
          <RightSidebar />
        </AuthGate>
      </div>

      <Footer />

      {/* Slide-over Panels */}
      <SettingsPanel />
      <AuthGate>
        <AnalyticsPanel />
      </AuthGate>
      <AuthGate>
        <AdminPanel />
      </AuthGate>

      {/* Full-Screen Modals & Overlays */}
      <AuthGate>
        <MindMap />
      </AuthGate>
      <AuthGate>
        <TrashModal />
      </AuthGate>
      <AuthGate>
        <NotebookView />
      </AuthGate>
      <AuthGate>
        <NoteDetailModal />
      </AuthGate>
      <AuthGate>
        <DBViewer />
      </AuthGate>
      <AuthGate>
        <PromptLibraryWrapper />
      </AuthGate>
    </div>
  );
}
