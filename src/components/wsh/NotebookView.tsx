'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { X, ChevronRight, Tag, Calendar } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

const typeColors: Record<string, string> = {
  quick: 'bg-blue-500/15 text-blue-400',
  notebook: 'bg-green-500/15 text-green-400',
  deep: 'bg-purple-500/15 text-purple-400',
  code: 'bg-orange-500/15 text-orange-400',
  project: 'bg-pink-500/15 text-pink-400',
  document: 'bg-cyan-500/15 text-cyan-400',
};

export default function NotebookView() {
  const { notebookOpen, setNotebookOpen, notes } = useWSHStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const sortedNotes = useMemo(() => {
    return notes
      .filter((n) => !n.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes]);

  const scrollToNote = (index: number) => {
    setActiveIndex(index);
    const el = document.getElementById(`notebook-page-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!notebookOpen) return;
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const pages = container.querySelectorAll('[data-notebook-page]');
      let currentIdx = 0;
      pages.forEach((page, idx) => {
        const rect = page.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2) {
          currentIdx = idx;
        }
      });
      setActiveIndex(currentIdx);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [notebookOpen]);

  if (!notebookOpen) return null;

  return (
    <div className="fixed inset-0 z-[105] flex animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/98"
        onClick={() => setNotebookOpen(false)}
      />

      {/* Sidebar */}
      <div className="relative w-56 shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <span className="micro-label text-muted-foreground">Notebook</span>
          <button
            onClick={() => setNotebookOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
          <span className="text-[10px] text-muted-foreground/60">
            {sortedNotes.length} entries
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {sortedNotes.map((note, index) => (
            <button
              key={note.id}
              onClick={() => scrollToNote(index)}
              className={`w-full text-left px-4 py-2 transition-all hover:bg-secondary/50 ${
                activeIndex === index ? 'bg-pri-600/10 border-l-2 border-pri-500' : 'border-l-2 border-transparent'
              }`}
            >
              <p className="text-[10px] font-bold text-foreground truncate">
                {note.title || 'Untitled'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[8px] font-black uppercase tracking-wider ${typeColors[note.type]}`}>
                  {note.type}
                </span>
                <span className="text-[9px] text-muted-foreground/50">
                  {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="micro-label text-pri-400">Reading Mode</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-xs text-foreground font-semibold">
              {sortedNotes[activeIndex]?.title || 'Notebook'}
            </span>
          </div>
          <button
            onClick={() => setNotebookOpen(false)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6">
          {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="text-lg text-muted-foreground/40 font-semibold">No notes yet</p>
              <p className="text-xs text-muted-foreground/30 mt-1">Create notes to read them here</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-8">
              {sortedNotes.map((note, index) => (
                <NotebookPage key={note.id} note={note} index={index} isLast={index === sortedNotes.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotebookPage({ note, index, isLast }: { note: Note; index: number; isLast: boolean }) {
  const createdDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div id={`notebook-page-${index}`} data-notebook-page className="animate-fadeIn">
      {/* Type badge & date */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${typeColors[note.type]}`}>
          {note.type}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Calendar className="w-2.5 h-2.5" />
          {createdDate}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-foreground mb-4 leading-tight">
        {note.title || 'Untitled Note'}
      </h2>

      {/* Content */}
      <div
        className="prose prose-sm prose-invert max-w-none mb-4 text-sm text-foreground/80 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: note.content || '<p class="text-muted-foreground/40 italic">No content</p>',
        }}
      />

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-pri-500/10 text-pri-400"
            >
              <Tag className="w-2 h-2" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Separator */}
      {!isLast && (
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[9px] text-muted-foreground/30">• • •</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
      )}
    </div>
  );
}
