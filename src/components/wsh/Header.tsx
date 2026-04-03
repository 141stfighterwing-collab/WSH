'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import {
  Search,
  BarChart3,
  Settings,
  Grid3X3,
  Focus,
  LogIn,
} from 'lucide-react';
import Logo from './Logo';
import LoginWidget from './LoginWidget';
import { useWSHStore } from '@/store/wshStore';

export default function Header() {
  const {
    viewMode,
    setViewMode,
    setSettingsOpen,
    setAnalyticsOpen,
    searchQuery,
    setSearchQuery,
    user,
  } = useWSHStore();

  const [loginAnchorEl, setLoginAnchorEl] = useState<HTMLElement | null>(null);
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

        {/* Analytics */}
        <button
          onClick={() => setAnalyticsOpen(true)}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

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
    </header>
  );
}
