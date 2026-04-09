'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Copy,
  Trash2,
  Search,
  Tag,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  BookOpen,
  Star,
  StarOff,
  MoreHorizontal,
} from 'lucide-react';

export interface AiPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROMPT_STORAGE_KEY = 'wsh-prompt-library';
const DEFAULT_CATEGORIES = [
  'General',
  'Writing',
  'Code',
  'Analysis',
  'Creative',
  'Business',
  'Research',
  'Education',
];

const DEFAULT_PROMPTS: AiPrompt[] = [
  {
    id: 'prompt-default-1',
    title: 'Summarize Text',
    content: 'Please provide a concise summary of the following text, capturing the main points and key arguments. Use clear, professional language and organize the summary with bullet points for each major point:\n\n[INSERT TEXT HERE]',
    category: 'Writing',
    tags: ['summary', 'writing', 'productivity'],
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prompt-default-2',
    title: 'Code Review Assistant',
    content: 'Review the following code for potential bugs, performance issues, security vulnerabilities, and adherence to best practices. Provide specific suggestions for improvement with code examples:\n\n```[LANGUAGE]\n[INSERT CODE HERE]\n```',
    category: 'Code',
    tags: ['code-review', 'programming', 'quality'],
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prompt-default-3',
    title: 'SWOT Analysis',
    content: 'Perform a comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis for the following topic or business idea. Provide detailed, actionable insights for each quadrant:\n\nTopic: [INSERT TOPIC HERE]',
    category: 'Business',
    tags: ['analysis', 'business', 'strategy'],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prompt-default-4',
    title: 'Explain Like I\'m 5',
    content: 'Explain the following concept in simple terms that a 5-year-old could understand. Use analogies, everyday examples, and avoid technical jargon:\n\nConcept: [INSERT CONCEPT HERE]',
    category: 'Education',
    tags: ['education', 'explanation', 'simple'],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prompt-default-5',
    title: 'Blog Post Outline',
    content: 'Create a detailed blog post outline for the following topic. Include an engaging title, introduction hook, 5-7 main sections with sub-points, a conclusion with a call to action, and suggested meta description:\n\nTopic: [INSERT TOPIC HERE]\nTarget Audience: [INSERT AUDIENCE]',
    category: 'Writing',
    tags: ['blog', 'writing', 'content'],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', category: 'General', tags: '' });
  const [editPrompt, setEditPrompt] = useState({ title: '', content: '', category: '', tags: '' });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha' | 'updated'>('newest');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const editContentRef = useRef<HTMLTextAreaElement>(null);

  // Load prompts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPrompts(data);
      } catch {
        setPrompts(DEFAULT_PROMPTS);
      }
    } else {
      setPrompts(DEFAULT_PROMPTS);
    }
  }, []);

  // Save to localStorage whenever prompts change
  const savePrompts = useCallback((updatedPrompts: AiPrompt[]) => {
    setPrompts(updatedPrompts);
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(updatedPrompts));
  }, []);

  const handleCopy = useCallback(async (prompt: AiPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = prompt.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const handleCreate = useCallback(() => {
    if (!newPrompt.title.trim() || !newPrompt.content.trim()) return;
    const prompt: AiPrompt = {
      id: `prompt-${Date.now()}`,
      title: newPrompt.title.trim(),
      content: newPrompt.content.trim(),
      category: newPrompt.category,
      tags: newPrompt.tags.split(',').map((t) => t.trim()).filter(Boolean),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePrompts([prompt, ...prompts]);
    setNewPrompt({ title: '', content: '', category: 'General', tags: '' });
    setIsCreating(false);
  }, [newPrompt, prompts, savePrompts]);

  const handleDelete = useCallback((id: string) => {
    savePrompts(prompts.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }, [prompts, expandedId, savePrompts]);

  const handleToggleFavorite = useCallback((id: string) => {
    savePrompts(prompts.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite, updatedAt: new Date().toISOString() } : p
    ));
  }, [prompts, savePrompts]);

  const handleStartEdit = useCallback((prompt: AiPrompt) => {
    setEditingId(prompt.id);
    setEditPrompt({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags.join(', '),
    });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editPrompt.title.trim() || !editPrompt.content.trim()) return;
    savePrompts(prompts.map((p) =>
      p.id === editingId
        ? {
            ...p,
            title: editPrompt.title.trim(),
            content: editPrompt.content.trim(),
            category: editPrompt.category,
            tags: editPrompt.tags.split(',').map((t) => t.trim()).filter(Boolean),
            updatedAt: new Date().toISOString(),
          }
        : p
    ));
    setEditingId(null);
    setEditPrompt({ title: '', content: '', category: '', tags: '' });
  }, [editingId, editPrompt, prompts, savePrompts]);

  const filteredPrompts = useMemo(() => {
    let result = [...prompts];

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Filter favorites
    if (showFavoritesOnly) {
      result = result.filter((p) => p.isFavorite);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'alpha':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'updated':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return result;
  }, [prompts, searchQuery, selectedCategory, showFavoritesOnly, sortBy]);

  const categories = useMemo(() => {
    const cats = new Set(prompts.map((p) => p.category));
    return ['All', ...DEFAULT_CATEGORIES.filter((c) => cats.has(c)), ...Array.from(cats).filter((c) => !DEFAULT_CATEGORIES.includes(c))];
  }, [prompts]);

  const categoryColors: Record<string, string> = {
    General: 'bg-slate-500/15 text-slate-400 border-slate-400/20',
    Writing: 'bg-green-500/15 text-green-400 border-green-400/20',
    Code: 'bg-orange-500/15 text-orange-400 border-orange-400/20',
    Analysis: 'bg-purple-500/15 text-purple-400 border-purple-400/20',
    Creative: 'bg-pink-500/15 text-pink-400 border-pink-400/20',
    Business: 'bg-amber-500/15 text-amber-400 border-amber-400/20',
    Research: 'bg-cyan-500/15 text-cyan-400 border-cyan-400/20',
    Education: 'bg-blue-500/15 text-blue-400 border-blue-400/20',
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl shadow-2xl ring-4 ring-black/5 overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pri-400" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">AI Prompt Library</h2>
          <span className="text-[9px] font-bold bg-pri-500/15 text-pri-400 px-2 py-0.5 rounded-full">
            {prompts.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-1.5 rounded-lg transition-all active:scale-95 ${
              showFavoritesOnly ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={showFavoritesOnly ? 'Show All' : 'Favorites Only'}
          >
            {showFavoritesOnly ? <Star className="w-3.5 h-3.5" /> : <StarOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
            title="New Prompt"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Create New Prompt Form */}
      {isCreating && (
        <div className="p-3 border-b border-border/50 bg-secondary/10 animate-fadeIn">
          <div className="space-y-2">
            <input
              type="text"
              value={newPrompt.title}
              onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
              placeholder="Prompt title..."
              className="w-full bg-secondary/30 px-3 py-2 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-pri-500/30 border border-transparent focus:border-pri-500/30"
            />
            <textarea
              ref={contentRef}
              value={newPrompt.content}
              onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
              placeholder="Enter your prompt template... Use [INSERT TEXT HERE] for placeholders."
              rows={4}
              className="w-full bg-secondary/30 px-3 py-2 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-pri-500/30 border border-transparent focus:border-pri-500/30 resize-y"
            />
            <div className="flex gap-2">
              <select
                value={newPrompt.category}
                onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                className="bg-secondary/30 px-2 py-1.5 rounded-lg text-[10px] text-muted-foreground focus:outline-none cursor-pointer border border-border/30"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                value={newPrompt.tags}
                onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                placeholder="Tags (comma separated)..."
                className="flex-1 bg-secondary/30 px-3 py-1.5 rounded-lg text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none border border-transparent focus:border-pri-500/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newPrompt.title.trim() || !newPrompt.content.trim()}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> Save Prompt
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewPrompt({ title: '', content: '', category: 'General', tags: '' }); }}
                className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-3 border-b border-border/30 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full bg-secondary/30 pl-8 pr-3 py-1.5 rounded-full text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-pri-500/30 border border-transparent focus:border-pri-500/30"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-pri-600 text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground">{filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent text-[9px] text-muted-foreground cursor-pointer focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="alpha">A-Z</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Prompt List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <BookOpen className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-xs font-medium">No prompts found</p>
            <p className="text-[10px] mt-1">
              {searchQuery || selectedCategory !== 'All' || showFavoritesOnly
                ? 'Try adjusting your filters'
                : 'Click + to create your first prompt'}
            </p>
          </div>
        ) : (
          filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`bg-secondary/20 rounded-xl border transition-all duration-200 ${
                expandedId === prompt.id
                  ? 'border-pri-500/30 shadow-lg'
                  : 'border-border/30 hover:border-border/60'
              }`}
            >
              {/* Prompt Header */}
              <div
                className="flex items-start gap-2 p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(prompt.id); }}
                  className="mt-0.5 shrink-0 transition-transform active:scale-75"
                >
                  {prompt.isFavorite ? (
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ) : (
                    <Star className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-amber-400 transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{prompt.title}</span>
                    {prompt.isFavorite && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold shrink-0">
                        Favorite
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border ${categoryColors[prompt.category] || 'bg-slate-500/15 text-slate-400 border-slate-400/20'}`}>
                      {prompt.category}
                    </span>
                    {prompt.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[8px] text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                </div>
                {expandedId === prompt.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
              </div>

              {/* Expanded Content */}
              {expandedId === prompt.id && (
                <div className="px-3 pb-3 animate-fadeIn">
                  {/* Editing mode */}
                  {editingId === prompt.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editPrompt.title}
                        onChange={(e) => setEditPrompt({ ...editPrompt, title: e.target.value })}
                        className="w-full bg-secondary/30 px-3 py-2 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-pri-500/30 border border-pri-500/30"
                      />
                      <textarea
                        ref={editContentRef}
                        value={editPrompt.content}
                        onChange={(e) => setEditPrompt({ ...editPrompt, content: e.target.value })}
                        rows={6}
                        className="w-full bg-secondary/30 px-3 py-2 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-pri-500/30 border border-pri-500/30 resize-y font-mono"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editPrompt.category}
                          onChange={(e) => setEditPrompt({ ...editPrompt, category: e.target.value })}
                          className="bg-secondary/30 px-2 py-1.5 rounded-lg text-[10px] text-muted-foreground focus:outline-none cursor-pointer border border-border/30"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editPrompt.tags}
                          onChange={(e) => setEditPrompt({ ...editPrompt, tags: e.target.value })}
                          placeholder="Tags (comma separated)..."
                          className="flex-1 bg-secondary/30 px-3 py-1.5 rounded-lg text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none border border-pri-500/30"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditPrompt({ title: '', content: '', category: '', tags: '' }); }}
                          className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Content display */}
                      <pre className="bg-slate-950/50 dark:bg-slate-900/50 rounded-xl p-3 text-xs text-foreground/80 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-64 overflow-y-auto border border-border/20">
                        {prompt.content}
                      </pre>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          onClick={() => handleCopy(prompt)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                            copiedId === prompt.id
                              ? 'bg-green-500/15 text-green-400'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {copiedId === prompt.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedId === prompt.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleStartEdit(prompt)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(prompt.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <span className="ml-auto text-[8px] text-muted-foreground/40">
                          {new Date(prompt.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/30 bg-secondary/10">
        <p className="text-[9px] text-muted-foreground/40 text-center">
          Prompts stored locally in your browser. {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} saved.
        </p>
      </div>
    </div>
  );
}
