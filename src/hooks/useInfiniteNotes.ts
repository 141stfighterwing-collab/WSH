'use client';

import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { buildNotesQuery, NOTES_PAGE_SIZE, type NotesPageResponse } from '@/lib/notes';
import { loadNotesCache, saveNotesCache } from '@/lib/queryCache';
import { useWSHStore } from '@/store/wshStore';

export function useInfiniteNotes() {
  const { user, activeFolderId, searchQuery, activeNoteType, calendarDateFilter } = useWSHStore();
  const token = user.token;
  const queryKey = useMemo(
    () => ['notes', { activeFolderId, searchQuery, activeNoteType, calendarDateFilter, user: user.username }] as const,
    [activeFolderId, activeNoteType, calendarDateFilter, searchQuery, user.username],
  );
  const cached = useMemo(() => loadNotesCache(), []);

  const query = useInfiniteQuery<
    NotesPageResponse,
    Error,
    InfiniteData<NotesPageResponse, string | null>,
    typeof queryKey,
    string | null
  >({
    queryKey,
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
    initialData: cached && JSON.stringify(cached.queryKey) === JSON.stringify(queryKey)
      ? cached.data
      : undefined,
  });

  useEffect(() => {
    if (!query.data) return;
    saveNotesCache({
      updatedAt: Date.now(),
      queryKey,
      data: query.data,
    });
  }, [query.data, queryKey]);

  return query;
}
