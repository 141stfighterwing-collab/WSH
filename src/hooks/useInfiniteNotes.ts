'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { buildNotesQuery, NOTES_PAGE_SIZE, type NotesPageResponse } from '@/lib/notes';
import { useWSHStore } from '@/store/wshStore';

export function useInfiniteNotes() {
  const { user, activeFolderId, searchQuery, activeNoteType, calendarDateFilter } = useWSHStore();
  const token = user.token;

  return useInfiniteQuery<NotesPageResponse>({
    queryKey: ['notes', { activeFolderId, searchQuery, activeNoteType, calendarDateFilter, user: user.username }],
    enabled: !!token,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const qs = buildNotesQuery({
        limit: NOTES_PAGE_SIZE,
        cursor: pageParam,
        folderId: activeFolderId,
        search: searchQuery,
        type: activeNoteType,
        date: calendarDateFilter,
        includeDeleted: true,
      });
      const res = await fetch(`/api/notes?${qs}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Failed to load notes (${res.status})`);
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 15 * 60_000,
  });
}
