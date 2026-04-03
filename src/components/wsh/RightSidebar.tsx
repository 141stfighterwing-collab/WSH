'use client';

import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface ProjectItem {
  id: string;
  name: string;
  progress: number;
  color: string;
}

const todayTodos: TodoItem[] = [
  { id: '1', text: 'Review pull request #42', done: true },
  { id: '2', text: 'Update documentation for v2.1', done: false },
  { id: '3', text: 'Fix responsive layout issues', done: false },
  { id: '4', text: 'Write unit tests for auth module', done: false },
];

const ongoingProjects: ProjectItem[] = [
  { id: '1', name: 'WSH v2.0 Release', progress: 72, color: 'bg-pri-500' },
  { id: '2', name: 'API Integration', progress: 45, color: 'bg-green-500' },
  { id: '3', name: 'Mobile Responsive', progress: 88, color: 'bg-orange-500' },
];

export default function RightSidebar() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <aside className="hidden xl:block w-72 min-w-[288px] border-l border-border overflow-y-auto max-h-[calc(100vh-4rem-3rem)]">
      <div className="p-4 space-y-6">
        {/* Today's Things */}
        <div className="space-y-3">
          <span className="micro-label text-muted-foreground">📅 Today&apos;s Things</span>
          <div className="font-mono text-xs text-pri-400">{today}</div>
          <div className="space-y-2">
            {todayTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-2 p-2 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer"
              >
                {todo.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-pri-400 transition-colors" />
                )}
                <span
                  className={`text-xs leading-relaxed ${
                    todo.done
                      ? 'text-muted-foreground/50 line-through'
                      : 'text-foreground'
                  }`}
                >
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-4" />

        {/* Ongoing Projects */}
        <div className="space-y-3">
          <span className="micro-label text-muted-foreground">🚀 Ongoing Projects</span>
          <div className="space-y-3">
            {ongoingProjects.map((project) => (
              <div
                key={project.id}
                className="bg-secondary/30 rounded-xl p-3 border border-border/30 hover:border-pri-500/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">{project.name}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{project.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${project.color}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-4" />

        {/* Quick Stats */}
        <div className="space-y-3">
          <span className="micro-label text-muted-foreground">⚡ Quick Stats</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <div className="text-lg font-bold text-pri-400">3</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Active</div>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <div className="text-lg font-bold text-green-400">12</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Done</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
