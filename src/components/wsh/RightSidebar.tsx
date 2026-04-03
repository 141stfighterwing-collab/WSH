'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock, Briefcase, CalendarDays, ChevronRight, Zap, Hash } from 'lucide-react';
import { useWSHStore, type Note } from '@/store/wshStore';

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

function TodaySection() {
  const { notes, setActiveNoteId, setEditorTitle, setEditorContent, setEditorRawContent, setActiveNoteType, setEditorTags } = useWSHStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const todayNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.isDeleted) return false;
        // Notes created today
        if (n.createdAt && n.createdAt.startsWith(todayStr)) return true;
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

export default function RightSidebar() {
  return (
    <aside className="wsh-right-sidebar">
      {/* Live Clock */}
      <LiveClock />

      {/* Today's Things */}
      <TodaySection />

      {/* Projects */}
      <ProjectsSection />
    </aside>
  );
}
