'use client';

import { useEffect } from 'react';
import { LogIn, BookOpen, FileText, Code, Briefcase, Brain } from 'lucide-react';
import Image from 'next/image';
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
import { useWSHStore } from '@/store/wshStore';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useWSHStore();

  if (!user.isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}

function LockedOverlay() {
  const { user } = useWSHStore();

  if (user.isLoggedIn) {
    return null;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-lg animate-fadeIn">
        {/* Large Logo */}
        <div className="relative mb-8">
          <div className="mx-auto w-80 h-48 sm:w-[28rem] sm:h-64 md:w-[36rem] md:h-72 lg:w-[42rem] lg:h-80 rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/logo.png"
              alt="WSH — WeaveNote Self-Hosted"
              fill
              className="object-contain"
              priority
            />
          </div>
          {/* Glow effect behind logo */}
          <div className="absolute -inset-6 bg-pri-600/5 rounded-3xl blur-3xl -z-10" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">
          Welcome to <span className="text-pri-400">WSH</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Your self-hosted, AI-powered workspace for notes, projects, and ideas. 
          Sign in to unlock your workspace and get started.
        </p>

        {/* Note type badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
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

        {/* Login CTA */}
        <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-pri-600/10 border border-pri-500/20 text-pri-400 hover:bg-pri-600/15 transition-colors">
          <LogIn className="w-4 h-4" />
          <span className="text-xs font-bold">Login / Sign Up to unlock your workspace</span>
        </div>
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
    </div>
  );
}
