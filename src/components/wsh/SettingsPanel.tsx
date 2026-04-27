'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  AlertCircle,
  ChevronDown,
  KeyRound,
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

interface ProviderInfo {
  id: AIProvider;
  label: string;
  description: string;
  envKey: string;
}

const PROVIDER_INFO: ProviderInfo[] = [
  { id: 'claude', label: 'Claude', description: 'Anthropic Claude — strong reasoning, safety-focused', envKey: 'ANTHROPIC_API_KEY' },
  { id: 'openai', label: 'OpenAI', description: 'GPT models — versatile, widely used', envKey: 'OPENAI_API_KEY' },
  { id: 'gemini', label: 'Gemini', description: 'Google Gemini — fast, multimodal', envKey: 'GEMINI_API_KEY' },
];

/** Client-side key format validation patterns */
const KEY_VALIDATORS: Record<string, { test: (key: string) => boolean; hint: string }> = {
  ANTHROPIC_API_KEY: {
    test: (k) => /^sk-ant-api03-[A-Za-z0-9_-]{80,}$/.test(k),
    hint: 'Format: sk-ant-api03-... (95+ chars)',
  },
  OPENAI_API_KEY: {
    test: (k) => /^sk-[A-Za-z0-9_-]{20,}$/.test(k),
    hint: 'Format: sk-... (48+ chars)',
  },
  GEMINI_API_KEY: {
    test: (k) => /^AIzaSy[A-Za-z0-9_-]{33}$/.test(k),
    hint: 'Format: AIzaSy... (39 chars)',
  },
};

export default function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, theme, setTheme, darkMode, toggleDarkMode, saveToLocalStorage, notes, folders } = useWSHStore();

  // Derive unique tags from all notes
  const uniqueTagCount = useMemo(() => new Set(notes.flatMap((n) => n.tags)).size, [notes]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('visuals');

  // ── AI State (localStorage-backed) ────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<AIProvider | ''>('');
  const [aiModel, setAiModel] = useState('');
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [aiKeySaving, setAiKeySaving] = useState(false);
  const [aiKeyMessage, setAiKeyMessage] = useState('');
  const [aiKeyError, setAiKeyError] = useState('');
  const [serverModels, setServerModels] = useState<Record<string, { id: string; label: string }[]>>({});
  const [serverAiStatus, setServerAiStatus] = useState<{
    available: Record<string, boolean>;
    configured: string[];
    provider: string;
  } | null>(null);

  /** Fetch server AI status (availability + model catalog) */
  const fetchAiStatus = useCallback(async () => {
    try {
      const token = useWSHStore.getState().user.token;
      const res = await fetch('/api/synthesis', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.available) return;

      setServerAiStatus({
        available: data.available,
        configured: data.configured || [],
        provider: data.provider || '',
      });

      // Store server model catalog
      if (data.models) {
        setServerModels(data.models);
      }

      // Auto-detect provider/model from server if not stored locally
      const stored = localStorage.getItem('wsh-ai-settings');
      const parsed = stored ? JSON.parse(stored) : {};
      if (!parsed.provider && data.provider) {
        const newProvider = data.provider as AIProvider;
        setAiProvider(newProvider);
        const serverModelsList = data.models?.[newProvider];
        const defaultModel = serverModelsList?.[0]?.id || '';
        if (defaultModel) {
          setAiModel(defaultModel);
          localStorage.setItem('wsh-ai-settings', JSON.stringify({ provider: newProvider, model: defaultModel }));
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Load AI settings from localStorage + fetch server status on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wsh-ai-settings');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.provider) setAiProvider(data.provider);
        if (data.model) setAiModel(data.model);
      }
    } catch { /* ignore */ }

    fetchAiStatus();
  }, [fetchAiStatus]);

  // Save AI settings to localStorage on change
  const saveAiSettings = useCallback((provider: AIProvider | '', model: string) => {
    setAiProvider(provider);
    setAiModel(model);
    localStorage.setItem('wsh-ai-settings', JSON.stringify({ provider, model }));
  }, []);

  // Derived state
  const selectedProviderInfo = PROVIDER_INFO.find((p) => p.id === aiProvider);
  const providerEnvKey = selectedProviderInfo?.envKey || '';
  const availableModels = serverModels[aiProvider || ''] || [];
  const hasAnyProvider = serverAiStatus && serverAiStatus.configured && serverAiStatus.configured.length > 0;
  const isProviderAvailable = aiProvider && serverAiStatus?.available[aiProvider];

  /** Validate API key format (client-side) */
  const validateKeyFormat = useCallback((key: string, envKey: string): string => {
    const trimmed = key.trim();
    if (!trimmed) return '';
    const validator = KEY_VALIDATORS[envKey];
    if (!validator) return ''; // Unknown key type — allow pass-through
    if (!validator.test(trimmed)) {
      return `Invalid key format. ${validator.hint}`;
    }
    return ''; // Valid
  }, []);

  const handleSaveApiKey = async () => {
    if (!providerEnvKey || !aiKeyInput.trim()) return;

    // Validate key format before sending to server
    const validationError = validateKeyFormat(aiKeyInput, providerEnvKey);
    if (validationError) {
      setAiKeyError(validationError);
      return;
    }

    setAiKeySaving(true);
    setAiKeyMessage('');
    setAiKeyError('');
    try {
      const token = useWSHStore.getState().user.token;
      const res = await fetch('/api/admin/env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ key: providerEnvKey, value: aiKeyInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.persisted === false) {
          setAiKeyMessage('Key active now but DISK SAVE FAILED — key will be lost on restart. Run: docker compose down -v && docker compose up -d');
        } else {
          setAiKeyMessage('API key saved — active now and persists across restarts');
        }
        setAiKeyInput('');

        // Refresh server AI status to get updated model lists
        await fetchAiStatus();

        // Auto-switch to this provider if not already selected
        if (aiProvider !== selectedProviderInfo?.id) {
          saveAiSettings(selectedProviderInfo!.id, availableModels[0]?.id || '');
        } else if (availableModels.length > 0 && !availableModels.some((m) => m.id === aiModel)) {
          // Current model isn't in the available list — reset to first
          saveAiSettings(aiProvider, availableModels[0]?.id || '');
        }
      } else {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        setAiKeyError(`Error: ${err.error}`);
      }
    } catch {
      setAiKeyError('Save failed — check server connection');
    }
    setAiKeySaving(false);
    setTimeout(() => { setAiKeyMessage(''); setAiKeyError(''); }, 8000);
  };

  /** Real-time key validation feedback while typing */
  const keyValidationHint = useMemo(() => {
    if (!aiKeyInput.trim() || !providerEnvKey) return '';
    const validator = KEY_VALIDATORS[providerEnvKey];
    if (!validator) return '';
    if (validator.test(aiKeyInput.trim())) return '';
    return validator.hint;
  }, [aiKeyInput, providerEnvKey]);

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
                    onClick={() => { if (!darkMode) { toggleDarkMode(); saveToLocalStorage(); } }}
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
                    onClick={() => { if (darkMode) { toggleDarkMode(); saveToLocalStorage(); } }}
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
                    ? `Configured: ${serverAiStatus?.configured.map((c) => PROVIDER_INFO.find((p) => p.id === c)?.label).join(', ')}. Select a provider and model below.`
                    : 'No AI provider configured. Enter an API key below to get started.'}
                </p>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-300 leading-relaxed">
                  Enter your API key below. The key is validated, saved to the server environment, and persists across restarts. Once saved, select a model from the dropdown.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Provider</p>
                <div className="space-y-1">
                  {PROVIDER_INFO.map((provider) => {
                    const isAvailable = serverAiStatus?.available[provider.id] || false;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => {
                          if (isAvailable) {
                            const models = serverModels[provider.id] || [];
                            const defaultModel = models[0]?.id || '';
                            saveAiSettings(provider.id, defaultModel);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all active:scale-95 ${
                          !isAvailable
                            ? 'border-border/30 hover:bg-secondary/30'
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

              {/* API Key Input */}
              {aiProvider && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">
                      API Key
                    </p>
                    <span className="text-[9px] font-mono text-muted-foreground ml-auto">{providerEnvKey}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={aiKeyInput}
                      onChange={(e) => {
                        setAiKeyInput(e.target.value);
                        setAiKeyError('');
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveApiKey(); }}
                      placeholder={isProviderAvailable ? 'Enter new key to replace...' : 'Paste your API key here...'}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground placeholder:text-muted-foreground/40"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={aiKeySaving || !aiKeyInput.trim()}
                      className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {aiKeySaving ? 'Saving...' : 'Save Key'}
                    </button>
                  </div>

                  {/* Real-time format hint while typing */}
                  {keyValidationHint && aiKeyInput.trim() && (
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-amber-400">{keyValidationHint}</p>
                    </div>
                  )}

                  {/* Success/Error messages */}
                  {aiKeyError && (
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-red-400 animate-fadeIn">{aiKeyError}</p>
                    </div>
                  )}
                  {aiKeyMessage && (
                    <div className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-green-400 animate-fadeIn">{aiKeyMessage}</p>
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground/60">
                    Saved keys persist across container restarts via a Docker volume. Keys are validated for format before saving.
                  </p>
                </div>
              )}

              {/* Model Selection Dropdown */}
              {aiProvider && isProviderAvailable && availableModels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Model</p>
                  <div className="relative">
                    <select
                      value={aiModel}
                      onChange={(e) => saveAiSettings(aiProvider, e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 pr-8 rounded-lg text-xs font-mono bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground cursor-pointer"
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60">
                    Selected model: <span className="font-mono text-pri-400">{aiModel}</span>
                  </p>
                </div>
              )}

              {/* No models available hint */}
              {aiProvider && !isProviderAvailable && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300 leading-relaxed">
                    Save a <span className="font-bold">{providerEnvKey}</span> above to unlock the model selector for {PROVIDER_INFO.find((p) => p.id === aiProvider)?.label}.
                  </p>
                </div>
              )}

              {/* Current Config Summary */}
              {aiProvider && aiModel && isProviderAvailable && (
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/30">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Active Configuration</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Provider</span>
                    <span className="text-[10px] font-semibold text-foreground">{PROVIDER_INFO.find((p) => p.id === aiProvider)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Model</span>
                    <span className="text-[10px] font-mono text-pri-400">{aiModel}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Key Status</span>
                    <span className="text-[10px] font-semibold text-green-400">Configured</span>
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
                  { label: 'Tags', value: String(uniqueTagCount), status: 'good' as const },
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
