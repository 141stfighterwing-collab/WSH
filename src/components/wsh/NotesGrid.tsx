'use client';

import { useMemo } from 'react';
import { Clock, Tag, FolderOpen, FileText, Code, Briefcase, BookOpen, Brain, Plus } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

const typeIcons: Record<string, React.ReactNode> = {
  quick: <FileText className="w-3.5 h-3.5" />,
  notebook: <BookOpen className="w-3.5 h-3.5" />,
  deep: <Brain className="w-3.5 h-3.5" />,
  code: <Code className="w-3.5 h-3.5" />,
  project: <Briefcase className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
};

const typeColors: Record<string, string> = {
  quick: 'bg-blue-500/15 text-blue-400',
  notebook: 'bg-green-500/15 text-green-400',
  deep: 'bg-purple-500/15 text-purple-400',
  code: 'bg-orange-500/15 text-orange-400',
  project: 'bg-pink-500/15 text-pink-400',
  document: 'bg-cyan-500/15 text-cyan-400',
};

function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const date = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-pri-500/20 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${typeColors[note.type] || 'bg-secondary text-muted-foreground'}`}>
          {typeIcons[note.type]}
          {note.type}
        </div>
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {date}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-pri-400 transition-colors">
        {note.title || 'Untitled Note'}
      </h3>

      {/* Content preview */}
      <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
        {note.rawContent || note.content?.replace(/<[^>]*>/g, '').slice(0, 150) || 'No content'}
      </p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
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
  } = useWSHStore();

  const filteredNotes = useMemo(() => {
    let filtered = notes.filter((n) => !n.isDeleted);

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
  }, [notes, activeFolderId, searchQuery]);

  const handleNoteClick = (note: Note) => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorRawContent(note.rawContent || '');
    setActiveNoteType(note.type as 'quick' | 'notebook' | 'deep' | 'code' | 'project' | 'document');
    setEditorTags(note.tags);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (viewMode === 'focus') {
    return null;
  }

  return (
    <div className="space-y-4 mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">
          {activeFolderId ? `📁 ${folders.find((f) => f.id === activeFolderId)?.name || 'Folder'}` : 'All Notes'}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Folder filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFolderId(null)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
            activeFolderId === null
              ? 'bg-pri-600 text-white shadow-sm'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          All Notes
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
              activeFolderId === folder.id
                ? 'bg-pri-600 text-white shadow-sm'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="w-2.5 h-2.5" />
            {folder.name}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} onClick={() => handleNoteClick(note)} />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center">
          <Plus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">
            {searchQuery ? 'No notes match your search' : 'No notes yet'}
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            {searchQuery ? 'Try different keywords' : 'Create your first note above'}
          </p>
        </div>
      )}
    </div>
  );
}
