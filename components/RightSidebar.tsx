import React, { useMemo } from 'react';
import { Note, ProjectData } from '../types';

interface RightSidebarProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
  className?: string;
}

// Today's Things Component - matches Weavenote design
const TodaysThings: React.FC<{ notes: Note[]; onNoteClick: (note: Note) => void }> = ({ notes, onNoteClick }) => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    const todaysNotes = useMemo(() => {
        return notes.filter(n => {
            const noteDate = new Date(n.createdAt).toDateString();
            return noteDate === todayStr;
        }).slice(0, 5);
    }, [notes, todayStr]);

    return (
        <div className="rounded-xl p-4" style={{ background: 'rgba(30, 37, 50, 0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
                {/* Flag icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#a78bfa' }}>
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>TODAY'S THINGS</h3>
            </div>
            
            {todaysNotes.length === 0 ? (
                <p className="text-xs italic py-2" style={{ color: '#64748b' }}>Nothing for today yet</p>
            ) : (
                <div className="space-y-2">
                    {todaysNotes.map(note => (
                        <button 
                            key={note.id}
                            onClick={() => onNoteClick(note)}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors truncate hover:bg-white/5"
                            style={{ color: '#cbd5e1' }}
                        >
                            {note.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Ongoing Projects Component - matches Weavenote design
const OngoingProjects: React.FC<{ notes: Note[]; onNoteClick: (note: Note) => void }> = ({ notes, onNoteClick }) => {
    const projects = useMemo(() => {
        return notes
            .filter(n => n.type === 'project' && n.projectData)
            .map(n => ({
                id: n.id,
                title: n.title,
                progress: calculateProgress(n.projectData!),
                isCompleted: n.projectData?.isCompleted
            }))
            .filter(p => !p.isCompleted)
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 5);
    }, [notes]);

    function calculateProgress(data: ProjectData): number {
        if (data.manualProgress !== undefined) return data.manualProgress;
        
        const objectives = data.objectives || [];
        const deliverables = data.deliverables || [];
        const allItems = [...objectives, ...deliverables];
        
        if (allItems.length === 0) return 0;
        
        const completed = allItems.filter(i => i.status === 'completed').length;
        return Math.round((completed / allItems.length) * 100);
    }

    const getProgressColor = (progress: number) => {
        if (progress >= 75) return '#22c55e';
        if (progress >= 50) return '#3b82f6';
        if (progress >= 25) return '#eab308';
        return '#64748b';
    };

    return (
        <div className="rounded-xl p-4" style={{ background: 'rgba(30, 37, 50, 0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
                {/* Rocket icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#a78bfa' }}>
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
                <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>ONGOING PROJECTS</h3>
            </div>
            
            {projects.length === 0 ? (
                <p className="text-xs italic py-2" style={{ color: '#64748b' }}>No active projects</p>
            ) : (
                <div className="space-y-3">
                    {projects.map(project => (
                        <button 
                            key={project.id}
                            onClick={() => {
                                const note = notes.find(n => n.id === project.id);
                                if (note) onNoteClick(note);
                            }}
                            className="w-full text-left group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate transition-colors" style={{ color: '#cbd5e1' }}>
                                    {project.title}
                                </span>
                                <span className="text-[10px] font-bold ml-2" style={{ color: '#64748b' }}>
                                    {project.progress}%
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <div 
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${project.progress}%`, background: getProgressColor(project.progress) }}
                                />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const RightSidebar: React.FC<RightSidebarProps> = ({ notes, onNoteClick, className = "" }) => {
    return (
        <aside 
            className={`w-72 flex-shrink-0 space-y-4 ${className}`}
            style={{ background: 'transparent' }}
        >
            {/* Today's Things Section */}
            <TodaysThings notes={notes} onNoteClick={onNoteClick} />
            
            {/* Ongoing Projects Section */}
            <OngoingProjects notes={notes} onNoteClick={onNoteClick} />
        </aside>
    );
};

export default RightSidebar;
