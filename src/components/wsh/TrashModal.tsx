'use client';

import { useMemo } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle, Inbox } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

const typeColors: Record<string, string> = {
  quick: 'bg-blue-500/15 text-blue-400',
  notebook: 'bg-green-500/15 text-green-400',
  deep: 'bg-purple-500/15 text-purple-400',
  code: 'bg-orange-500/15 text-orange-400',
  project: 'bg-pink-500/15 text-pink-400',
  document: 'bg-cyan-500/15 text-cyan-400',
  'ai-prompts': 'bg-violet-500/15 text-violet-400',
};

export default function TrashModal() {
  const {
    trashOpen,
    setTrashOpen,
    notes,
    restoreNote,
    permanentDeleteNote,
    emptyTrash,
  } = useWSHStore();

  const deletedNotes = useMemo(() => {
    return notes
      .filter((n) => n.isDeleted)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes]);

  if (!trashOpen) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setTrashOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border/50 animate-fadeIn max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">🗑️</span>
            <div>
              <span className="micro-label text-muted-foreground">Trash</span>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {deletedNotes.length} deleted note{deletedNotes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTrashOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {deletedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Inbox className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground/60 font-semibold">Trash is empty</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Deleted notes will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedNotes.map((note) => (
                <TrashNoteItem
                  key={note.id}
                  note={note}
                  onRestore={() => restoreNote(note.id)}
                  onPermanentDelete={() => permanentDeleteNote(note.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {deletedNotes.length > 0 && (
          <div className="p-4 border-t border-border/50 shrink-0">
            <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-400/80">
                Permanently deleted notes cannot be recovered.
              </p>
            </div>
            <button
              onClick={emptyTrash}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all active:scale-95"
            >
              <Trash2 className="w-3 h-3" />
              Empty Trash ({deletedNotes.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrashNoteItem({
  note,
  onRestore,
  onPermanentDelete,
}: {
  note: Note;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const deletedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors group">
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-xs font-bold text-foreground truncate">
            {note.title || 'Untitled Note'}
          </h4>
          <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${typeColors[note.type] || 'bg-secondary text-muted-foreground'}`}>
            {note.type}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Deleted {deletedDate}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onRestore(); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-all active:scale-95"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Restore
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all active:scale-95"
        >
          <Trash2 className="w-2.5 h-2.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
