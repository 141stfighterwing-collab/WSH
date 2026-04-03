'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Subscript,
  Superscript,
  Paperclip,
  Smile,
  Palette,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Save,
  Type,
} from 'lucide-react';
import { useWSHStore, type NoteType } from '@/store/wshStore';

const NOTE_TYPES: { type: NoteType; label: string }[] = [
  { type: 'quick', label: 'Quick' },
  { type: 'notebook', label: 'Notebook' },
  { type: 'deep', label: 'Deep' },
  { type: 'code', label: 'Code' },
  { type: 'project', label: 'Project' },
  { type: 'document', label: 'Document' },
];

export default function NoteEditor() {
  const {
    activeNoteType,
    setActiveNoteType,
    editorTitle,
    setEditorTitle,
    editorContent,
    setEditorContent,
    editorTags,
    addEditorTag,
    removeEditorTag,
    activeNoteId,
    addNote,
    updateNote,
    setEditorRawContent,
    saveToLocalStorage,
  } = useWSHStore();

  const editorRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [engineStatus, setEngineStatus] = useState('Intelligence Idle');
  const [saveStatus, setSaveStatus] = useState('');

  // Sync content from active note
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== editorContent) {
        editorRef.current.innerHTML = editorContent;
      }
    }
  }, [activeNoteId]);

  const handleContentInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setEditorContent(html);
      setEditorRawContent(editorRef.current.innerText);
    }
  }, [setEditorContent, setEditorRawContent]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentInput();
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addEditorTag(tagInput.trim().replace(/^#/, ''));
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && editorTags.length > 0) {
      removeEditorTag(editorTags[editorTags.length - 1]);
    }
  };

  const handleSave = () => {
    setSaveStatus('Saving...');
    setTimeout(() => {
      if (activeNoteId) {
        updateNote(activeNoteId, {
          title: editorTitle,
          content: editorContent,
          rawContent: editorRef.current?.innerText || '',
          type: activeNoteType,
          tags: editorTags,
        });
      } else {
        const newNote = {
          id: `note-${Date.now()}`,
          title: editorTitle || 'Untitled Note',
          content: editorContent,
          rawContent: editorRef.current?.innerText || '',
          type: activeNoteType,
          tags: editorTags,
          color: 'yellow',
          folderId: null,
          userId: 'local',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addNote(newNote);
      }
      saveToLocalStorage();
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    }, 300);
  };

  const handleSynthesis = () => {
    setEngineStatus('Processing...');
    setTimeout(() => {
      setEngineStatus('Synthesis Complete');
      setTimeout(() => setEngineStatus('Intelligence Idle'), 3000);
    }, 2000);
  };

  return (
    <div className="bg-card rounded-2xl shadow-2xl ring-4 ring-black/5 overflow-hidden transition-theme">
      {/* Note Type Tabs */}
      <div className="flex gap-1 p-2 bg-secondary/30 overflow-x-auto">
        {NOTE_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setActiveNoteType(type)}
            className={`py-2 px-3 text-[10px] font-black rounded-xl min-w-[85px] uppercase tracking-widest whitespace-nowrap transition-all duration-200 active:scale-95 ${
              activeNoteType === type
                ? 'bg-pri-600 text-white shadow-lg'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="px-5 pt-3">
        <input
          type="text"
          value={editorTitle}
          onChange={(e) => setEditorTitle(e.target.value)}
          placeholder="Title of this Idea block..."
          className="w-full bg-transparent font-bold text-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none border-b border-transparent focus:border-pri-500/30 pb-2 transition-colors"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border/50 overflow-x-auto">
        {/* Font selector */}
        <select className="bg-transparent text-xs text-muted-foreground px-1.5 py-1 rounded-md hover:bg-secondary focus:outline-none cursor-pointer">
          <option value="inter">Inter</option>
          <option value="mono">Fira Code</option>
          <option value="kalam">Kalam</option>
        </select>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <button
          onClick={() => execCommand('bold')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('underline')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('strikeThrough')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <button
          onClick={() => execCommand('subscript')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Subscript"
        >
          <Subscript className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('superscript')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Superscript"
        >
          <Superscript className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <button
          onClick={() => execCommand('justifyLeft')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Align Left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('justifyCenter')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Align Center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCommand('justifyRight')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Align Right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <button
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Attach File"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Emoji"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Text Color"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Font Size"
        >
          <Type className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          title="Insert Image"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Editor */}
      <div className="px-5 py-3">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentInput}
          data-placeholder="Start writing your thoughts..."
          className="min-h-[450px] h-[450px] max-h-[600px] overflow-y-auto bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 text-sm text-foreground leading-relaxed editor-inner focus:ring-2 focus:ring-pri-500/20 transition-all duration-200 resize-y"
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* Hashtags */}
      <div className="px-5 pb-3">
        <div
          onClick={() => tagInputRef.current?.focus()}
          className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl px-3 py-2 min-h-[48px] border border-transparent focus-within:border-pri-500/30 transition-colors cursor-text"
        >
          {editorTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pri-500/15 text-pri-400 border border-pri-500/20"
            >
              #{tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeEditorTag(tag);
                }}
                className="hover:text-destructive transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={editorTags.length === 0 ? 'Add tags (press Enter)...' : ''}
            className="flex-1 min-w-[100px] bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-secondary/30 border-t border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground">
            Engine: {engineStatus}
          </span>
          {engineStatus !== 'Intelligence Idle' && (
            <span className="w-1.5 h-1.5 rounded-full bg-pri-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-95"
          >
            <Save className="w-3 h-3" />
            {saveStatus || 'Save Raw'}
          </button>
          <button
            onClick={handleSynthesis}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 shadow-lg"
          >
            <Sparkles className="w-3 h-3" />
            Synthesis
          </button>
        </div>
      </div>
    </div>
  );
}
