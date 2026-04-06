'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  Search,
  BarChart3,
  Settings,
  Grid3X3,
  Focus,
  LogIn,
  Shield,
  Network,
  BookOpen,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';
import Logo from './Logo';
import LoginWidget from './LoginWidget';
import { useWSHStore } from '@/store/wshStore';

interface DbStatus {
  status: 'checking' | 'connected' | 'error' | 'idle';
  message?: string;
}

export default function Header() {
  const {
    viewMode,
    setViewMode,
    setSettingsOpen,
    setAnalyticsOpen,
    setAdminPanelOpen,
    setMindMapOpen,
    setNotebookOpen,
    searchQuery,
    setSearchQuery,
    user,
    loginOpen,
    setLoginOpen,
  } = useWSHStore();

  const [loginAnchorEl, setLoginAnchorEl] = useState<HTMLElement | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus>({ status: 'idle' });
  const [showDbTest, setShowDbTest] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<Record<string, string> | null>(null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleLoginClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setLoginAnchorEl(e.currentTarget);
  }, []);

  const handleLoginClose = useCallback(() => {
    setLoginAnchorEl(null);
  }, []);

  // Sync loginAnchorEl with store loginOpen
  useEffect(() => {
    if (loginOpen && !loginAnchorEl) {
      // Store triggered login, show widget at the login button
      const btn = document.getElementById('login-btn');
      if (btn) setLoginAnchorEl(btn);
    }
    if (!loginOpen && loginAnchorEl) {
      setLoginAnchorEl(null);
    }
  }, [loginOpen, loginAnchorEl]);

  const isAdmin = mounted && user.isLoggedIn && (user.role === 'admin' || user.role === 'super-admin');

  // Check DB status on mount
  useEffect(() => {
    if (!isAdmin) return;
    const check = async () => {
      setDbStatus({ status: 'checking' });
      try {
        const res = await fetch('/api/admin/db-test');
        const data = await res.json();
        setDbStatus({
          status: data.status === 'connected' ? 'connected' : 'error',
          message: data.results?.read || 'Unknown',
        });
      } catch {
        setDbStatus({ status: 'error', message: 'Network error' });
      }
    };
    check();
    const interval = setInterval(check, 30000); // Re-check every 30s
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleDbTest = async () => {
    setDbStatus({ status: 'checking' });
    setDbTestResult(null);
    setShowDbTest(true);
    try {
      const res = await fetch('/api/admin/db-test');
      const data = await res.json();
      setDbStatus({
        status: data.status === 'connected' ? 'connected' : 'error',
        message: data.results?.read || 'Unknown',
      });
      setDbTestResult(data.results);
    } catch {
      setDbStatus({ status: 'error', message: 'Network error' });
      setDbTestResult({ error: 'Could not reach server' });
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 glass border-b border-border">
      <div className="flex items-center justify-between h-full px-4 gap-3">
        {/* Logo */}
        <Logo />

        {/* View Toggles */}
        <div className="hidden md:flex items-center bg-secondary rounded-full px-1 py-1 gap-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-full transition-all duration-200 active:scale-95 ${
              viewMode === 'grid'
                ? 'bg-pri-600 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('focus')}
            className={`p-1.5 rounded-full transition-all duration-200 active:scale-95 ${
              viewMode === 'focus'
                ? 'bg-pri-600 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Focus className="w-4 h-4" />
          </button>
        </div>

        {/* Map & Notebook buttons */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => setMindMapOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setNotebookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Notebook</span>
          </button>
        </div>

        {/* Analytics */}
        <button
          onClick={() => setAnalyticsOpen(true)}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        {/* Admin + DB Status */}
        {isAdmin && (
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Green DB status glow */}
            <div className="relative">
              <div
                className={`w-2 h-2 rounded-full absolute -left-1 -top-1 z-10 ${
                  dbStatus.status === 'connected'
                    ? 'bg-green-400 animate-pulse shadow-[0_0_6px_2px_rgba(74,222,128,0.6)]'
                    : dbStatus.status === 'checking'
                    ? 'bg-yellow-400 animate-pulse shadow-[0_0_6px_2px_rgba(250,204,21,0.4)]'
                    : dbStatus.status === 'error'
                    ? 'bg-red-400 shadow-[0_0_6px_2px_rgba(248,113,113,0.4)]'
                    : 'bg-gray-500'
                }`}
                title={
                  dbStatus.status === 'connected'
                    ? 'Database Connected'
                    : dbStatus.status === 'checking'
                    ? 'Checking Database...'
                    : dbStatus.status === 'error'
                    ? 'Database Error'
                    : 'Database: Unknown'
                }
              />
            </div>

            {/* Admin button */}
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-all duration-200 active:scale-95"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>

            {/* DB Test button */}
            <button
              onClick={handleDbTest}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 border border-border/30"
              title="Test Database Connection (Write + Read)"
            >
              <Database className="w-3 h-3" />
              <span className="hidden xl:inline">Test DB</span>
            </button>
          </div>
        )}

        {/* Search */}
        <div className="flex-1 max-w-xs mx-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800/50 pl-9 pr-3 py-1.5 rounded-full text-sm border border-transparent focus:border-pri-500 focus:outline-none transition-colors duration-200 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Login */}
        <button
          id="login-btn"
          onClick={handleLoginClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
        >
          {mounted && user.isLoggedIn ? (
            <>
              <div className="w-5 h-5 rounded-full bg-pri-600 flex items-center justify-center text-[9px] text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">{user.username}</span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Login</span>
            </>
          )}
        </button>

        {/* Login Popover */}
        {loginAnchorEl && (
          <LoginWidget
            anchorEl={loginAnchorEl}
            onClose={handleLoginClose}
          />
        )}

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* DB Test Results Dropdown */}
      {showDbTest && dbTestResult && (
        <div className="fixed z-[100] bg-card border border-border rounded-xl shadow-2xl p-4 w-80 animate-fadeIn"
          style={{
            top: 60,
            right: window.innerWidth > 1024 ? 320 : 16,
          }}>
          <div className="flex items-center justify-between mb-3">
            <span className="micro-label text-muted-foreground">Database Test Results</span>
            <button onClick={() => setShowDbTest(false)} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(dbTestResult).map(([key, value]) => {
              const isOk = value.startsWith('OK');
              return (
                <div key={key} className="flex items-start gap-2">
                  {isOk ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{key}</span>
                    <p className={`text-xs ${isOk ? 'text-green-400' : 'text-red-400'}`}>{value}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-border/30 text-[9px] text-muted-foreground text-center">
            Auto-refreshing every 30 seconds
          </div>
        </div>
      )}
    </header>
  );
}
