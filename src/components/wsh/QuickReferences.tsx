'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Edit3,
  Zap,
  Trash2,
  Plus,
  BookmarkCheck,
  X,
  Save,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface QuickRef {
  id: string;
  name: string;
  description: string;
  content: string;
  type: string;
}

// ── Default templates ──────────────────────────────────────────
const DEFAULT_REFS: QuickRef[] = [
  {
    id: 'qr-daily-standup',
    name: 'Daily Standup',
    description: 'Quick daily update template',
    content: '## What I did yesterday\n\n## What I\'m doing today\n\n## Blockers',
    type: 'quick',
  },
  {
    id: 'qr-meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured meeting notes',
    content: '## Meeting: \n**Date:** \n**Attendees:** \n\n## Agenda\n\n## Notes\n\n## Action Items',
    type: 'notebook',
  },
  {
    id: 'qr-project-brief',
    name: 'Project Brief',
    description: 'New project outline',
    content: '## Project Name\n\n### Overview\n\n### Goals\n\n### Timeline\n\n### Resources',
    type: 'project',
  },
  {
    id: 'qr-code-review',
    name: 'Code Review',
    description: 'Code review checklist',
    content: '## Code Review\n\n### File: \n\n### Changes:\n\n### Notes:\n\n### Approval:',
    type: 'code',
  },
];

// ── LocalStorage key ───────────────────────────────────────────
const STORAGE_KEY = 'wsh-quick-references';

// ── Helper: generate unique ID with fallback ───────────────────
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback for non-secure contexts
    }
  }
  // Fallback: timestamp + random hex
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 10)
  );
}

// ── Helper: load from localStorage ─────────────────────────────
function loadRefs(): QuickRef[] {
  if (typeof window === 'undefined') return DEFAULT_REFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return DEFAULT_REFS;
}

// ── Helper: save to localStorage ───────────────────────────────
function saveRefs(refs: QuickRef[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
  } catch {
    // Ignore quota errors
  }
}

// ── Component ──────────────────────────────────────────────────
export default function QuickReferences() {
  const [refs, setRefs] = useState<QuickRef[]>(DEFAULT_REFS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editContent, setEditContent] = useState('');

  // ── Load refs from localStorage on mount ───────────────────
  useEffect(() => {
    setRefs(loadRefs());
  }, []);

  // ── Persist refs to localStorage whenever they change ─────
  useEffect(() => {
    if (refs !== DEFAULT_REFS) {
      saveRefs(refs);
    }
  }, [refs]);

  // ── Toggle expand ──────────────────────────────────────────
  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
      // Collapse any editing or delete confirmation when collapsing
      if (expandedId === id) {
        setEditingId(null);
        setDeleteConfirmId(null);
      }
    },
    [expandedId],
  );

  // ── Use a reference (copy content for use in note editor) ──
  const handleUse = useCallback(
    (e: React.MouseEvent, ref: QuickRef) => {
      e.stopPropagation();
      // Dispatch a custom event so the NoteEditor can pick it up
      window.dispatchEvent(
        new CustomEvent('wsh:use-quick-ref', { detail: ref }),
      );
      // Collapse after use
      setExpandedId(null);
      setEditingId(null);
      setDeleteConfirmId(null);
    },
    [],
  );

  // ── Start editing a reference ──────────────────────────────
  const handleEditStart = useCallback(
    (e: React.MouseEvent, ref: QuickRef) => {
      e.stopPropagation();
      setEditingId(ref.id);
      setEditName(ref.name);
      setEditDesc(ref.description);
      setEditContent(ref.content);
      setDeleteConfirmId(null);
    },
    [],
  );

  // ── Save edits ─────────────────────────────────────────────
  const handleEditSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editingId || !editName.trim()) return;
      setRefs((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: editName.trim(),
                description: editDesc.trim(),
                content: editContent,
              }
            : r,
        ),
      );
      setEditingId(null);
    },
    [editingId, editName, editDesc, editContent],
  );

  // ── Cancel edit ────────────────────────────────────────────
  const handleEditCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  }, []);

  // ── Request delete confirmation ────────────────────────────
  const handleDeleteRequest = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeleteConfirmId(id);
      setEditingId(null);
    },
    [],
  );

  // ── Confirm delete ─────────────────────────────────────────
  const handleDeleteConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!deleteConfirmId) return;
      setRefs((prev) => prev.filter((r) => r.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      setExpandedId(null);
    },
    [deleteConfirmId],
  );

  // ── Cancel delete ──────────────────────────────────────────
  const handleDeleteCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  }, []);

  // ── Add new reference ──────────────────────────────────────
  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newRef: QuickRef = {
      id: generateId(),
      name: 'New Reference',
      description: 'Click Edit to customize',
      content: '## New Reference\n\nStart writing here...',
      type: 'quick',
    };
    setRefs((prev) => [newRef, ...prev]);
    setExpandedId(newRef.id);
    setEditingId(newRef.id);
    setEditName(newRef.name);
    setEditDesc(newRef.description);
    setEditContent(newRef.content);
    setIsAdding(true);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">
          ⚡ Quick References
        </span>
        <button
          onClick={(e) => handleAdd(e)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all active:scale-95"
          title="Add new reference"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {refs.map((ref) => {
          const isExpanded = expandedId === ref.id;
          const isEditing = editingId === ref.id;
          const isConfirmingDelete = deleteConfirmId === ref.id;

          return (
            <div
              key={ref.id}
              className="bg-secondary/50 rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-pri-500/30"
            >
              {/* ── Header row ──────────────────────────────── */}
              <button
                onClick={() => toggleExpand(ref.id)}
                className="w-full flex items-center justify-between p-2.5 text-left transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-foreground">
                    {ref.name}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )}
              </button>

              {/* ── Expanded content ────────────────────────── */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5 animate-fadeIn">
                  {/* ── Edit mode ────────────────────────── */}
                  {isEditing ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500/50"
                        placeholder="Reference name"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500/50"
                        placeholder="Description"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500/50 resize-none font-mono"
                        placeholder="Template content (markdown)"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleEditSave}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                        >
                          <Save className="w-2.5 h-2.5" />
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-95"
                        >
                          <X className="w-2.5 h-2.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ── Description ──────────────────── */}
                      <p className="text-[11px] text-muted-foreground mb-2">
                        {ref.description}
                      </p>

                      {/* ── Delete confirmation bar ──────── */}
                      {isConfirmingDelete ? (
                        <div
                          className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-red-400 font-medium">
                            Delete &quot;{ref.name}&quot;?
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleDeleteConfirm}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={handleDeleteCancel}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Action buttons ──────────────── */
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleUse(e, ref)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 shadow-sm"
                          >
                            <Zap className="w-2.5 h-2.5" />
                            Use
                          </button>
                          <button
                            onClick={(e) => handleEditStart(e, ref)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-all active:scale-95"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteRequest(e, ref.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-95"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Empty state ──────────────────────────────────────── */}
      {refs.length === 0 && (
        <div className="text-center py-4 text-[11px] text-muted-foreground">
          <FileText className="w-4 h-4 mx-auto mb-1 opacity-40" />
          No references yet. Click &quot;+ Add&quot; to create one.
        </div>
      )}
    </div>
  );
}
