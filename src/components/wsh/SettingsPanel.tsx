'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Palette,
  Shield,
  Cpu,
  Activity,
  Sun,
  Moon,
  Check,
  Info,
  Zap,
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

// ── AI Provider Config ────────────────────────────────────────────────────
type AIProvider = 'claude' | 'openai' | 'gemini';

interface ProviderConfig {
  id: AIProvider;
  label: string;
  description: string;
  models: { id: string; label: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'claude',
    label: 'Claude',
    description: 'Anthropic Claude — strong reasoning, safety-focused',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250414', label: 'Claude Haiku 4' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT models — versatile, widely used',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini — fast, multimodal',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
  },
];

export default function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, theme, setTheme, darkMode, toggleDarkMode, saveToLocalStorage, notes, folders, tags } = useWSHStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('visuals');

  // ── AI State (localStorage-backed) ────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<AIProvider | ''>('');
  const [aiModel, setAiModel] = useState('');
  const [serverAiStatus, setServerAiStatus] = useState<{
    available: Record<string, boolean>;
    configured: string[];
    provider: string;
  } | null>(null);

  // Load AI settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wsh-ai-settings');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.provider) setAiProvider(data.provider);
        if (data.model) setAiModel(data.model);
      }
    } catch { /* ignore */ }

    // Fetch server-side AI availability
    fetch('/api/synthesis')
      .then((r) => r.json())
      .then((data) => {
        setServerAiStatus({ available: data.available, configured: data.configured, provider: data.provider });
        // Auto-detect provider if not stored
        const stored2 = localStorage.getItem('wsh-ai-settings');
        if (stored2) {
          const parsed = JSON.parse(stored2);
          if (!parsed.provider && data.provider) {
            setAiProvider(data.provider as AIProvider);
            const defaultModel = PROVIDERS.find((p) => p.id === data.provider)?.models[0]?.id;
            if (defaultModel) setAiModel(defaultModel);
          }
        } else if (data.provider) {
          setAiProvider(data.provider as AIProvider);
          const defaultModel = PROVIDERS.find((p) => p.id === data.provider)?.models[0]?.id;
          if (defaultModel) setAiModel(defaultModel);
        }
      })
      .catch(() => {});
  }, []);

  // Save AI settings to localStorage on change
  const saveAiSettings = useCallback((provider: AIProvider | '', model: string) => {
    setAiProvider(provider);
    setAiModel(model);
    localStorage.setItem('wsh-ai-settings', JSON.stringify({ provider, model }));
  }, []);

  const selectedProviderConfig = PROVIDERS.find((p) => p.id === aiProvider);
  const availableModels = selectedProviderConfig?.models || [];
  const hasAnyProvider = serverAiStatus && serverAiStatus.configured.length > 0;
  const isProviderAvailable = aiProvider && serverAiStatus?.available[aiProvider];

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
          <span className="micro-label text-muted-foreground">Settings</span>
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

          {/* ── AI ENGINE TAB ─────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <span className="micro-label text-muted-foreground">AI Engine Configuration</span>

              {/* Status */}
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-4 h-4 ${hasAnyProvider ? 'text-green-400' : 'text-red-400'}`} />
                  <p className="text-xs font-semibold text-foreground">
                    Synthesis Engine
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {hasAnyProvider
                    ? `Configured: ${serverAiStatus?.configured.map((c) => PROVIDERS.find((p) => p.id === c)?.label).join(', ')}. Select a provider and model below.`
                    : 'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in your environment variables.'}
                </p>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-300 leading-relaxed">
                  AI synthesis is only available when an API key is configured on the server. The provider and model selected here are sent with each synthesis request.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Provider</p>
                <div className="space-y-1">
                  {PROVIDERS.map((provider) => {
                    const isAvailable = serverAiStatus?.available[provider.id] || false;
                    return (
                      <button
                        key={provider.id}
                        disabled={!isAvailable}
                        onClick={() => {
                          if (isAvailable) {
                            const defaultModel = provider.models[0]?.id || '';
                            saveAiSettings(provider.id, defaultModel);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all active:scale-95 ${
                          !isAvailable
                            ? 'border-border/30 opacity-40 cursor-not-allowed'
                            : aiProvider === provider.id
                            ? 'bg-pri-600/15 border-pri-500/30'
                            : 'border-border/50 hover:bg-secondary cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-foreground">{provider.label}</span>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{provider.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAvailable ? (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">Available</span>
                            ) : (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">No Key</span>
                            )}
                            {aiProvider === provider.id && <Check className="w-3.5 h-3.5 text-pri-400" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Selection */}
              {aiProvider && isProviderAvailable && availableModels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Model</p>
                  <div className="space-y-1">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => saveAiSettings(aiProvider, model.id)}
                        className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg border transition-all active:scale-95 ${
                          aiModel === model.id
                            ? 'bg-pri-600/15 border-pri-500/30'
                            : 'border-border/50 hover:bg-secondary cursor-pointer'
                        }`}
                      >
                        <span className="text-[10px] font-medium text-foreground">{model.label}</span>
                        {aiModel === model.id && <Check className="w-3 h-3 text-pri-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Config Summary */}
              {aiProvider && aiModel && (
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/30">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Active Configuration</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Provider</span>
                    <span className="text-[10px] font-semibold text-foreground">{PROVIDERS.find((p) => p.id === aiProvider)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Model</span>
                    <span className="text-[10px] font-mono text-pri-400">{aiModel}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <span className="micro-label text-muted-foreground">System Diagnostics</span>
              <div className="space-y-2">
                {[
                  { label: 'Active Notes', value: String(notes.filter((n) => !n.isDeleted).length), status: 'good' as const },
                  { label: 'Folders', value: String(folders.length), status: 'good' as const },
                  { label: 'Tags', value: String(tags.length), status: 'good' as const },
                  { label: 'Theme', value: theme || 'default', status: 'good' as const },
                  { label: 'Mode', value: darkMode ? 'Dark' : 'Light', status: 'good' as const },
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
