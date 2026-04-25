'use client';

import { useEffect, useRef } from 'react';
import { LogIn, BookOpen, FileText, Code, Briefcase, Brain } from 'lucide-react';
import Header from '@/components/wsh/Header';
import Logo from '@/components/wsh/Logo';
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
        <div className="relative mb-10">
          {/* Ambient glow behind the logo mark */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-pri-500/10 rounded-full blur-3xl" />
          </div>
          <div className="relative flex items-center justify-center">
            <Logo size={160} showText={true} />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-3">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-pri-400 to-cyan-400 bg-clip-text text-transparent">
            WeaveNote
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-sm mx-auto">
          Your self-hosted, AI-powered workspace for notes, projects, and ideas.{' '}
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
  const { loadFromLocalStorage, viewMode, user, setUser, logoutUser, syncFromServer, notes } = useWSHStore();
  const sessionVerified = useRef(false);
  const syncDone = useRef(false);

  // Load persisted UI preferences + auth session on mount
  // Notes/folders are loaded from database via syncFromServer
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Verify the restored JWT token + sync notes from server
  useEffect(() => {
    const verifyAndSync = async () => {
      // Only run once after loadFromLocalStorage has hydrated the store
      const store = useWSHStore.getState();
      if (sessionVerified.current || !store.user.token) return;
      sessionVerified.current = true;

      try {
        const res = await fetch('/api/admin/users/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: store.user.token }),
        });

        if (!res.ok) {
          // Token is expired or invalid — log out
          logoutUser();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('wsh-auth');
          }
          return;
        }

        const data = await res.json();

        if (data?.user) {
          setUser({
            isLoggedIn: true,
            username: data.user.username,
            email: data.user.email || '',
            role: data.user.role,
          });
        }

        if (!syncDone.current) {
          syncDone.current = true;
          await syncFromServer();
        }
      } catch {
        // Network error — keep the session, use local data
        // Still try to sync in background
        if (!syncDone.current) {
          syncDone.current = true;
          syncFromServer();
        }
      }
    };

    // Small delay to allow loadFromLocalStorage to complete
    const timer = setTimeout(verifyAndSync, 100);
    return () => clearTimeout(timer);
  }, [logoutUser, setUser, syncFromServer]);

  useEffect(() => {
    if (!user.isLoggedIn || !user.token) return;
    if (notes.length > 0) return;
    syncFromServer();
  }, [user.isLoggedIn, user.token, notes.length, syncFromServer]);

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
