'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '@/store/wshStore';

interface VirtualNotesListProps {
  notes: Note[];
  estimateHeight?: number;
  overscan?: number;
  className?: string;
  renderItem: (note: Note) => React.ReactNode;
}

export default function VirtualNotesList({
  notes,
  estimateHeight = 260,
  overscan = 6,
  className,
  renderItem,
}: VirtualNotesListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(900);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setScrollTop(el.scrollTop);
      setViewportHeight(el.clientHeight || 900);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const { startIndex, endIndex, totalHeight, visible } = useMemo(() => {
    const itemsPerRow = 2;
    const rowCount = Math.ceil(notes.length / itemsPerRow);
    const startRow = Math.max(0, Math.floor(scrollTop / estimateHeight) - overscan);
    const endRow = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / estimateHeight) + overscan);
    const startIndex = startRow * itemsPerRow;
    const endIndex = Math.min(notes.length, endRow * itemsPerRow);
    const visible = notes.slice(startIndex, endIndex);
    const totalHeight = rowCount * estimateHeight;
    return { startIndex, endIndex, totalHeight, visible };
  }, [notes, scrollTop, viewportHeight, estimateHeight, overscan]);

  const topOffset = Math.floor(startIndex / 2) * estimateHeight;

  return (
    <div ref={containerRef} className={className ?? 'max-h-[70vh] overflow-y-auto'}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: topOffset, left: 0, right: 0 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visible.map((note) => renderItem(note))}
          </div>
        </div>
      </div>
    </div>
  );
}
