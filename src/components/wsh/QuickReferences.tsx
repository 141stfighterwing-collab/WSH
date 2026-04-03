'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Edit3, Zap } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  type: string;
}

const templates: Template[] = [
  {
    id: '1',
    name: 'Daily Standup',
    description: 'Quick daily update template',
    content: '## What I did yesterday\n\n## What I\'m doing today\n\n## Blockers',
    type: 'quick',
  },
  {
    id: '2',
    name: 'Meeting Notes',
    description: 'Structured meeting notes',
    content: '## Meeting: \n**Date:** \n**Attendees:** \n\n## Agenda\n\n## Notes\n\n## Action Items',
    type: 'notebook',
  },
  {
    id: '3',
    name: 'Project Brief',
    description: 'New project outline',
    content: '## Project Name\n\n### Overview\n\n### Goals\n\n### Timeline\n\n### Resources',
    type: 'project',
  },
  {
    id: '4',
    name: 'Code Review',
    description: 'Code review checklist',
    content: '## Code Review\n\n### File: \n\n### Changes:\n\n### Notes:\n\n### Approval:',
    type: 'code',
  },
];

export default function QuickReferences() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <span className="micro-label text-muted-foreground">⚡ Quick References</span>

      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-secondary/50 rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-pri-500/30"
          >
            <button
              onClick={() => toggleExpand(template.id)}
              className="w-full flex items-center justify-between p-2.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-pri-400" />
                <span className="text-xs font-medium text-foreground">{template.name}</span>
              </div>
              {expandedId === template.id ? (
                <ChevronUp className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              )}
            </button>

            {expandedId === template.id && (
              <div className="px-2.5 pb-2.5 animate-fadeIn">
                <p className="text-[11px] text-muted-foreground mb-2">{template.description}</p>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 shadow-sm">
                    <Zap className="w-2.5 h-2.5" />
                    Use
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-95">
                    <Edit3 className="w-2.5 h-2.5" />
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
