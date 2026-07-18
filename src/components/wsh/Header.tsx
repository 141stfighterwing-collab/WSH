'use client';

import { useState, useCallback, useSyncExternalStore, useEffect } from 'react';
import {
  Search,
  BarChart3,
  Settings,
  Grid3X3,
  Focus,
  LayoutDashboard,
  LogIn,
  Shield,
  Network,
  BookOpen,
  Database,
  Wifi,
  WifiOff,
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





  const viewButtonClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${
      active
        ? 'wsh-accent-button'
        : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
    }`;

  const navButtonClass =
    'flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all duration-200 hover:bg-accent/80 hover:text-foreground active:scale-95';

  return (
    <header className="sticky top-0 z-50 glass wsh-topbar">
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 gap-y-1 px-3 py-2 md:flex md:gap-3 md:px-4 md:py-0">
        {/* Logo */}
        <Logo size={38} showText={true} className="[&>div]:hidden sm:[&>div]:flex" />

        {/* View Toggles */}
        <div className="hidden items-center gap-1 rounded-lg border border-border/70 bg-secondary/45 p-1 xl:flex">
          <button
            onClick={() => setViewMode('grid')}
            className={viewButtonClass(viewMode === 'grid')}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden xl:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('dashboard')}
            className={viewButtonClass(viewMode === 'dashboard')}
            title="WSH Keeps Dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden xl:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setViewMode('focus')}
            className={viewButtonClass(viewMode === 'focus')}
            title="Focus view"
          >
            <Focus className="w-4 h-4" />
            <span className="hidden xl:inline">Focus</span>
          </button>
        </div>

        {/* Map, Notebook, Analytics */}
        <div className="hidden items-center gap-1 xl:flex">
          <button
            onClick={() => setMindMapOpen(true)}
            className={navButtonClass}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setNotebookOpen(true)}
            className={navButtonClass}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Notebook</span>
          </button>
          <button
            onClick={() => setAnalyticsOpen(true)}
            className={navButtonClass}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* DB Connection Indicator — visible for ALL logged-in users */}
        {mounted && user.isLoggedIn && (
          <div className="flex min-w-0 items-center justify-center gap-1 sm:gap-2">
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

            {/* Admin Button */}
            {isAdmin && (
              <button
                onClick={() => setAdminPanelOpen(true)}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2 text-[10px] font-black uppercase tracking-widest text-amber-300 transition-all duration-200 hover:bg-amber-400/20 active:scale-95 sm:px-3"
                aria-label="Open admin panel"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="col-span-3 row-start-2 w-full min-w-0 md:mx-2 md:flex-1 md:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-secondary/55 py-2 pl-9 pr-3 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground focus:border-amber-300/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1">
          {/* Login */}
          <button
            onClick={handleLoginClick}
            className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all duration-200 hover:bg-accent/80 hover:text-foreground active:scale-95 sm:px-3"
            aria-label={mounted && user.isLoggedIn ? `Account: ${user.username}` : 'Login or sign up'}
          >
            {mounted && user.isLoggedIn ? (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-[9px] font-bold text-slate-950">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user.username}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
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
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent/80 hover:text-foreground active:scale-95"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
