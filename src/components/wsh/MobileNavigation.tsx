'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Database,
  Focus,
  Grid3X3,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Network,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

interface MobileNavigationProps {
  onOpenWorkspace: () => void;
  onOpenActivity: () => void;
}

export default function MobileNavigation({ onOpenWorkspace, onOpenActivity }: MobileNavigationProps) {
  const {
    viewMode,
    setViewMode,
    setMindMapOpen,
    setNotebookOpen,
    setAnalyticsOpen,
    setSettingsOpen,
    setAdminPanelOpen,
    setDbViewerOpen,
    user,
  } = useWSHStore();
  const [toolsOpen, setToolsOpen] = useState(false);

  const isAdmin = user.role === 'admin' || user.role === 'super-admin';

  useEffect(() => {
    if (!toolsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setToolsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [toolsOpen]);

  if (!user.isLoggedIn) return null;

  const runTool = (action: () => void) => {
    action();
    setToolsOpen(false);
  };

  const dockButton = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[8px] font-black uppercase text-muted-foreground transition-colors active:bg-secondary active:text-foreground';
  const activeDockButton = `${dockButton} text-amber-300`;

  return (
    <>
      <nav
        className="wsh-mobile-dock xl:hidden"
        aria-label="Mobile workspace navigation"
      >
        <button onClick={onOpenWorkspace} className={dockButton} title="Workspace">
          <Menu className="h-5 w-5" />
          <span>Workspace</span>
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={viewMode === 'grid' ? activeDockButton : dockButton}
          aria-pressed={viewMode === 'grid'}
          title="Grid view"
        >
          <Grid3X3 className="h-5 w-5" />
          <span>Grid</span>
        </button>
        <button
          onClick={() => setViewMode('dashboard')}
          className={viewMode === 'dashboard' ? activeDockButton : dockButton}
          aria-pressed={viewMode === 'dashboard'}
          title="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Stats</span>
        </button>
        <button
          onClick={() => setViewMode('focus')}
          className={viewMode === 'focus' ? activeDockButton : dockButton}
          aria-pressed={viewMode === 'focus'}
          title="Focus view"
        >
          <Focus className="h-5 w-5" />
          <span>Focus</span>
        </button>
        <button onClick={onOpenActivity} className={dockButton} title="Activity and tasks">
          <Activity className="h-5 w-5" />
          <span>Activity</span>
        </button>
        <button onClick={() => setToolsOpen(true)} className={dockButton} title="More tools">
          <MoreHorizontal className="h-5 w-5" />
          <span>Tools</span>
        </button>
      </nav>

      {toolsOpen && (
        <div className="fixed inset-0 z-[120] flex items-end xl:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setToolsOpen(false)}
            aria-label="Close mobile tools"
          />
          <section className="relative z-10 w-full border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Workspace Tools</h2>
              <button
                onClick={() => setToolsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary active:text-foreground"
                aria-label="Close tools"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => runTool(() => setMindMapOpen(true))} className="wsh-mobile-tool-button">
                <Network className="h-5 w-5 text-cyan-400" />
                Mind Map
              </button>
              <button onClick={() => runTool(() => setNotebookOpen(true))} className="wsh-mobile-tool-button">
                <BookOpen className="h-5 w-5 text-blue-400" />
                Notebook
              </button>
              <button onClick={() => runTool(() => setAnalyticsOpen(true))} className="wsh-mobile-tool-button">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                Analytics
              </button>
              <button onClick={() => runTool(() => setSettingsOpen(true))} className="wsh-mobile-tool-button">
                <Settings className="h-5 w-5 text-amber-300" />
                Settings
              </button>
              <button onClick={() => runTool(() => setDbViewerOpen(true))} className="wsh-mobile-tool-button">
                <Database className="h-5 w-5 text-violet-400" />
                Database
              </button>
              {isAdmin && (
                <button onClick={() => runTool(() => setAdminPanelOpen(true))} className="wsh-mobile-tool-button">
                  <Shield className="h-5 w-5 text-orange-400" />
                  Admin
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
