'use client';

import { useState } from 'react';
import {
  X,
  Palette,
  Shield,
  Cpu,
  Activity,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import { useWSHStore, type ThemeName } from '@/store/wshStore';

const themes: { name: ThemeName; label: string; colors: string }[] = [
  { name: 'default', label: 'Indigo', colors: '#6366F1' },
  { name: 'ocean', label: 'Ocean', colors: '#06B6D4' },
  { name: 'forest', label: 'Forest', colors: '#10B981' },
  { name: 'sunset', label: 'Sunset', colors: '#F97316' },
  { name: 'rose', label: 'Rose', colors: '#F43F5E' },
  { name: 'midnight', label: 'Midnight', colors: '#7C3AED' },
  { name: 'coffee', label: 'Coffee', colors: '#B45309' },
  { name: 'neon', label: 'Neon', colors: '#22C55E' },
  { name: 'cyberpunk', label: 'Cyber', colors: '#D946EF' },
  { name: 'nord', label: 'Nord', colors: '#81A1C1' },
  { name: 'dracula', label: 'Dracula', colors: '#BD93F9' },
  { name: 'lavender', label: 'Lavender', colors: '#A855F7' },
  { name: 'earth', label: 'Earth', colors: '#EAB308' },
  { name: 'yellow', label: 'Yellow', colors: '#F59E0B' },
  { name: 'hyperblue', label: 'Hyper', colors: '#3B82F6' },
];

type SettingsTab = 'visuals' | 'security' | 'ai' | 'diagnostics';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'visuals', label: 'Visuals', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'ai', label: 'AI Engine', icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <Activity className="w-3.5 h-3.5" /> },
];

export default function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, theme, setTheme, darkMode, toggleDarkMode, saveToLocalStorage } = useWSHStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('visuals');

  if (!settingsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[90] animate-fadeIn"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-[100] flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="micro-label text-muted-foreground">⚙️ Settings</span>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-pri-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'visuals' && (
            <>
              {/* Dark Mode */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Appearance</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => !darkMode && toggleDarkMode()}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
                      darkMode
                        ? 'bg-pri-600/15 border-pri-500/30 text-pri-400'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-xs font-semibold">Dark</span>
                  </button>
                  <button
                    onClick={() => darkMode && toggleDarkMode()}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
                      !darkMode
                        ? 'bg-pri-600/15 border-pri-500/30 text-pri-400'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span className="text-xs font-semibold">Light</span>
                  </button>
                </div>
              </div>

              {/* Themes */}
              <div className="space-y-2">
                <span className="micro-label text-muted-foreground">Theme</span>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        setTheme(t.name);
                        saveToLocalStorage();
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 ${
                        theme === t.name
                          ? 'bg-pri-600/15 border-pri-500/30'
                          : 'border-border/50 hover:bg-secondary'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: t.colors }}
                      />
                      <span className="text-[10px] font-semibold text-foreground truncate">{t.label}</span>
                      {theme === t.name && <Check className="w-3 h-3 text-pri-400 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <span className="micro-label text-muted-foreground">Security Settings</span>
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground">
                  Self-hosted mode uses local storage. All data stays on your device.
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                <div>
                  <p className="text-xs font-semibold text-foreground">Auto-save</p>
                  <p className="text-[10px] text-muted-foreground">Automatically save notes</p>
                </div>
                <div className="w-8 h-4 bg-pri-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                <div>
                  <p className="text-xs font-semibold text-foreground">Encryption</p>
                  <p className="text-[10px] text-muted-foreground">Encrypt local data</p>
                </div>
                <div className="w-8 h-4 bg-secondary rounded-full relative cursor-pointer">
                  <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-muted-foreground/50 rounded-full" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-3">
              <span className="micro-label text-muted-foreground">AI Engine Configuration</span>
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
                <p className="text-xs font-semibold text-foreground mb-1">Synthesis Engine</p>
                <p className="text-[10px] text-muted-foreground">
                  AI-powered note synthesis and analysis. Processes your notes to extract insights.
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                <div>
                  <p className="text-xs font-semibold text-foreground">Model</p>
                  <p className="text-[10px] text-muted-foreground">GPT-4o Mini</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                <div>
                  <p className="text-xs font-semibold text-foreground">Temperature</p>
                  <p className="text-[10px] text-muted-foreground">Creativity level</p>
                </div>
                <span className="text-xs font-mono text-pri-400">0.7</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                <div>
                  <p className="text-xs font-semibold text-foreground">Max Tokens</p>
                  <p className="text-[10px] text-muted-foreground">Response length limit</p>
                </div>
                <span className="text-xs font-mono text-pri-400">4096</span>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <span className="micro-label text-muted-foreground">System Diagnostics</span>
              <div className="space-y-2">
                {[
                  { label: 'Storage Used', value: '2.4 MB', status: 'good' },
                  { label: 'Notes Count', value: '47', status: 'good' },
                  { label: 'Sync Status', value: 'Local Only', status: 'warn' },
                  { label: 'Last Backup', value: 'Never', status: 'warn' },
                  { label: 'Uptime', value: '3h 42m', status: 'good' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30"
                  >
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-foreground">{item.value}</span>
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'good' ? 'bg-green-400' : 'bg-yellow-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
