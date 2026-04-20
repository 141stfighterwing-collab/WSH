'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock, Briefcase, CalendarDays, ChevronRight, Zap, Hash, CheckSquare, Square, Plus, X, Trash2, ListTodo } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

// ── Types ──────────────────────────────────────────────────────────────────
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO date
  date: string;      // YYYY-MM-DD — the day this todo belongs to
}

const TODO_STORAGE_KEY = 'wsh-todo-today';
const TODO_DATE_KEY = 'wsh-todo-date';

function generateTodoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch { /* fallback */ }
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadTodos(): TodoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const savedDate = localStorage.getItem(TODO_DATE_KEY);
    const today = getTodayDateStr();
    // Auto-clear if it's a new day
    if (savedDate && savedDate !== today) {
      localStorage.removeItem(TODO_STORAGE_KEY);
      localStorage.setItem(TODO_DATE_KEY, today);
      return [];
    }
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: TodoItem) => item.id && typeof item.text === 'string');
  } catch {
    return [];
  }
}

function saveTodos(todos: TodoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
    localStorage.setItem(TODO_DATE_KEY, getTodayDateStr());
  } catch {
    // Storage full or disabled
  }
}

// ── Live Clock ─────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-3 border-b border-border/50 pb-2">
        <Clock className="w-3.5 h-3.5 text-pri-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Current Time
        </span>
      </div>
      <div className="text-center space-y-1">
        <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
          {timeStr}
        </div>
        <div className="text-[10px] text-muted-foreground font-medium">
          {dateStr}
        </div>
      </div>
    </div>
  );
}

// ── Things to do Today (Todo Checklist) ────────────────────────────────────
function TodoChecklist() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load todos from localStorage on mount
  useEffect(() => {
    setTodos(loadTodos());
  }, []);

  // Persist on change
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // Auto-focus input when it becomes visible
  useEffect(() => {
    if (isInputVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputVisible]);

  const handleAddTodo = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const newItem: TodoItem = {
      id: generateTodoId(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
      date: getTodayDateStr(),
    };
    setTodos((prev) => [newItem, ...prev]);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue]);

  const handleToggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const handleDeleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTodo();
      } else if (e.key === 'Escape') {
        setInputValue('');
        setIsInputVisible(false);
      }
    },
    [handleAddTodo]
  );

  const pendingCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <ListTodo className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Things to do Today
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
              title="Clear completed items"
            >
              Clear done
            </button>
          )}
          <button
            onClick={() => setIsInputVisible(!isInputVisible)}
            className="flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
            title="Add new item"
          >
            {isInputVisible ? (
              <><X className="w-2.5 h-2.5" /> Cancel</>
            ) : (
              <><Plus className="w-2.5 h-2.5" /> Add</>
            )}
          </button>
        </div>
      </div>

      {/* Input field */}
      {isInputVisible && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you need to do?"
            className="flex-1 text-xs bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          <button
            onClick={handleAddTodo}
            disabled={!inputValue.trim()}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Add item"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Progress bar (shown when items exist) */}
      {todos.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground/60">
              {pendingCount} remaining
            </span>
            <span className="text-[9px] text-muted-foreground/60">
              {todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-1 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${todos.length > 0 ? (completedCount / todos.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Todo items */}
      <div className="space-y-1 max-h-[18rem] overflow-y-auto scrollbar-thin">
        {todos.length === 0 && !isInputVisible ? (
          <div className="py-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-amber-400/60" />
              </div>
            </div>
            <p className="text-[10px] italic text-muted-foreground/60">
              Nothing to do yet.
            </p>
            <p className="text-[9px] text-muted-foreground/40">
              Click &quot;Add&quot; to create your first task.
            </p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`group flex items-start gap-2 p-2 rounded-lg transition-all duration-200 ${
                todo.completed
                  ? 'bg-secondary/20 opacity-60'
                  : 'hover:bg-secondary/40'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleTodo(todo.id)}
                className="shrink-0 mt-0.5 transition-all duration-200"
                title={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {todo.completed ? (
                  <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <CheckSquare className="w-3 h-3 text-green-400" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded border-2 border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10 flex items-center justify-center transition-colors">
                    <Square className="w-2.5 h-2.5 text-amber-500/30" />
                  </div>
                )}
              </button>

              {/* Text */}
              <span
                className={`flex-1 text-xs leading-relaxed transition-all duration-200 ${
                  todo.completed
                    ? 'text-muted-foreground/50 line-through'
                    : 'text-foreground'
                }`}
              >
                {todo.text}
              </span>

              {/* Delete button (visible on hover) */}
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 text-muted-foreground/40 hover:text-red-400 transition-all duration-200"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Projects Section ───────────────────────────────────────────────────────
function ProjectsSection() {
  const { notes, setActiveNoteId, setEditorTitle, setEditorContent, setEditorRawContent, setActiveNoteType, setEditorTags } = useWSHStore();

  const projects = useMemo(() => {
    return notes
      .filter((n) => !n.isDeleted && n.type === 'project')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes]);

  const handleProjectClick = (project: Note) => {
    setActiveNoteId(project.id);
    setEditorTitle(project.title);
    setEditorContent(project.content);
    setEditorRawContent(project.rawContent || '');
    setActiveNoteType('project');
    setEditorTags(project.tags);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Projects
          </span>
        </div>
        <span className="text-[9px] font-bold bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
      </div>
      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-[10px] italic text-muted-foreground/60 py-3 text-center">
            No projects yet. Create a project-type note to see it here.
          </p>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="w-full text-left bg-secondary/30 rounded-xl p-3 border border-border/30 hover:border-pink-500/30 hover:bg-secondary/50 transition-all duration-200 active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground truncate group-hover:text-pink-400 transition-colors">
                  {project.title || 'Untitled Project'}
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-pink-400 shrink-0 transition-colors" />
              </div>
              {project.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[8px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-400/20 font-bold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[9px] text-muted-foreground/50 mt-2">
                Updated {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Today Section (Notes filtered for today) ───────────────────────────────
function TodaySection() {
  const { notes, setActiveNoteId, setEditorTitle, setEditorContent, setEditorRawContent, setActiveNoteType, setEditorTags } = useWSHStore();

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const todayNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.isDeleted) return false;
        // Notes created today (local timezone)
        if (n.createdAt) {
          const ld = new Date(n.createdAt);
          const noteDate = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, '0')}-${String(ld.getDate()).padStart(2, '0')}`;
          if (noteDate === todayStr) return true;
        }
        // Notes with today's date in content (dated items like "## 2026-04-04" or "April 4")
        if (n.rawContent && n.rawContent.includes(todayStr)) return true;
        // Notes with today's date in title
        if (n.title && n.title.includes(todayStr)) return true;
        return false;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }, [notes, todayStr]);

  // Also get notes with today-related hashtags
  const todayTags = useMemo(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const dayName = dayNames[today.getDay()];
    const monthDay = `${today.getMonth() + 1}/${today.getDate()}`;

    return notes.filter((n) => {
      if (n.isDeleted) return false;
      if (todayNotes.some(tn => tn.id === n.id)) return false; // avoid duplicates
      return n.tags.some((tag) => {
        const t = tag.toLowerCase();
        return t === 'today' || t === dayName || t === monthDay || t === 'daily' || t === 'todo';
      });
    }).slice(0, 5);
  }, [notes, todayNotes]);

  const allTodayItems = useMemo(() => {
    return [...todayNotes, ...todayTags].slice(0, 10);
  }, [todayNotes, todayTags]);

  const handleNoteClick = (note: Note) => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorRawContent(note.rawContent || '');
    setActiveNoteType(note.type);
    setEditorTags(note.tags);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const typeColors: Record<string, string> = {
    quick: 'text-blue-400',
    notebook: 'text-green-400',
    deep: 'text-purple-400',
    code: 'text-orange-400',
    project: 'text-pink-400',
    document: 'text-cyan-400',
    'ai-prompts': 'text-violet-400',
  };

  return (
    <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Today&apos;s Things
          </span>
        </div>
        <span className="text-[9px] font-bold bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full">
          {allTodayItems.length}
        </span>
      </div>
      <div className="space-y-2">
        {allTodayItems.length === 0 ? (
          <p className="text-[10px] italic text-muted-foreground/60 py-3 text-center">
            Nothing for today. Create notes with today&apos;s date or tag them #today.
          </p>
        ) : (
          allTodayItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNoteClick(item)}
              className="w-full text-left flex items-start gap-2 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors group active:scale-[0.99]"
            >
              <Zap className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${typeColors[item.type] || 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-foreground leading-relaxed block truncate group-hover:text-cyan-400 transition-colors">
                  {item.title || 'Untitled'}
                </span>
                {item.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20 font-bold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main RightSidebar ─────────────────────────────────────────────────────
export default function RightSidebar() {
  return (
    <aside className="wsh-right-sidebar">
      {/* Live Clock */}
      <LiveClock />

      {/* Things to do Today — Manual Todo Checklist */}
      <TodoChecklist />

      {/* Today's Things — Auto-filtered notes */}
      <TodaySection />

      {/* Projects */}
      <ProjectsSection />
    </aside>
  );
}
