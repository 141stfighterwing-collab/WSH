'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, Circle, ChevronRight, Plus, Minus } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

export default function FarRightSidebar() {
  const { notes } = useWSHStore();
  const today = new Date().toISOString().split('T')[0];

  // Extract today's tasks from notes
  const todayTasks = useMemo(() => {
    return notes
      .filter((n) => !n.isDeleted && n.createdAt && n.createdAt.startsWith(today))
      .slice(0, 5);
  }, [notes, today]);

  // Extract project-type notes
  const ongoingProjects = useMemo(() => {
    return notes
      .filter((n) => !n.isDeleted && n.type === 'project')
      .slice(0, 5);
  }, [notes]);

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 hidden xl:block order-3 lg:order-3 overflow-y-auto max-h-[calc(100vh-4rem-3rem)] p-2">
      {/* Today's Things */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border transition-colors flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            📅 Today&apos;s Things
          </span>
          <span className="text-[10px] font-mono opacity-50">{today}</span>
        </div>
        <div className="space-y-3">
          {todayTasks.length === 0 ? (
            <p className="text-[10px] italic text-muted-foreground/60 py-4 text-center">
              Nothing for today yet.
            </p>
          ) : (
            todayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-2 p-2 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer"
              >
                <Circle className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-cyan-400 transition-colors" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground leading-relaxed block truncate">{task.title}</span>
                  {task.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ongoing Projects */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border transition-colors flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            🚀 Ongoing Projects
          </span>
        </div>
        <div className="space-y-4">
          {ongoingProjects.length === 0 ? (
            <p className="text-[10px] italic text-muted-foreground/60 py-4 text-center">
              No active projects.
            </p>
          ) : (
            ongoingProjects.map((project) => (
              <div
                key={project.id}
                className="bg-secondary/30 rounded-xl p-3 border border-border/30 hover:border-fuchsia-500/20 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground truncate">{project.title}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                </div>
                {project.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30 font-bold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[9px] text-muted-foreground/50 mt-2">
                  Updated {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border transition-colors flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            ⚡ Quick Stats
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
            <div className="text-lg font-bold text-cyan-400">
              {notes.filter((n) => !n.isDeleted).length}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Active</div>
          </div>
          <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
            <div className="text-lg font-bold text-fuchsia-400">
              {notes.filter((n) => n.isDeleted).length}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Trashed</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
