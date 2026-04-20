'use client';

import { useState, useCallback } from 'react';
import { FolderPlus, Folder, ChevronRight } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

export default function Folders() {
  const {
    folders,
    addFolder,
    activeFolderId,
    setActiveFolderId,
    notes,
    updateNote,
  } = useWSHStore();

  const [showNewInput, setShowNewInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>('__all__');

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      order: folders.length,
      userId: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addFolder(newFolder);
    setNewFolderName('');
    setShowNewInput(false);
  };

  const getNoteCount = (folderId: string) =>
    notes.filter((n) => n.folderId === folderId && !n.isDeleted).length;

  const totalNotes = notes.filter((n) => !n.isDeleted).length;

  // ── Drag & Drop ──

  const handleDragOver = useCallback((e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId ?? '__all__');
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      await updateNote(noteId, { folderId });
    }
  }, [updateNote]);

  const isDragActive = dragOverFolderId !== null;

  const folderBtnClass = (isActive: boolean, isOver: boolean) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 active:scale-[0.99] ${
      isActive
        ? 'bg-pri-600/15 text-pri-400 border border-pri-500/30'
        : isOver && isDragActive
          ? 'bg-pri-500/20 text-pri-400 border-2 border-dashed border-pri-500/40'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">
          🗂️ Folders
          {isDragActive && (
            <span className="ml-1 text-pri-400 animate-pulse text-[9px] normal-case tracking-normal"> — drop to move</span>
          )}
        </span>
        <button
          onClick={() => setShowNewInput(true)}
          className="p-1 rounded-full text-muted-foreground hover:text-pri-400 hover:bg-secondary transition-all active:scale-95"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* All Notes — drop target (unfile / show all) */}
      <button
        onClick={() => setActiveFolderId(null)}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
        className={folderBtnClass(activeFolderId === null, dragOverFolderId === '__all__')}
      >
        <div className="flex items-center gap-2">
          <Folder className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">All Notes</span>
        </div>
        <span className="text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded-full">
          {totalNotes}
        </span>
      </button>

      {/* Folder list — each is a drop target */}
      <div className="space-y-1">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            className={folderBtnClass(activeFolderId === folder.id, dragOverFolderId === folder.id)}
          >
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3" />
              <span className="text-xs font-medium">{folder.name}</span>
            </div>
            <span className="text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded-full">
              {getNoteCount(folder.id)}
            </span>
          </button>
        ))}
      </div>

      {/* New folder input */}
      {showNewInput && (
        <div className="flex gap-1.5 animate-fadeIn">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
            placeholder="Folder name..."
            autoFocus
            className="flex-1 px-3 py-1.5 rounded-full text-xs bg-secondary border border-transparent focus:border-pri-500 focus:outline-none transition-colors placeholder:text-muted-foreground"
          />
          <button
            onClick={handleAddFolder}
            className="px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
