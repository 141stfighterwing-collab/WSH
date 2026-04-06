'use client';

import { useState } from 'react';
import { Plus, Trash2, Target, Package, Calendar, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

interface Deliverable {
  id: string;
  title: string;
  completed: boolean;
}

interface ProjectData {
  objectives: string;
  milestones: Milestone[];
  deliverables: Deliverable[];
  startDate: string;
  endDate: string;
  progress: number;
  notes: string;
}

interface ProjectEditorProps {
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
}

function parseProject(content: string): ProjectData {
  try {
    return JSON.parse(content);
  } catch {
    return {
      objectives: '',
      milestones: [],
      deliverables: [],
      startDate: '',
      endDate: '',
      progress: 0,
      notes: '',
    };
  }
}

export default function ProjectEditor({ title, setTitle, content, setContent }: ProjectEditorProps) {
  const [data, setData] = useState<ProjectData>(parseProject(content));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    objectives: true,
    milestones: true,
    deliverables: true,
    timeline: true,
    progress: true,
    notes: true,
  });

  const update = (partial: Partial<ProjectData>) => {
    const next = { ...data, ...partial };
    setData(next);
    setContent(JSON.stringify(next));
  };

  const toggleSection = (s: string) =>
    setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  const addMilestone = () => {
    update({
      milestones: [...data.milestones, { id: `ms-${Date.now()}`, title: '', completed: false }],
    });
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    update({
      milestones: data.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  };

  const removeMilestone = (id: string) => {
    update({ milestones: data.milestones.filter((m) => m.id !== id) });
  };

  const addDeliverable = () => {
    update({
      deliverables: [...data.deliverables, { id: `dl-${Date.now()}`, title: '', completed: false }],
    });
  };

  const updateDeliverable = (id: string, updates: Partial<Deliverable>) => {
    update({
      deliverables: data.deliverables.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    });
  };

  const removeDeliverable = (id: string) => {
    update({ deliverables: data.deliverables.filter((d) => d.id !== id) });
  };

  const completedMilestones = data.milestones.filter((m) => m.completed).length;
  const completedDeliverables = data.deliverables.filter((d) => d.completed).length;
  const totalTasks = data.milestones.length + data.deliverables.length;
  const autoProgress = totalTasks > 0 ? Math.round(((completedMilestones + completedDeliverables) / totalTasks) * 100) : 0;
  const displayProgress = data.progress || autoProgress;
  const progressColor = displayProgress >= 80 ? 'bg-green-500' : displayProgress >= 50 ? 'bg-pri-500' : displayProgress >= 25 ? 'bg-yellow-500' : 'bg-red-500';

  const SectionHeader = ({ id, label, icon, count }: { id: string; label: string; icon: React.ReactNode; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-2 w-full py-2 text-left group transition-colors"
    >
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>
      <span className="micro-label flex-1">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
          {count}
        </span>
      )}
      {expandedSections[id] ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="space-y-1 px-3 py-2 animate-fadeIn">
      {/* Objectives */}
      <div className="border-b border-border/30 pb-2">
        <SectionHeader id="objectives" label="Primary Objectives / Goals" icon={<Target className="w-3.5 h-3.5" />} />
        {expandedSections.objectives && (
          <textarea
            value={data.objectives}
            onChange={(e) => update({ objectives: e.target.value })}
            placeholder="What are we trying to achieve? List key goals and objectives..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/40 transition-all resize-y mt-1"
          />
        )}
      </div>

      {/* Milestones */}
      <div className="border-b border-border/30 pb-2">
        <SectionHeader id="milestones" label="Milestones" icon={<GripVertical className="w-3.5 h-3.5" />} count={data.milestones.length} />
        {expandedSections.milestones && (
          <div className="space-y-1.5 mt-1">
            {data.milestones.map((ms, idx) => (
              <div key={ms.id} className="flex items-center gap-2 group">
                <span className="text-[10px] font-bold text-muted-foreground w-5">{idx + 1}.</span>
                <button
                  onClick={() => updateMilestone(ms.id, { completed: !ms.completed })}
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                    ms.completed
                      ? 'bg-pri-600 border-pri-600 text-white'
                      : 'border-border hover:border-pri-500/50'
                  }`}
                >
                  {ms.completed && <span className="text-[8px]">✓</span>}
                </button>
                <input
                  type="text"
                  value={ms.title}
                  onChange={(e) => updateMilestone(ms.id, { title: e.target.value })}
                  placeholder="Milestone description..."
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/40 transition-all ${
                    ms.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                />
                <button
                  onClick={() => removeMilestone(ms.id)}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={addMilestone}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-pri-400 hover:bg-pri-500/10 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              Add Milestone
            </button>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <div className="border-b border-border/30 pb-2">
        <SectionHeader id="deliverables" label="Key Deliverables" icon={<Package className="w-3.5 h-3.5" />} count={data.deliverables.length} />
        {expandedSections.deliverables && (
          <div className="space-y-1.5 mt-1">
            {data.deliverables.map((dl, idx) => (
              <div key={dl.id} className="flex items-center gap-2 group">
                <span className="text-[10px] font-bold text-muted-foreground w-5">{idx + 1}.</span>
                <button
                  onClick={() => updateDeliverable(dl.id, { completed: !dl.completed })}
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                    dl.completed
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-border hover:border-green-500/50'
                  }`}
                >
                  {dl.completed && <span className="text-[8px]">✓</span>}
                </button>
                <input
                  type="text"
                  value={dl.title}
                  onChange={(e) => updateDeliverable(dl.id, { title: e.target.value })}
                  placeholder="Specific item to be produced..."
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/40 transition-all ${
                    dl.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                />
                <button
                  onClick={() => removeDeliverable(dl.id)}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={addDeliverable}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-green-400 hover:bg-green-500/10 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              Add Deliverable
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="border-b border-border/30 pb-2">
        <SectionHeader id="timeline" label="Timeline" icon={<Calendar className="w-3.5 h-3.5" />} />
        {expandedSections.timeline && (
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={data.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground mt-0.5"
              />
            </div>
            <div className="text-muted-foreground mt-4">→</div>
            <div className="flex-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={data.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground mt-0.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="border-b border-border/30 pb-2">
        <SectionHeader id="progress" label="Progress Monitor" icon={<Target className="w-3.5 h-3.5" />} />
        {expandedSections.progress && (
          <div className="mt-1 space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={displayProgress}
                onChange={(e) => update({ progress: parseInt(e.target.value) })}
                className="flex-1 h-2 rounded-full appearance-none bg-secondary cursor-pointer accent-pri-600"
              />
              <span className={`text-sm font-black w-12 text-right ${displayProgress >= 80 ? 'text-green-400' : displayProgress >= 50 ? 'text-pri-400' : 'text-yellow-400'}`}>
                {displayProgress}%
              </span>
            </div>
            {/* Visual progress bar */}
            <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <span>Milestones: {completedMilestones}/{data.milestones.length}</span>
              <span>Deliverables: {completedDeliverables}/{data.deliverables.length}</span>
              <span>Auto: {autoProgress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <SectionHeader id="notes" label="Additional Notes" icon={<Package className="w-3.5 h-3.5" />} />
        {expandedSections.notes && (
          <textarea
            value={data.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Additional project notes, context, links, references..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/40 transition-all resize-y mt-1"
          />
        )}
      </div>
    </div>
  );
}
