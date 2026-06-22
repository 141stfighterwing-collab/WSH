'use client';

import { useQuery } from '@tanstack/react-query';
import { useWSHStore } from '@/store/wshStore';
import type { Note } from '@/store/wshStore';

export function useNoteDetail(noteId: string | null) {
  const token = useWSHStore((s) => s.user.token);

  return useQuery<Note>({
    queryKey: ['note-detail', noteId],
    enabled: !!token && !!noteId,
    queryFn: async () => {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(noteId as string)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Failed to load note (${res.status})`);
      const data = await res.json();
      return data.note as Note;
    },
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}
