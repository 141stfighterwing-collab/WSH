'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Tag, FolderOpen, Folder, FileText, Code, Briefcase, BookOpen, Brain, Plus, MoreVertical, Eye, Trash2, GripVertical } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

const typeIcons: Record<string, React.ReactNode> = {
  quick: <FileText className="w-3.5 h-3.5" />,
  notebook: <BookOpen className="w-3.5 h-3.5" />,
  deep: <Brain className="w-3.5 h-3.5" />,
  code: <Code className="w-3.5 h-3.5" />,
  project: <Briefcase className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
  'ai-prompts': <Brain className="w-3.5 h-3.5" />,
};

const typeDescriptions: Record<string, string> = {
  quick: 'Quick capture — short notes & ideas',
  notebook: 'Notebook — organized sections & chapters',
  deep: 'Deep dive — long-form analysis & research',
  code: 'Code — snippets, scripts & technical notes',
  project: 'Project — task tracking & milestones',
  document: 'Document — formal reports & deliverables',
  'ai-prompts': 'AI Prompts — saved prompt templates & snippets',
};

const typeColors: Record<string, string> = {
  quick: 'bg-blue-500/15 text-blue-400',
  notebook: 'bg-green-500/15 text-green-400',
  deep: 'bg-purple-500/15 text-purple-400',
  code: 'bg-orange-500/15 text-orange-400',
  project: 'bg-pink-500/15 text-pink-400',
  document: 'bg-cyan-500/15 text-cyan-400',
  'ai-prompts': 'bg-violet-500/15 text-violet-400',
};

function NoteCard({ note, onClick, onViewDetail, onDelete, onDragStart }: { note: Note; onClick: () => void; onViewDetail: () => void; onDelete: () => void; onDragStart: (e: React.DragEvent) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const date = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`bg-card rounded-2xl border p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-pri-500/20 transition-all duration-300 group relative ${
        note.type === 'project'
          ? 'border-l-4 border-l-pink-500 border-t-border/50 border-r-border/50 border-b-border/50'
          : note.type === 'document'
          ? 'border-l-4 border-l-cyan-500 border-t-border/50 border-r-border/50 border-b-border/50'
          : 'border-border/50'
      }`}
    >
      {/* Drag handle */}
      <GripVertical className="absolute top-2 left-2 w-3 h-3 text-muted-foreground/20 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10" />

      {/* Context menu button */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute top-full right-0 mt-1 w-36 bg-card rounded-xl border border-border/50 shadow-xl py-1 animate-fadeIn z-20">
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetail(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Eye className="w-3 h-3 text-muted-foreground" />
              View Detail
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Move to Trash
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 pr-6 pl-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${typeColors[note.type] || 'bg-secondary text-muted-foreground'}`}>
            {typeIcons[note.type]}
            {note.type}
          </div>
          {/* Folder badge */}
          {note.folderId && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-pri-500/10 text-pri-400 border border-pri-500/20 whitespace-nowrap">
              <Folder className="w-2 h-2" />
              {useWSHStore.getState().folders.find(f => f.id === note.folderId)?.name || 'Folder'}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {date}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-pri-400 transition-colors pl-4">
        {note.title || 'Untitled Note'}
      </h3>

      {/* Content preview */}
      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 pl-4">
        {note.rawContent || note.content?.replace(/<[^>]*>/g, '').slice(0, 150) || 'No content'}
      </p>

      {/* Type description for project/document */}
      {(note.type === 'project' || note.type === 'document') && (
        <p className="text-[9px] text-muted-foreground/50 italic mb-2 pl-4">
          {typeDescriptions[note.type]}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 pl-4">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-pri-500/10 text-pri-400"
            >
              <Tag className="w-2 h-2" />
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[9px] text-muted-foreground">+{note.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotesGrid() {
  const {
    notes,
    folders,
    activeFolderId,
    setActiveFolderId,
    setActiveNoteId,
    setEditorTitle,
    setEditorContent,
    setEditorRawContent,
    setActiveNoteType,
    setEditorTags,
    searchQuery,
    viewMode,
    deleteNote,
    updateNote,
    setNoteDetailId,
    calendarDateFilter,
    setCalendarDateFilter,
  } = useWSHStore();

  // Drag & drop state
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    let filtered = notes.filter((n) => !n.isDeleted);

    // Calendar date filter — only show notes from that specific day (local timezone)
    if (calendarDateFilter) {
      filtered = filtered.filter((n) => {
        if (!n.createdAt) return false;
        const localDate = new Date(n.createdAt);
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        const d = String(localDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === calendarDateFilter;
      });
    }

    if (activeFolderId) {
      filtered = filtered.filter((n) => n.folderId === activeFolderId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.rawContent?.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [notes, activeFolderId, searchQuery, calendarDateFilter]);

  const handleNoteClick = (note: Note) => {
    // Click on a note opens the detail view (read mode)
    // User can then click "Edit Note" to load into the editor
    setNoteDetailId(note.id);
  };

  const handleViewDetail = (note: Note) => {
    setNoteDetailId(note.id);
  };

  const handleDelete = (note: Note) => {
    deleteNote(note.id);
  };

  // ── Drag & Drop Handlers ──

  const handleNoteDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(noteId);
  }, []);

  const handleNoteDragEnd = useCallback(() => {
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  }, []);

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      await updateNote(noteId, { folderId });
    }
  }, [updateNote]);

  if (viewMode === 'focus') {
    return null;
  }

  return (
    <div className="space-y-4 mt-6">
      {/* Calendar date filter indicator */}
      {calendarDateFilter && (
        <div className="flex items-center gap-2 bg-pri-500/10 border border-pri-500/20 rounded-xl px-3 py-2 animate-fadeIn">
          <div className="w-1.5 h-1.5 rounded-full bg-pri-400" />
          <span className="text-[10px] font-bold text-pri-400">
            Showing notes from{' '}
            {(() => {
              try {
                return new Date(calendarDateFilter + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              } catch { return calendarDateFilter; }
            })()}
          </span>
          <button
            onClick={() => setCalendarDateFilter(null)}
            className="ml-auto text-[9px] font-bold text-pri-400 hover:text-pri-300 bg-pri-500/15 hover:bg-pri-500/25 px-2 py-0.5 rounded-full transition-colors active:scale-95"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">
          {calendarDateFilter
            ? `📅 ${(() => {
                try {
                  return new Date(calendarDateFilter + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } catch { return calendarDateFilter; }
              })()}`
            : activeFolderId
            ? `📁 ${folders.find((f) => f.id === activeFolderId)?.name || 'Folder'}`
            : 'All Notes'}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Folder filter pills — also serve as drop targets */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFolderId(null)}
          onDragOver={(e) => handleFolderDragOver(e, null)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, null)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
            activeFolderId === null
              ? 'bg-pri-600 text-white shadow-sm'
              : dragOverFolderId === null && draggedNoteId
                ? 'bg-pri-500/20 text-pri-400 border-2 border-dashed border-pri-500/40'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          All Notes
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            onDragOver={(e) => handleFolderDragOver(e, folder.id)}
            onDragLeave={handleFolderDragLeave}
            onDrop={(e) => handleFolderDrop(e, folder.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
              activeFolderId === folder.id
                ? 'bg-pri-600 text-white shadow-sm'
                : dragOverFolderId === folder.id && draggedNoteId
                  ? 'bg-pri-500/20 text-pri-400 border-2 border-dashed border-pri-500/40'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="w-2.5 h-2.5" />
            {folder.name}
          </button>
        ))}
        {draggedNoteId && (
          <span className="text-[9px] text-pri-400 animate-pulse whitespace-nowrap ml-1">Drop on a folder to move</span>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => handleNoteClick(note)}
              onViewDetail={() => handleViewDetail(note)}
              onDelete={() => handleDelete(note)}
              onDragStart={(e) => handleNoteDragStart(e, note.id)}
            />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center">
          <Plus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">
            {calendarDateFilter && searchQuery
              ? 'No notes match both the date and search'
              : calendarDateFilter
                ? 'No notes on this date'
                : searchQuery
                  ? 'No notes match your search'
                  : 'No notes yet'}
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            {calendarDateFilter && searchQuery
              ? 'Try clearing the search or selecting a different date'
              : calendarDateFilter
                ? 'Select a different date or clear the filter'
                : searchQuery
                  ? 'Try different keywords'
                  : 'Create your first note above'}
          </p>
        </div>
      )}
    </div>
  );
}
