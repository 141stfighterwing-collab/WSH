'use client';

import { useState, useCallback, useSyncExternalStore, useEffect, useRef } from 'react';
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
  FlaskConical,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import Logo from './Logo';
import LoginWidget from './LoginWidget';
import { useWSHStore } from '@/store/wshStore';

interface DBStatus {
  connected: boolean;
  latencyMs: number;
  lastChecked: string;
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
    setPromptLibraryOpen,
    searchQuery,
    setSearchQuery,
    user,
  } = useWSHStore();

  const [loginAnchorEl, setLoginAnchorEl] = useState<HTMLElement | null>(null);
  const [dbStatus, setDbStatus] = useState<DBStatus>({
    connected: false,
    latencyMs: -1,
    lastChecked: '',
  });
  const [dbTestResult, setDbTestResult] = useState<{
    status: 'idle' | 'testing' | 'pass' | 'fail';
    message: string;
  }>({ status: 'idle', message: '' });
  const dbTestTooltipRef = useRef<HTMLDivElement>(null);

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

  const isAdmin = mounted && user.isLoggedIn && (user.role === 'admin' || user.role === 'super-admin');

  // Poll DB health every 30 seconds
  useEffect(() => {
    const checkDB = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setDbStatus({
          connected: data.database?.status === 'connected' || data.database?.status === 'connected_no_tables',
          latencyMs: data.database?.latencyMs ?? -1,
          lastChecked: new Date().toISOString(),
        });
      } catch {
        setDbStatus((prev) => ({
          ...prev,
          connected: false,
          lastChecked: new Date().toISOString(),
        }));
      }
    };

    checkDB();
    const interval = setInterval(checkDB, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close db test tooltip on outside click
  useEffect(() => {
    if (dbTestResult.status === 'idle') return;
    const handleClick = (e: MouseEvent) => {
      if (dbTestTooltipRef.current && !dbTestTooltipRef.current.contains(e.target as Node)) {
        setDbTestResult({ status: 'idle', message: '' });
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dbTestResult.status]);

  const handleDBTest = async () => {
    setDbTestResult({ status: 'testing', message: 'Running read/write test...' });
    try {
      const res = await fetch('/api/db-test', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') {
        setDbTestResult({
          status: 'pass',
          message: `✓ ${data.results.overall} (${data.results.count})`,
        });
      } else {
        setDbTestResult({
          status: 'fail',
          message: `✗ ${data.results.overall}`,
        });
      }
    } catch {
      setDbTestResult({
        status: 'fail',
        message: '✗ Could not reach server',
      });
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

        {/* Map, Notebook, Prompts, Analytics */}
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
          <button
            onClick={() => setPromptLibraryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prompts</span>
          </button>
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* DB Connection Indicator — visible for ALL logged-in users */}
        {mounted && user.isLoggedIn && (
          <div className="flex items-center gap-2">
            <div className="relative group">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  dbStatus.connected
                    ? 'bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5),0_0_12px_4px_rgba(74,222,128,0.2)]'
                    : 'bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.5)]'
                }`}
              />
              {dbStatus.connected && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-30" />
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-card border border-border shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[200]">
                <div className="flex items-center gap-2">
                  {dbStatus.connected ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] font-bold text-green-400">DB Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] font-bold text-red-400">DB Disconnected</span>
                    </>
                  )}
                  {dbStatus.latencyMs >= 0 && (
                    <span className="text-[9px] text-muted-foreground">{dbStatus.latencyMs}ms</span>
                  )}
                </div>
                <div className="text-[8px] text-muted-foreground/60 mt-0.5">
                  {dbStatus.lastChecked ? `Checked ${new Date(dbStatus.lastChecked).toLocaleTimeString()}` : ''}
                </div>
              </div>
            </div>

            {/* DB Test Button — all logged-in users */}
            {mounted && user.isLoggedIn && (
              <div className="relative" ref={dbTestTooltipRef}>
                <button
                  onClick={handleDBTest}
                  disabled={dbTestResult.status === 'testing'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
                  title="Test Database Read/Write"
                >
                  {dbTestResult.status === 'testing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FlaskConical className="w-3.5 h-3.5" />
                  )}
                  <span>DB Test</span>
                </button>

                {/* Test Result Tooltip */}
                {dbTestResult.status !== 'idle' && (
                  <div className="absolute top-full right-0 mt-2 w-72 px-3 py-2 rounded-xl bg-card border border-border shadow-xl z-[200] animate-fadeIn">
                    <div className="flex items-start gap-2">
                      {dbTestResult.status === 'testing' && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin mt-0.5 shrink-0" />}
                      {dbTestResult.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />}
                      {dbTestResult.status === 'fail' && <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
                      <span className={`text-xs font-semibold break-all ${dbTestResult.status === 'pass' ? 'text-green-400' : dbTestResult.status === 'fail' ? 'text-red-400' : 'text-cyan-400'}`}>
                        {dbTestResult.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin Button */}
            {isAdmin && (
              <button
                onClick={() => setAdminPanelOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-all duration-200 active:scale-95"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
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
              <span className="hidden sm:inline">Login / Sign Up</span>
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
    </header>
  );
}
