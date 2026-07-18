'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useVisibleNotes } from '@/hooks/useVisibleNotes';
import { Clock, Tag, FolderOpen, Folder, FileText, Code, Briefcase, BookOpen, Brain, Plus, MoreVertical, Eye, Trash2, GripVertical } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';
import VirtualNotesList from '@/components/wsh/VirtualNotesList';

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
      className={`wsh-surface group relative cursor-pointer rounded-lg p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300/35 hover:shadow-xl ${
        note.type === 'project'
          ? 'border-l-4 border-l-pink-500'
          : note.type === 'document'
          ? 'border-l-4 border-l-cyan-500'
          : ''
      }`}
    >
      {/* Drag handle */}
      <GripVertical className="absolute top-2 left-2 z-10 hidden h-3 w-3 cursor-grab text-muted-foreground/20 opacity-0 transition-opacity md:block md:group-hover:opacity-100" />

      <div
        ref={menuRef}
        className="absolute right-2 top-2 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/80 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
          aria-label={`Actions for ${note.title || 'untitled note'}`}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border/50 bg-card py-1 shadow-xl animate-fadeIn">
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

      <div className="flex items-center justify-between mb-2 pr-6 pl-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${typeColors[note.type] || 'bg-secondary text-muted-foreground'}`}>
            {typeIcons[note.type]}
            {note.type}
          </div>
          {note.folderId && (
            <span className="inline-flex items-center gap-0.5 rounded-lg border border-pri-500/20 bg-pri-500/10 px-1.5 py-0.5 text-[8px] font-bold text-pri-400 whitespace-nowrap">
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
      <h3 className="mb-1.5 line-clamp-2 pr-8 text-sm font-bold text-foreground transition-colors group-hover:text-pri-400 md:pl-4 md:pr-0">
        {note.title || 'Untitled Note'}
      </h3>

      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 pl-4">
        {note.preview || note.rawContent || note.content?.replace(/<[^>]*>/g, '').slice(0, 150) || 'No content'}
      </p>

      {(note.type === 'project' || note.type === 'document') && (
        <p className="text-[9px] text-muted-foreground/50 italic mb-2 pl-4">
          {typeDescriptions[note.type]}
        </p>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 pl-4">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-md bg-pri-500/10 px-1.5 py-0.5 text-[9px] font-bold text-pri-400"
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
    folders,
    activeFolderId,
    activeNoteType,
    setActiveFolderId,
    searchQuery,
    viewMode,
    deleteNote,
    updateNote,
    setNoteDetailId,
    calendarDateFilter,
    setCalendarDateFilter,
  } = useWSHStore();
  const { notes, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useVisibleNotes();

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filteredNotes = useMemo(() => {
    let filtered = notes.filter((n) => !n.isDeleted);

    if (activeNoteType) {
      filtered = filtered.filter((n) => n.type === activeNoteType);
    }

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

    // Text search is performed server-side via /api/notes.
    // Do not re-filter here against list-safe note payloads, because
    // paginated results intentionally omit full rawContent/content and
    // client-side filtering can incorrectly hide valid DB matches.
    return filtered;
  }, [notes, activeNoteType, calendarDateFilter, activeFolderId]);

  const handleNoteClick = (note: Note) => {
    setNoteDetailId(note.id);
  };

  const handleViewDetail = (note: Note) => {
    setNoteDetailId(note.id);
  };

  const handleDelete = (note: Note) => {
    deleteNote(note.id);
  };

  const handleNoteDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(noteId);
  }, []);

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      await updateNote(noteId, { folderId });
    }
  }, [updateNote]);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, filteredNotes.length]);

  if (viewMode === 'focus') {
    return null;
  }

  return (
    <div className="space-y-4 mt-6">
      {calendarDateFilter && (
        <div className="flex items-center gap-2 rounded-lg border border-pri-500/20 bg-pri-500/10 px-3 py-2 animate-fadeIn">
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

      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">
          {calendarDateFilter
            ? `${(() => {
                try {
                  return new Date(calendarDateFilter + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } catch { return calendarDateFilter; }
              })()}`
            : activeFolderId
            ? `${folders.find((f) => f.id === activeFolderId)?.name || 'Folder'}`
            : activeNoteType
            ? `${activeNoteType.charAt(0).toUpperCase() + activeNoteType.slice(1)} Notes`
            : 'All Notes'}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
        </span>
      </div>

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

      {isLoading ? (
        <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center text-sm text-muted-foreground/60">Loading recent notes…</div>
      ) : error ? (
        <div className="border-2 border-dashed border-red-500/20 rounded-2xl p-12 text-center text-sm text-red-400">Failed to load notes.</div>
      ) : filteredNotes.length > 0 ? (
        <>
          <VirtualNotesList
            notes={filteredNotes}
            className="max-h-[70vh] overflow-y-auto"
            renderItem={(note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleNoteClick(note)}
                onViewDetail={() => handleViewDetail(note)}
                onDelete={() => handleDelete(note)}
                onDragStart={(e) => handleNoteDragStart(e, note.id)}
              />
            )}
          />
          <div ref={sentinelRef} className="h-2" />
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-4 py-2 rounded-full text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
              >
                {isFetchingNextPage ? 'Loading more…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border/50 p-12 text-center">
          <Plus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">No notes yet</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Create your first note above</p>
        </div>
      )}
    </div>
  );
}
