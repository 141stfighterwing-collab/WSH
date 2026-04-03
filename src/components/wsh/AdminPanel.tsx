'use client';

import { useState } from 'react';
import {
  X,
  Lock,
  FileCheck,
  Users,
  Cloud,
  ScrollText,
  ChevronDown,
  Database,
} from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';
import type { AdminSection } from './admin/types';
import EnvSettingsSection from './admin/EnvSettingsSection';
import VersioningSection from './admin/VersioningSection';
import UsersSection from './admin/UsersSection';
import CloudSetupSection from './admin/CloudSetupSection';
import LogsSection from './admin/LogsSection';
import DBViewerSection from './admin/DBViewerSection';

const menuItems: {
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
}[] = [
  {
    id: 'env',
    label: 'ENV Settings',
    icon: <Lock className="w-4 h-4" />,
    iconColor: 'text-amber-400',
  },
  {
    id: 'versioning',
    label: 'Versioning',
    icon: <FileCheck className="w-4 h-4" />,
    iconColor: 'text-orange-400',
  },
  {
    id: 'users',
    label: 'User Base',
    icon: <Users className="w-4 h-4" />,
    iconColor: 'text-purple-400',
  },
  {
    id: 'cloud',
    label: 'Cloud Setup',
    icon: <Cloud className="w-4 h-4" />,
    iconColor: 'text-slate-300',
  },
  {
    id: 'dbviewer',
    label: 'DB Viewer',
    icon: <Database className="w-4 h-4" />,
    iconColor: 'text-cyan-400',
  },
  {
    id: 'logs',
    label: 'System Logs',
    icon: <ScrollText className="w-4 h-4" />,
    iconColor: 'text-amber-400',
  },
];

export default function AdminPanel() {
  const { adminPanelOpen, setAdminPanelOpen, setDbViewerOpen } = useWSHStore();
  const [activeSection, setActiveSection] = useState<AdminSection>(null);

  const handleToggleSection = (section: AdminSection) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (!adminPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[90] animate-fadeIn"
        onClick={() => setAdminPanelOpen(false)}
      />

      {/* Panel - Slides in from LEFT */}
      <div className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-card border-r border-border shadow-2xl z-[100] flex flex-col animate-slideInLeft">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="micro-label text-muted-foreground">Administrator</span>
          <button
            onClick={() => setAdminPanelOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="border-b border-border">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleToggleSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-secondary ${
                activeSection === item.id
                  ? 'bg-pri-600/15 border-l-2 border-pri-500'
                  : 'border-l-2 border-transparent'
              }`}
            >
              <span className={item.iconColor}>{item.icon}</span>
              <span className="micro-label text-foreground flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                  activeSection === item.id ? 'rotate-180' : ''
                }`}
              />
            </button>
          ))}
        </div>

        {/* Sub-section Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'env' && <EnvSettingsSection />}
          {activeSection === 'versioning' && <VersioningSection />}
          {activeSection === 'users' && <UsersSection />}
          {activeSection === 'cloud' && <CloudSetupSection />}
          {activeSection === 'logs' && <LogsSection />}
          {activeSection === 'dbviewer' && (
            <>
              <DBViewerSection />
              <button
                onClick={() => { setDbViewerOpen(true); setAdminPanelOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all active:scale-95 mt-3"
              >
                <Database className="w-3 h-3" />
                Open Full-Screen DB Viewer
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
