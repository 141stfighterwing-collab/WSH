'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  X, ChevronRight, Tag, Calendar, Link2, Quote,
  ImageIcon, ExternalLink, FileText, Code2, FolderKanban,
  FileDown, BookOpen, Hash, Brain, Clock, Loader2, AlertCircle,
} from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

// ─── Type Colors ───────────────────────────────────────────────
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
  quick: <FileText className="w-3 h-3" />,
  notebook: <BookOpen className="w-3 h-3" />,
  deep: <Hash className="w-3 h-3" />,
  code: <Code2 className="w-3 h-3" />,
  project: <FolderKanban className="w-3 h-3" />,
  document: <FileDown className="w-3 h-3" />,
  'ai-prompts': <Brain className="w-3 h-3" />,
};

// ─── Content Parsing Helpers ───────────────────────────────────

/** Safely coerce content to string (handles objects, arrays, null, undefined) */
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

/** Extract all image URLs from note content (markdown, HTML, raw URLs) */
function extractImages(content: string): string[] {
  const images: string[] = [];

  // HTML <img src="...">
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRegex.exec(content)) !== null) {
    if (m[1] && !images.includes(m[1])) images.push(m[1]);
  }

  // Markdown ![alt](url)
  const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  while ((m = mdImgRegex.exec(content)) !== null) {
    if (m[1] && !images.includes(m[1])) images.push(m[1]);
  }

  // Bare image URLs (ending in image extensions)
  const urlRegex = /(?:https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|avif))/gi;
  while ((m = urlRegex.exec(content)) !== null) {
    if (!images.includes(m[0])) images.push(m[0]);
  }

  return images;
}

/** Extract all URLs from content that are NOT image URLs */
function extractLinks(content: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];

  // Markdown [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdLinkRegex.exec(content)) !== null) {
    const url = m[2];
    const text = m[1];
    if (!url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i)) {
      links.push({ url, text });
    }
  }

  // HTML <a href="url">text</a>
  const htmlLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  while ((m = htmlLinkRegex.exec(content)) !== null) {
    const url = m[1];
    const text = m[2];
    if (!url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i)) {
      links.push({ url, text });
    }
  }

  // Bare URLs (not images) — collect image URLs from content first to exclude them
  const imgUrls = new Set<string>();
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(content)) !== null) {
    if (imgMatch[1]) imgUrls.add(imgMatch[1]);
  }
  const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  while ((imgMatch = mdImgRegex.exec(content)) !== null) {
    if (imgMatch[1]) imgUrls.add(imgMatch[1]);
  }

  const bareUrlRegex = /(?:https?:\/\/[^\s<>"')\]]+)(?![^\s]*\.(?:jpg|jpeg|png|gif|webp|svg|bmp|avif))/gi;
  while ((m = bareUrlRegex.exec(content)) !== null) {
    const url = m[0];
    if (!links.some((l) => l.url === url) && !imgUrls.has(url)) {
      links.push({ url, text: '' });
    }
  }

  return links;
}

/** Extract quote blocks from content (markdown > quotes, HTML blockquotes, "quoted" text) */
function extractQuotes(content: string): string[] {
  const quotes: string[] = [];

  // HTML blockquotes
  const blockquoteRegex = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi;
  let m;
  while ((m = blockquoteRegex.exec(content)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text) quotes.push(text);
  }

  // Markdown blockquotes (> at start of line)
  const lines = content.split('\n');
  let currentQuote = '';
  let inQuote = false;
  for (const line of lines) {
    const trimmed = line.replace(/^>\s?/, '').trim();
    if (line.match(/^>\s?/) || (inQuote && line.trim() === '')) {
      if (line.match(/^>\s?/)) {
        inQuote = true;
        currentQuote += (currentQuote ? ' ' : '') + trimmed;
      }
    } else {
      if (inQuote && currentQuote) {
        const clean = currentQuote.replace(/<[^>]+>/g, '').trim();
        if (clean) quotes.push(clean);
        currentQuote = '';
        inQuote = false;
      }
    }
  }
  if (inQuote && currentQuote) {
    const clean = currentQuote.replace(/<[^>]+>/g, '').trim();
    if (clean) quotes.push(clean);
  }

  return quotes;
}

/** Extract first thumbnail image from content */
function extractThumbnail(content: string): string | null {
  const images = extractImages(content);
  return images.length > 0 ? images[0] : null;
}

/** Strip images, links, and quotes from content for description text */
function getDescriptionText(content: string): string {
  let text = content;
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Remove markdown image syntax
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  // Remove markdown link syntax (keep text)
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown blockquotes
  text = text.replace(/^>\s?.*/gm, '');
  // Remove bare URLs
  text = text.replace(/https?:\/\/[^\s]+/g, '');
  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/** Format relative date for sidebar cards */
function formatRelativeDate(dateStr: string): { label: string; isRecent: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return { label: 'Just now', isRecent: true };
  if (diffMins < 60) return { label: `${diffMins}m ago`, isRecent: true };
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return { label: `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`, isRecent: true };
  }
  if (diffDays < 2) return { label: 'Yesterday', isRecent: false };
  if (diffDays < 7) return { label: `${diffDays}d ago`, isRecent: false };
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isRecent: false };
}

/** Sanitize HTML content for safe rendering */
function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('script, iframe, object, embed, form').forEach((el) => el.remove());
  tmp.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.startsWith('on') || attr.name === 'srcdoc') el.removeAttribute(attr.name);
    });
  });
  return tmp.innerHTML;
}

/** Extract domain from URL */
function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ─── Main NotebookView Component ────────────────────────────────

export default function NotebookView() {
  const { notebookOpen, setNotebookOpen, notes } = useWSHStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [filterType, setFilterType] = useState<string | null>(null);

  const sortedNotes = useMemo(() => {
    return notes
      .filter((n) => !n.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!filterType) return sortedNotes;
    return sortedNotes.filter((n) => n.type === filterType);
  }, [sortedNotes, filterType]);

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

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(filteredNotes.length > 0 ? 0 : -1);
  }, [filterType]);

  if (!notebookOpen) return null;

  // Collect all unique types for filter
  const noteTypes = useMemo(() => {
    const types = new Set(sortedNotes.map((n) => n.type));
    return Array.from(types);
  }, [sortedNotes]);

  return (
    <div className="fixed inset-0 z-[105] flex animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/98"
        onClick={() => setNotebookOpen(false)}
      />

      {/* Sidebar */}
      <div className="relative w-72 shrink-0 border-r border-border/50 bg-card/80 backdrop-blur-sm flex flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-pri-400" />
            <span className="micro-label text-foreground">Notebook</span>
          </div>
          <button
            onClick={() => setNotebookOpen(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30 overflow-x-auto">
          <button
            onClick={() => setFilterType(null)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
              filterType === null
                ? 'bg-pri-500/20 text-pri-400 border border-pri-500/30'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            All
          </button>
          {noteTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                filterType === type
                  ? `${typeColors[type]?.split(' ')[0] || 'bg-pri-500/20'} ${typeColors[type]?.split(' ')[1] || 'text-pri-400'} border ${typeColors[type]?.split(' ')[0] || 'bg-pri-500/20'}`
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {typeIcons[type]}
              {type}
            </button>
          ))}
        </div>

        {/* Entry Count */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/20">
          <span className="text-[9px] text-muted-foreground/60">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'entry' : 'entries'}
          </span>
          {filterType && (
            <button
              onClick={() => setFilterType(null)}
              className="text-[9px] text-pri-400 hover:text-pri-300 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Note Cards */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-xs text-muted-foreground/40 text-center">No notes to display</p>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <SidebarCard
                key={note.id}
                note={note}
                index={index}
                isActive={activeIndex === index}
                onClick={() => scrollToNote(index)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="micro-label text-pri-400 shrink-0">Notebook</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <span className="text-xs text-foreground font-semibold truncate">
              {filteredNotes[activeIndex]?.title || 'Browse notes'}
            </span>
            {filteredNotes[activeIndex] && (
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${typeColors[filteredNotes[activeIndex].type] || ''}`}>
                {filteredNotes[activeIndex].type}
              </span>
            )}
          </div>
          <button
            onClick={() => setNotebookOpen(false)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <FileText className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground/40 font-semibold">No notes yet</p>
              <p className="text-xs text-muted-foreground/30 mt-1">Create notes to read them here</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-8 py-8">
              {filteredNotes.map((note, index) => (
                <NotebookPage
                  key={note.id}
                  note={note}
                  index={index}
                  isLast={index === filteredNotes.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Card Component ────────────────────────────────────

function SidebarCard({
  note,
  index,
  isActive,
  onClick,
}: {
  note: Note;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const thumbnail = useMemo(() => extractThumbnail(safeString(note.rawContent || note.content)), [note.rawContent, note.content]);
  const description = useMemo(() => getDescriptionText(safeString(note.rawContent || note.content)), [note.rawContent, note.content]);
  const relativeDate = useMemo(() => formatRelativeDate(note.createdAt), [note.createdAt]);
  const safeNoteTags = useMemo(() => safeTags(note.tags), [note.tags]);
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-pri-500/8 border-l-[3px] border-l-pri-500 shadow-sm'
          : 'bg-secondary/30 border-l-[3px] border-l-transparent hover:bg-secondary/60 hover:border-l-pri-500/30'
      }`}
    >
      <div className="p-3">
        {/* Top row: date + status */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${relativeDate.isRecent ? 'text-pri-400' : 'text-muted-foreground/50'}`}>
            {relativeDate.label}
          </span>
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${typeColors[note.type] || ''}`}>
            {typeIcons[note.type]}
            {note.type}
          </span>
        </div>

        {/* Title */}
        <p className={`text-[11px] font-bold leading-tight mb-1.5 truncate ${
          isActive ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
        }`}>
          {note.title || 'Untitled'}
        </p>

        {/* Content row: description + optional thumbnail */}
        <div className="flex gap-2">
          {/* Thumbnail */}
          {thumbnail && !imgError && (
            <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-secondary/50 border border-border/30">
              <img
                src={thumbnail}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </div>
          )}

          {/* Description */}
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed line-clamp-3 min-w-0">
            {description.slice(0, 150) || 'No description'}
          </p>
        </div>

        {/* Tags */}
        {safeNoteTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {safeNoteTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-pri-500/10 text-pri-400/80"
              >
                {tag}
              </span>
            ))}
            {safeNoteTags.length > 3 && (
              <span className="text-[8px] text-muted-foreground/40 font-bold">
                +{safeNoteTags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Image Thumbnail Component ─────────────────────────────────

function ImageThumbnail({ src, alt }: { src: string; alt?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-secondary/30 border border-border/20 group/img">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-muted-foreground/30 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt || 'Note image'}
        className="w-full max-h-64 object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
      {loaded && (
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-end p-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Quote Block Component ─────────────────────────────────────

function QuoteBlock({ text }: { text: string }) {
  return (
    <div className="my-4 pl-4 py-3 border-l-[3px] border-pri-500/60 bg-pri-50/50 dark:bg-pri-900/10 rounded-r-xl">
      <div className="flex items-start gap-2">
        <Quote className="w-3.5 h-3.5 text-pri-400/60 shrink-0 mt-0.5" />
        <div>
          <span className="text-[8px] font-black uppercase tracking-widest text-pri-400/60 mb-1 block">
            Quote
          </span>
          <p className="text-sm text-foreground/75 leading-relaxed italic">
            &ldquo;{text}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Link Card Component ───────────────────────────────────────

function LinkCard({ url, text }: { url: string; text: string }) {
  const [favicon, setFavicon] = useState<string | null>(null);
  const domain = getDomain(url);

  useEffect(() => {
    try {
      const u = new URL(url);
      setFavicon(`https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`);
    } catch {
      setFavicon(null);
    }
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-3 flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 hover:bg-secondary/50 hover:border-pri-500/20 transition-all duration-200 group/link no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Favicon */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-secondary/80 border border-border/30 flex items-center justify-center overflow-hidden">
        {favicon ? (
          <img src={favicon} alt="" className="w-4 h-4" onError={() => setFavicon(null)} />
        ) : (
          <Link2 className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
      </div>

      {/* Link Info */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-foreground/80 group-hover/link:text-pri-400 truncate transition-colors">
          {text || domain}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-muted-foreground/50 truncate">{domain}</span>
          <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
        </div>
      </div>
    </a>
  );
}

// ─── Design Note Box Component ─────────────────────────────────

function DesignNoteBox({ label, content }: { label: string; content: string }) {
  return (
    <div className="my-4 p-4 rounded-xl bg-pri-50/30 dark:bg-pri-900/10 border border-pri-500/15">
      <span className="text-[8px] font-black uppercase tracking-widest text-pri-400/70 mb-2 block">
        {label}
      </span>
      <p className="text-sm text-foreground/65 leading-relaxed italic">
        {content}
      </p>
    </div>
  );
}

// ─── Notebook Page Component ───────────────────────────────────

function NotebookPage({ note, index, isLast }: { note: Note; index: number; isLast: boolean }) {
  const rawContent = safeString(note.rawContent || note.content);
  const safeNoteTags = useMemo(() => safeTags(note.tags), [note.tags]);
  const images = useMemo(() => extractImages(rawContent), [rawContent]);
  const links = useMemo(() => extractLinks(rawContent), [rawContent]);
  const quotes = useMemo(() => extractQuotes(rawContent), [rawContent]);

  // Clean the main content by removing images, quotes, and standalone links
  const cleanContent = useMemo(() => {
    let html = rawContent;
    // Remove blockquote HTML
    html = html.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');
    // Remove img tags
    html = html.replace(/<img[^>]*>/gi, '');
    // Remove markdown images
    html = html.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    // Remove markdown quotes
    html = html.replace(/^>\s?.*$/gm, '');
    // Remove markdown links but keep text
    html = html.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove HTML links but keep text
    html = html.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
    // Clean up
    html = html.replace(/\n{3,}/g, '\n\n').trim();
    return html;
  }, [rawContent]);

  // Detect "design note" style patterns in content
  const designNotes = useMemo(() => {
    const notes: { label: string; content: string }[] = [];
    // Look for patterns like "DESIGN NOTE" followed by quote
    const pattern = /(?:DESIGN\s+NOTE|NOTE|INSIGHT|THOUGHT)[:\s]+(?:["""]|&ldquo;)?([\s\S]*?)(?:["""]|&rdquo;|$)/gi;
    let m;
    while ((m = pattern.exec(rawContent)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, '').trim().slice(0, 300);
      if (text.length > 10) {
        notes.push({ label: m[0].match(/DESIGN\s+NOTE/i) ? 'Design Note' : 'Note', content: text });
      }
    }
    return notes;
  }, [rawContent]);

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
      {/* Metadata Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${typeColors[note.type] || ''}`}>
          {typeIcons[note.type]}
          {note.type}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
          <Calendar className="w-3 h-3" />
          {createdDate}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-extrabold text-foreground mb-5 leading-tight tracking-tight">
        {note.title || 'Untitled Note'}
      </h2>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="mb-6">
          <div className={`grid gap-3 ${
            images.length === 1 ? 'grid-cols-1' :
            images.length === 2 ? 'grid-cols-2' :
            'grid-cols-2 lg:grid-cols-3'
          }`}>
            {images.slice(0, 6).map((src, i) => (
              <ImageThumbnail key={`${src}-${i}`} src={src} alt={note.title || 'Note image'} />
            ))}
          </div>
          {images.length > 6 && (
            <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
              +{images.length - 6} more images
            </p>
          )}
        </div>
      )}

      {/* Clean Main Content */}
      {cleanContent.trim() && (
        <div
          className="prose prose-sm prose-invert max-w-none mb-5 text-sm text-foreground/75 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: sanitizeHTML(cleanContent) || '',
          }}
        />
      )}

      {/* Design Note Boxes */}
      {designNotes.length > 0 && designNotes.map((note, i) => (
        <DesignNoteBox key={`dn-${i}`} label={note.label} content={note.content} />
      ))}

      {/* Quote Blocks */}
      {quotes.length > 0 && quotes.map((quote, i) => (
        <QuoteBlock key={`q-${i}`} text={quote} />
      ))}

      {/* Link Cards */}
      {links.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
              Links ({links.length})
            </span>
          </div>
          <div className="space-y-2">
            {links.slice(0, 10).map((link, i) => (
              <LinkCard key={`l-${i}`} url={link.url} text={link.text} />
            ))}
          </div>
          {links.length > 10 && (
            <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
              +{links.length - 10} more links
            </p>
          )}
        </div>
      )}

      {/* Tags */}
      {safeNoteTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 mt-5 pt-4 border-t border-border/20">
          <Tag className="w-3 h-3 text-muted-foreground/30" />
          {safeNoteTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-pri-500/10 text-pri-400"
            >
              <Hash className="w-2 h-2" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Separator */}
      {!isLast && (
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-border/20" />
          <div className="flex items-center gap-1 text-muted-foreground/20">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
          <div className="flex-1 h-px bg-border/20" />
        </div>
      )}
    </div>
  );
}
