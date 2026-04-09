'use client';

import { X, Pencil, Trash2, Tag, Calendar, Clock, FileText, BookOpen, Brain, Code, Briefcase } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

const typeColors: Record<string, string> = {
  quick: 'bg-blue-500/15 text-blue-400',
  notebook: 'bg-green-500/15 text-green-400',
  deep: 'bg-purple-500/15 text-purple-400',
  code: 'bg-orange-500/15 text-orange-400',
  project: 'bg-pink-500/15 text-pink-400',
  document: 'bg-cyan-500/15 text-cyan-400',
  'ai-prompts': 'bg-violet-500/15 text-violet-400',
};

const typeIcons: Record<string, React.ReactNode> = {
  quick: <FileText className="w-3.5 h-3.5" />,
  notebook: <BookOpen className="w-3.5 h-3.5" />,
  deep: <Brain className="w-3.5 h-3.5" />,
  code: <Code className="w-3.5 h-3.5" />,
  project: <Briefcase className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
  'ai-prompts': <Brain className="w-3.5 h-3.5" />,
};

/** Safely coerce content to string */
function safeString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
}

/** Safely ensure tags is an array of strings */
function safeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => (typeof t === 'string' ? t : String(t)));
}

export default function NoteDetailModal() {
  const {
    noteDetailId,
    setNoteDetailId,
    notes,
    deleteNote,
    setActiveNoteId,
    setEditorTitle,
    setEditorContent,
    setEditorRawContent,
    setActiveNoteType,
    setEditorTags,
  } = useWSHStore();

  const note = noteDetailId ? notes.find((n) => n.id === noteDetailId) : null;

  if (!noteDetailId || !note) return null;

  const safeNoteTags = safeTags(note.tags);
  const safeContent = safeString(note.content);
  const safeRawContent = safeString(note.rawContent || '');

  const createdDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const updatedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sanitizeHTML = (html: string) => {
    try {
      if (typeof window === 'undefined') return String(html || '');
      const tmp = document.createElement('div');
      tmp.innerHTML = String(html || '');
      tmp.querySelectorAll('script, iframe, object, embed, form').forEach((el) => el.remove());
      tmp.querySelectorAll('*').forEach((el) => {
        [...el.attributes].forEach((attr) => {
          if (attr.name.startsWith('on') || attr.name === 'srcdoc') el.removeAttribute(attr.name);
        });
      });
      // Ensure images have max-width for proper display
      tmp.querySelectorAll('img').forEach((img) => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.margin = '8px 0';
      });
      // Ensure links open in new tab and are styled
      tmp.querySelectorAll('a').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
      return tmp.innerHTML;
    } catch {
      return String(html || '').replace(/<[^>]+>/g, '');
    }
  };

  const handleEdit = () => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorRawContent(note.rawContent || '');
    setActiveNoteType(note.type);
    setEditorTags(note.tags);
    setNoteDetailId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = () => {
    deleteNote(note.id);
    setNoteDetailId(null);
  };

  const handleClose = () => {
    setNoteDetailId(null);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border/50 animate-fadeIn max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border/50 shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${typeColors[note.type]}`}>
                {typeIcons[note.type]}
                {note.type}
              </span>
            </div>
            {/* Title */}
            <h2 className="text-xl font-bold text-foreground leading-tight">
              {note.title || 'Untitled Note'}
            </h2>
            {/* Date info */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Calendar className="w-2.5 h-2.5" />
                {createdDate}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Clock className="w-2.5 h-2.5" />
                Updated {updatedDate}
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tags */}
        {safeNoteTags.length > 0 && (
          <div className="px-5 py-3 border-b border-border/30 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {safeNoteTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-pri-500/10 text-pri-400"
                >
                  <Tag className="w-2 h-2" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            className="prose prose-sm prose-invert max-w-none text-sm text-foreground/80 leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 [&_a]:text-pri-400 [&_a]:underline [&_a:hover]:text-pri-300 [&_a]:break-all [&_pre]:whitespace-pre-wrap [&_pre]:break-words"
            dangerouslySetInnerHTML={{
              __html: sanitizeHTML(safeContent) || '<p class="text-muted-foreground/40 italic">No content</p>',
            }}
          />

          {/* Raw content preview */}
          {note.rawContent && safeRawContent && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <span className="micro-label text-muted-foreground block mb-2">Raw Content</span>
              <pre className="p-3 rounded-xl bg-secondary/30 border border-border/30 text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {safeRawContent}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-border/50 shrink-0">
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95"
          >
            <Pencil className="w-3 h-3" />
            Edit Note
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all active:scale-95"
          >
            <Trash2 className="w-3 h-3" />
            Trash
          </button>
        </div>
      </div>
    </div>
  );
}
